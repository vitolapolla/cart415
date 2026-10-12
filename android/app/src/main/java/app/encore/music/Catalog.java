package app.encore.music;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.media3.common.MediaItem;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The browse tree shown in Android Auto (and other media browsers), built from
 * the same sources as the web app plus the library the app syncs to us.
 */
final class Catalog {
    static final String ROOT = "root";
    private static final String AUDIUS = "https://api.audius.co/v1";
    private static final String APP = "encore";
    private static final String[] RADIO_MIRRORS = {"de1", "fi1", "de2", "nl1"};
    static final String[] GENRES = {
        "Electronic", "Hip-Hop/Rap", "Pop", "R&B/Soul", "Rock", "Alternative", "House", "Techno", "Lo-Fi",
        "Ambient", "Jazz", "Dubstep", "Drum & Bass", "Latin", "Classical", "Country", "Reggae", "Metal", "Funk", "Soundtrack",
    };

    private final SharedPreferences prefs;
    // Every playable item we've handed out, and the list it came from, so that
    // picking one song in the car plays the rest of its list after it.
    private final Map<String, MediaItem> items = new ConcurrentHashMap<>();
    private final Map<String, List<MediaItem>> parents = new ConcurrentHashMap<>();

    Catalog(Context context) {
        prefs = context.getSharedPreferences("encore", Context.MODE_PRIVATE);
    }

    void setLibrary(String json) {
        prefs.edit().putString("library", json).apply();
    }

    private JSONObject library() {
        try {
            return new JSONObject(prefs.getString("library", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    MediaItem root() {
        return Tracks.folder(ROOT, "Encore", null);
    }

    List<MediaItem> children(String parentId) throws Exception {
        List<MediaItem> out = new ArrayList<>();
        if (ROOT.equals(parentId)) {
            out.add(Tracks.folder("liked", "Liked Songs", null));
            out.add(Tracks.folder("playlists", "Your playlists", null));
            out.add(Tracks.folder("recent", "Recently played", null));
            out.add(Tracks.folder("trending", "Trending", null));
            out.add(Tracks.folder("genres", "Genres", null));
            out.add(Tracks.folder("radio", "Radio", null));
            return out;
        }
        if ("genres".equals(parentId)) {
            for (String g : GENRES) out.add(Tracks.folder("genre:" + g, g, null));
            return out;
        }
        if ("playlists".equals(parentId)) {
            JSONArray pls = library().optJSONArray("playlists");
            for (int i = 0; pls != null && i < pls.length(); i++) {
                JSONObject p = pls.getJSONObject(i);
                int n = p.optJSONArray("tracks") == null ? 0 : p.getJSONArray("tracks").length();
                out.add(Tracks.folder("pl:" + p.getString("id"), p.optString("name"), n + " songs"));
            }
            return out;
        }
        JSONArray tracks;
        if ("liked".equals(parentId)) tracks = library().optJSONArray("liked");
        else if ("recent".equals(parentId)) tracks = library().optJSONArray("recent");
        else if (parentId.startsWith("pl:")) tracks = playlistTracks(parentId.substring(3));
        else if ("trending".equals(parentId)) tracks = audiusTracks(get(AUDIUS + "/tracks/trending?limit=40&app_name=" + APP));
        else if (parentId.startsWith("genre:")) tracks = audiusTracks(get(AUDIUS + "/tracks/trending?limit=40&app_name=" + APP + "&genre=" + enc(parentId.substring(6))));
        else if ("radio".equals(parentId)) tracks = stations(radio("/stations/topclick/80"));
        else tracks = null;
        return remember(tracks);
    }

    List<MediaItem> search(String query) throws Exception {
        JSONArray all = new JSONArray();
        JSONArray songs = audiusTracks(get(AUDIUS + "/tracks/search?limit=25&app_name=" + APP + "&query=" + enc(query)));
        for (int i = 0; i < songs.length(); i++) all.put(songs.get(i));
        try {
            JSONArray st = stations(radio("/stations/search?limit=15&order=clickcount&reverse=true&hidebroken=true&name=" + enc(query)));
            for (int i = 0; i < st.length(); i++) all.put(st.get(i));
        } catch (Exception ignored) {
        }
        return remember(all);
    }

    MediaItem lookup(String mediaId) {
        return items.get(mediaId);
    }

    /** The full list an item was browsed from, if any. */
    List<MediaItem> parentOf(String mediaId) {
        return parents.get(mediaId);
    }

    private List<MediaItem> remember(JSONArray tracks) throws Exception {
        List<MediaItem> out = new ArrayList<>();
        for (int i = 0; tracks != null && i < tracks.length(); i++) out.add(Tracks.fromJson(tracks.getJSONObject(i)));
        List<MediaItem> list = Collections.unmodifiableList(out);
        for (MediaItem m : out) {
            items.put(m.mediaId, m);
            parents.put(m.mediaId, list);
        }
        return out;
    }

    private JSONArray playlistTracks(String id) throws Exception {
        JSONArray pls = library().optJSONArray("playlists");
        for (int i = 0; pls != null && i < pls.length(); i++) {
            if (id.equals(pls.getJSONObject(i).optString("id"))) return pls.getJSONObject(i).optJSONArray("tracks");
        }
        return new JSONArray();
    }

    // ------------------------------------------------------------- sources (mirrors shared/sources.js)

    private static JSONArray audiusTracks(String body) throws Exception {
        JSONArray data = new JSONObject(body).getJSONArray("data");
        JSONArray out = new JSONArray();
        for (int i = 0; i < data.length(); i++) {
            JSONObject t = data.getJSONObject(i);
            if (t.optBoolean("is_stream_gated") || !t.optBoolean("is_streamable", true) || t.optBoolean("is_delete")) continue;
            JSONObject user = t.optJSONObject("user");
            JSONObject art = t.optJSONObject("artwork");
            JSONObject o = new JSONObject();
            o.put("id", "audius:" + t.getString("id"));
            o.put("source", "audius");
            o.put("title", t.optString("title"));
            o.put("artist", user == null ? "Unknown artist" : user.optString("name"));
            if (user != null) o.put("artistId", "audius:" + user.optString("id"));
            if (art != null) o.put("artwork", art.optString("480x480", art.optString("150x150", null)));
            o.put("duration", t.optInt("duration"));
            o.put("genre", Tracks.str(t, "genre"));
            o.put("stream", AUDIUS + "/tracks/" + t.getString("id") + "/stream?app_name=" + APP);
            o.put("kind", "full");
            out.put(o);
        }
        return out;
    }

    private static JSONArray stations(String body) throws Exception {
        JSONArray data = new JSONArray(body);
        JSONArray out = new JSONArray();
        for (int i = 0; i < data.length() && out.length() < 40; i++) {
            JSONObject s = data.getJSONObject(i);
            String url = Tracks.str(s, "url_resolved");
            String codec = s.optString("codec", "");
            if (url == null || s.optInt("hls") == 1 || !codec.matches("(?i).*(mp3|aac).*")) continue;
            JSONObject o = new JSONObject();
            o.put("id", "radio:" + s.getString("stationuuid"));
            o.put("source", "radio");
            o.put("title", s.optString("name").trim());
            o.put("artist", s.optString("country", "Live radio"));
            String favicon = Tracks.str(s, "favicon");
            if (favicon != null && !favicon.isEmpty()) o.put("artwork", favicon);
            o.put("duration", 0);
            o.put("codec", codec);
            o.put("stream", url);
            o.put("kind", "live");
            out.put(o);
        }
        return out;
    }

    private static String radio(String path) throws Exception {
        Exception last = null;
        for (String m : RADIO_MIRRORS) {
            try {
                return get("https://" + m + ".api.radio-browser.info/json" + path);
            } catch (Exception e) {
                last = e;
            }
        }
        throw last;
    }

    private static String enc(String s) throws Exception {
        return URLEncoder.encode(s, "UTF-8");
    }

    private static String get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(15000);
        c.setRequestProperty("User-Agent", "encore/0.1");
        try {
            if (c.getResponseCode() >= 400) throw new Exception("HTTP " + c.getResponseCode() + " from " + url);
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            return sb.toString();
        } finally {
            c.disconnect();
        }
    }
}

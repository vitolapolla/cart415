package app.encore.music;

import android.net.Uri;
import android.os.Bundle;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import org.json.JSONObject;

/** Converts between the web app's track JSON and Media3 MediaItems. */
final class Tracks {
    static final String JSON = "encore.json";

    private Tracks() {}

    static String str(JSONObject o, String key) {
        return o == null || o.isNull(key) ? null : o.optString(key, null);
    }

    static MediaItem fromJson(JSONObject t) {
        Bundle extras = new Bundle();
        extras.putString(JSON, t.toString());
        String artwork = str(t, "artwork");
        boolean live = "live".equals(str(t, "kind"));
        MediaMetadata.Builder md = new MediaMetadata.Builder()
            .setTitle(str(t, "title"))
            .setArtist(str(t, "artist"))
            .setAlbumTitle(str(t, "album"))
            .setGenre(str(t, "genre"))
            .setIsPlayable(true)
            .setIsBrowsable(false)
            .setMediaType(live ? MediaMetadata.MEDIA_TYPE_RADIO_STATION : MediaMetadata.MEDIA_TYPE_MUSIC)
            .setExtras(extras);
        if (artwork != null) md.setArtworkUri(Uri.parse(artwork));
        long duration = t.optLong("duration", 0);
        if (duration > 0 && !live) md.setDurationMs(duration * 1000);
        Uri uri = Uri.parse(str(t, "stream") == null ? "" : str(t, "stream"));
        return new MediaItem.Builder()
            .setMediaId(str(t, "id"))
            .setUri(uri)
            .setMediaMetadata(md.build())
            .setRequestMetadata(new MediaItem.RequestMetadata.Builder().setMediaUri(uri).setExtras(extras).build())
            .build();
    }

    static MediaItem folder(String id, String title, String subtitle) {
        return new MediaItem.Builder()
            .setMediaId(id)
            .setMediaMetadata(new MediaMetadata.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setIsBrowsable(true)
                .setIsPlayable(false)
                .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
                .build())
            .build();
    }

    /** The track JSON carried by an item, if it came from this app. */
    static JSONObject json(MediaItem item) {
        Bundle b = item.requestMetadata.extras;
        if (b == null || b.getString(JSON) == null) b = item.mediaMetadata.extras;
        String s = b == null ? null : b.getString(JSON);
        if (s == null) return null;
        try {
            return new JSONObject(s);
        } catch (Exception e) {
            return null;
        }
    }
}

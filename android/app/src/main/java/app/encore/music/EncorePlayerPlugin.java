package app.encore.music;

import android.content.ComponentName;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.Timeline;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Lets the web app drive the native player in PlaybackService. The web app owns
 * the queue; it sends it here whenever it changes, and we report back what the
 * player is doing (including changes made from Android Auto or the notification).
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(name = "EncorePlayer")
public class EncorePlayerPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private ListenableFuture<MediaController> future;
    private MediaController controller;

    @Override
    public void load() {
        main.post(this::connect);
    }

    private void connect() {
        SessionToken token = new SessionToken(getContext(), new ComponentName(getContext(), PlaybackService.class));
        future = new MediaController.Builder(getContext(), token).buildAsync();
        future.addListener(() -> {
            try {
                controller = future.get();
                controller.addListener(listener);
            } catch (Exception e) {
                controller = null;
            }
        }, main::post);
    }

    @Override
    protected void handleOnDestroy() {
        if (future != null) MediaController.releaseFuture(future);
    }

    /** Runs `action` on the main thread once the controller is connected. */
    private void run(PluginCall call, Consumer<MediaController> action) {
        main.post(() -> {
            if (controller == null || !controller.isConnected()) {
                if (future == null || future.isDone()) connect();
                future.addListener(() -> {
                    if (controller == null) {
                        call.reject("Player unavailable");
                        return;
                    }
                    exec(call, action);
                }, main::post);
                return;
            }
            exec(call, action);
        });
    }

    private void exec(PluginCall call, Consumer<MediaController> action) {
        try {
            action.accept(controller);
            call.resolve(state(controller));
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    private static List<MediaItem> items(JSONArray tracks) throws Exception {
        List<MediaItem> out = new ArrayList<>();
        for (int i = 0; tracks != null && i < tracks.length(); i++) out.add(Tracks.fromJson(tracks.getJSONObject(i)));
        return out;
    }

    // ------------------------------------------------------------- methods

    @PluginMethod
    public void setQueue(PluginCall call) {
        run(call, c -> {
            try {
                List<MediaItem> list = items(call.getArray("tracks"));
                int index = call.getInt("index", 0);
                long pos = (long) (call.getDouble("position", 0.0) * 1000);
                c.setMediaItems(list, index, pos);
                c.prepare();
                c.setPlayWhenReady(call.getBoolean("play", true));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }

    /** Replace the queue around the current song without interrupting it. */
    @PluginMethod
    public void sync(PluginCall call) {
        run(call, c -> {
            try {
                List<MediaItem> list = items(call.getArray("tracks"));
                int index = call.getInt("index", 0);
                int cur = c.getCurrentMediaItemIndex();
                MediaItem playing = c.getCurrentMediaItem();
                if (playing == null || index >= list.size() || !list.get(index).mediaId.equals(playing.mediaId)) {
                    c.setMediaItems(list, index, c.getCurrentPosition());
                    return;
                }
                int count = c.getMediaItemCount();
                if (cur + 1 < count) c.removeMediaItems(cur + 1, count);
                if (cur > 0) c.removeMediaItems(0, cur);
                if (index > 0) c.addMediaItems(0, list.subList(0, index));
                if (index + 1 < list.size()) c.addMediaItems(list.subList(index + 1, list.size()));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }

    @PluginMethod
    public void skipTo(PluginCall call) {
        int index = call.getInt("index", 0);
        run(call, c -> {
            c.seekTo(index, 0);
            c.play();
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        run(call, c -> {
            if (c.getPlaybackState() == Player.STATE_IDLE) c.prepare();
            if (c.getPlaybackState() == Player.STATE_ENDED) c.seekTo(c.getCurrentMediaItemIndex(), 0);
            c.play();
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        run(call, Player::pause);
    }

    @PluginMethod
    public void seek(PluginCall call) {
        long ms = (long) (call.getDouble("position", 0.0) * 1000);
        run(call, c -> c.seekTo(ms));
    }

    @PluginMethod
    public void setRepeat(PluginCall call) {
        String mode = call.getString("mode", "off");
        run(call, c -> c.setRepeatMode("one".equals(mode) ? Player.REPEAT_MODE_ONE : "all".equals(mode) ? Player.REPEAT_MODE_ALL : Player.REPEAT_MODE_OFF));
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        float v = call.getFloat("volume", 1f);
        run(call, c -> c.setVolume(Math.max(0f, Math.min(1f, v))));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        run(call, Player::stop);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        run(call, c -> {});
    }

    @PluginMethod
    public void getQueue(PluginCall call) {
        main.post(() -> {
            JSObject ret = new JSObject();
            ret.put("tracks", controller == null ? new JSArray() : queue(controller));
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void setEqualizer(PluginCall call) {
        JSArray gains = call.getArray("gains");
        short[] g = new short[5];
        for (int i = 0; i < 5; i++) g[i] = (short) (gains == null ? 0 : gains.optInt(i, 0));
        PlaybackService.setEqualizer(g);
        call.resolve();
    }

    /** The library (liked songs, playlists) shown in Android Auto. */
    @PluginMethod
    public void setLibrary(PluginCall call) {
        JSObject lib = call.getObject("library", new JSObject());
        PlaybackService.setLibrary(getContext(), lib.toString());
        call.resolve();
    }

    // ------------------------------------------------------------- events

    private static JSObject state(Player c) {
        JSObject s = new JSObject();
        MediaItem item = c.getCurrentMediaItem();
        long dur = c.getDuration();
        s.put("playing", c.isPlaying());
        s.put("playWhenReady", c.getPlayWhenReady());
        s.put("buffering", c.getPlaybackState() == Player.STATE_BUFFERING);
        s.put("ended", c.getPlaybackState() == Player.STATE_ENDED);
        s.put("index", c.getCurrentMediaItemIndex());
        s.put("count", c.getMediaItemCount());
        s.put("mediaId", item == null ? null : item.mediaId);
        s.put("position", c.getCurrentPosition() / 1000.0);
        s.put("duration", dur == C.TIME_UNSET ? 0 : dur / 1000.0);
        return s;
    }

    private static JSArray queue(Player c) {
        JSArray arr = new JSArray();
        for (int i = 0; i < c.getMediaItemCount(); i++) {
            JSONObject json = Tracks.json(c.getMediaItemAt(i));
            if (json != null) arr.put(json);
        }
        return arr;
    }

    private final Player.Listener listener = new Player.Listener() {
        @Override
        public void onEvents(@NonNull Player player, @NonNull Player.Events events) {
            if (events.containsAny(Player.EVENT_IS_PLAYING_CHANGED, Player.EVENT_MEDIA_ITEM_TRANSITION,
                    Player.EVENT_PLAYBACK_STATE_CHANGED, Player.EVENT_POSITION_DISCONTINUITY)) {
                notifyListeners("state", state(player));
            }
        }

        @Override
        public void onTimelineChanged(@NonNull Timeline timeline, int reason) {
            if (reason == Player.TIMELINE_CHANGE_REASON_PLAYLIST_CHANGED && controller != null) {
                JSObject q = new JSObject();
                q.put("tracks", queue(controller));
                q.put("index", controller.getCurrentMediaItemIndex());
                notifyListeners("queue", q);
            }
        }

        @Override
        public void onPlayerError(@NonNull PlaybackException error) {
            JSObject e = new JSObject();
            e.put("message", error.getErrorCodeName());
            notifyListeners("error", e);
        }
    };
}

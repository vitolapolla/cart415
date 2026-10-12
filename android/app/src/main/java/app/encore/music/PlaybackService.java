package app.encore.music;

import android.app.PendingIntent;
import android.content.Intent;
import android.media.audiofx.Equalizer;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaSession;
import androidx.media3.session.SessionError;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.common.util.concurrent.MoreExecutors;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/**
 * Plays music in the background. The Media3 session gives us the media
 * notification, lock screen and Bluetooth controls, and Android Auto support
 * (Android Auto browses the Catalog through this service).
 */
@OptIn(markerClass = UnstableApi.class)
public class PlaybackService extends MediaLibraryService {
    private static PlaybackService instance;
    private static short[] eqGains = null; // dB per web-app band

    private ExoPlayer player;
    private MediaLibrarySession session;
    private Catalog catalog;
    private Equalizer equalizer;
    private int equalizerSession = C.AUDIO_SESSION_ID_UNSET;
    private final ListeningExecutorService io = MoreExecutors.listeningDecorator(Executors.newCachedThreadPool());
    private final Map<String, List<MediaItem>> searchResults = new ConcurrentHashMap<>();

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        catalog = new Catalog(this);
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setUserAgent("Encore/1.0")
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(20000);
        player = new ExoPlayer.Builder(this)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(new DefaultDataSource.Factory(this, http)))
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build();
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        session = new MediaLibrarySession.Builder(this, player, new Callback()).setSessionActivity(pi).build();
        applyEqualizer();
    }

    @Nullable
    @Override
    public MediaLibrarySession onGetSession(@NonNull MediaSession.ControllerInfo controllerInfo) {
        return session;
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        // Keep playing when the app is swiped away, unless nothing is playing.
        if (player == null || !player.getPlayWhenReady() || player.getMediaItemCount() == 0) stopSelf();
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (equalizer != null) equalizer.release();
        if (session != null) session.release();
        if (player != null) player.release();
        io.shutdown();
        super.onDestroy();
    }

    // ------------------------------------------------------------- equalizer

    /** Gains in dB for the web app's bands (60, 230, 910, 3.6k, 14k Hz). */
    static void setEqualizer(short[] gains) {
        eqGains = gains;
        if (instance != null) instance.applyEqualizer();
    }

    private void applyEqualizer() {
        if (eqGains == null || player == null) return;
        try {
            int sid = player.getAudioSessionId();
            if (equalizer == null || sid != equalizerSession) {
                if (equalizer != null) equalizer.release();
                equalizer = new Equalizer(0, sid);
                equalizerSession = sid;
            }
            int[] centers = {60, 230, 910, 3600, 14000};
            short[] range = equalizer.getBandLevelRange();
            boolean flat = true;
            for (short g : eqGains) flat &= g == 0;
            equalizer.setEnabled(!flat);
            for (short band = 0; band < equalizer.getNumberOfBands(); band++) {
                int hz = equalizer.getCenterFreq(band) / 1000;
                int best = 0;
                for (int i = 1; i < centers.length; i++) {
                    if (Math.abs(Math.log((double) hz / centers[i])) < Math.abs(Math.log((double) hz / centers[best]))) best = i;
                }
                int level = Math.max(range[0], Math.min(range[1], eqGains[best] * 100));
                equalizer.setBandLevel(band, (short) level);
            }
        } catch (Exception e) {
            // Some devices don't offer an equalizer effect; playback still works.
        }
    }

    static void setLibrary(android.content.Context context, String json) {
        new Catalog(context).setLibrary(json);
    }

    // ------------------------------------------------------------- session callback

    private MediaItem resolve(MediaItem item) {
        JSONObject json = Tracks.json(item);
        if (json != null) return Tracks.fromJson(json);
        MediaItem known = catalog.lookup(item.mediaId);
        if (known != null) return known;
        return item;
    }

    private class Callback implements MediaLibrarySession.Callback {
        @NonNull
        @Override
        public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
                @NonNull MediaLibrarySession session, @NonNull MediaSession.ControllerInfo browser, @Nullable LibraryParams params) {
            return Futures.immediateFuture(LibraryResult.ofItem(catalog.root(), params));
        }

        @NonNull
        @Override
        public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(
                @NonNull MediaLibrarySession session, @NonNull MediaSession.ControllerInfo browser, @NonNull String parentId,
                int page, int pageSize, @Nullable LibraryParams params) {
            return io.submit(() -> {
                try {
                    List<MediaItem> all = catalog.children(parentId);
                    int from = Math.min(all.size(), page * pageSize);
                    int to = Math.min(all.size(), from + pageSize);
                    return LibraryResult.ofItemList(ImmutableList.copyOf(all.subList(from, to)), params);
                } catch (Exception e) {
                    return LibraryResult.ofError(SessionError.ERROR_IO);
                }
            });
        }

        @NonNull
        @Override
        public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
                @NonNull MediaLibrarySession session, @NonNull MediaSession.ControllerInfo browser, @NonNull String mediaId) {
            MediaItem item = catalog.lookup(mediaId);
            return Futures.immediateFuture(item != null ? LibraryResult.ofItem(item, null) : LibraryResult.ofError(SessionError.ERROR_BAD_VALUE));
        }

        @NonNull
        @Override
        public ListenableFuture<LibraryResult<Void>> onSearch(
                @NonNull MediaLibrarySession session, @NonNull MediaSession.ControllerInfo browser, @NonNull String query, @Nullable LibraryParams params) {
            io.execute(() -> {
                try {
                    List<MediaItem> results = catalog.search(query);
                    searchResults.put(query, results);
                    session.notifySearchResultChanged(browser, query, results.size(), params);
                } catch (Exception e) {
                    session.notifySearchResultChanged(browser, query, 0, params);
                }
            });
            return Futures.immediateFuture(LibraryResult.ofVoid());
        }

        @NonNull
        @Override
        public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetSearchResult(
                @NonNull MediaLibrarySession session, @NonNull MediaSession.ControllerInfo browser, @NonNull String query,
                int page, int pageSize, @Nullable LibraryParams params) {
            List<MediaItem> all = searchResults.get(query);
            if (all == null) all = new ArrayList<>();
            int from = Math.min(all.size(), page * pageSize);
            int to = Math.min(all.size(), from + pageSize);
            return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.copyOf(all.subList(from, to)), params));
        }

        @NonNull
        @Override
        public ListenableFuture<List<MediaItem>> onAddMediaItems(
                @NonNull MediaSession mediaSession, @NonNull MediaSession.ControllerInfo controller, @NonNull List<MediaItem> mediaItems) {
            List<MediaItem> out = new ArrayList<>();
            for (MediaItem m : mediaItems) out.add(resolve(m));
            return Futures.immediateFuture(out);
        }

        @NonNull
        @Override
        public ListenableFuture<MediaSession.MediaItemsWithStartPosition> onSetMediaItems(
                @NonNull MediaSession mediaSession, @NonNull MediaSession.ControllerInfo controller, @NonNull List<MediaItem> mediaItems,
                int startIndex, long startPositionMs) {
            // "Hey Google, play <something> on Encore": search and play the results.
            if (mediaItems.size() == 1 && mediaItems.get(0).requestMetadata.searchQuery != null) {
                String query = mediaItems.get(0).requestMetadata.searchQuery;
                return io.submit(() -> {
                    List<MediaItem> results = query.trim().isEmpty() ? catalog.children("trending") : catalog.search(query);
                    return new MediaSession.MediaItemsWithStartPosition(results, 0, C.TIME_UNSET);
                });
            }
            // A single song picked in Android Auto: queue up the rest of the list it came from.
            if (mediaItems.size() == 1 && Tracks.json(mediaItems.get(0)) == null) {
                String id = mediaItems.get(0).mediaId;
                List<MediaItem> list = catalog.parentOf(id);
                if (list != null) {
                    int index = 0;
                    for (int i = 0; i < list.size(); i++) if (list.get(i).mediaId.equals(id)) index = i;
                    return Futures.immediateFuture(new MediaSession.MediaItemsWithStartPosition(list, index, startPositionMs));
                }
            }
            List<MediaItem> out = new ArrayList<>();
            for (MediaItem m : mediaItems) out.add(resolve(m));
            return Futures.immediateFuture(new MediaSession.MediaItemsWithStartPosition(out, startIndex, startPositionMs));
        }
    }
}

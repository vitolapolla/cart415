package app.encore.music;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(EncorePlayerPlugin.class);
        registerPlugin(SonosDiscoveryPlugin.class);
        super.onCreate(savedInstanceState);
        // Let the embedded YouTube player start when a video is tapped.
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}

package app.encore.music;

import android.content.Context;
import android.net.wifi.WifiManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.Set;

/** Finds Sonos speakers on the Wi-Fi network with an SSDP multicast search. */
@CapacitorPlugin(name = "SonosDiscovery")
public class SonosDiscoveryPlugin extends Plugin {
    private static final String SEARCH =
        "M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 1\r\n"
            + "ST: urn:schemas-upnp-org:device:ZonePlayer:1\r\n\r\n";

    @PluginMethod
    public void search(PluginCall call) {
        int timeout = call.getInt("timeout", 2500);
        new Thread(() -> {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            WifiManager.MulticastLock lock = wifi.createMulticastLock("encore-ssdp");
            lock.setReferenceCounted(false);
            Set<String> hosts = new LinkedHashSet<>();
            try (DatagramSocket socket = new DatagramSocket()) {
                lock.acquire();
                socket.setBroadcast(true);
                socket.setSoTimeout(300);
                byte[] msg = SEARCH.getBytes(StandardCharsets.US_ASCII);
                for (int i = 0; i < 2; i++) {
                    socket.send(new DatagramPacket(msg, msg.length, InetAddress.getByName("239.255.255.250"), 1900));
                    try {
                        socket.send(new DatagramPacket(msg, msg.length, InetAddress.getByName("255.255.255.255"), 1900));
                    } catch (Exception ignored) {
                    }
                }
                long end = System.currentTimeMillis() + timeout;
                byte[] buf = new byte[2048];
                while (System.currentTimeMillis() < end) {
                    DatagramPacket p = new DatagramPacket(buf, buf.length);
                    try {
                        socket.receive(p);
                        String text = new String(p.getData(), 0, p.getLength(), StandardCharsets.US_ASCII);
                        if (text.contains("Sonos") || text.contains("ZonePlayer")) hosts.add(p.getAddress().getHostAddress());
                    } catch (SocketTimeoutException ignored) {
                    }
                }
            } catch (Exception e) {
                // No Wi-Fi or multicast blocked: report whatever we found.
            } finally {
                if (lock.isHeld()) lock.release();
            }
            JSObject ret = new JSObject();
            ret.put("hosts", new JSArray(hosts));
            call.resolve(ret);
        }).start();
    }
}

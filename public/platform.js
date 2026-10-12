// Where Encore is running, and how it reaches its API:
//   native  Android app (Capacitor): native player, Sonos straight from the phone
//   direct  static website: music services called from the browser, no Sonos
//   server  served by the Encore Node server: API over HTTP, Sonos via the server

const Cap = window.Capacitor;
export const MODE = Cap?.isNativePlatform?.() ? 'native' : window.ENCORE_DIRECT ? 'direct' : 'server';
export const Plugins = Cap?.Plugins || {};
export const canCast = MODE !== 'direct';

const LIBRARY_KEY = 'encore.library';
let localApi;

async function getLocalApi() {
  if (localApi) return localApi;
  const [{ createApi }, sources] = await Promise.all([import('./shared/api.js'), import('./shared/sources.js')]);
  sources.configure({ direct: true });
  localApi = createApi({
    async findSpeakers() {
      if (MODE !== 'native' || !Plugins.SonosDiscovery) return [];
      const { hosts } = await Plugins.SonosDiscovery.search({ timeout: 2500 });
      try { localStorage.setItem('encore.sonosHosts', JSON.stringify(hosts)); } catch {}
      return hosts;
    },
    async loadLibrary() {
      try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || 'null'); } catch { return null; }
    },
    async saveLibrary(lib) {
      try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); } catch {}
    },
    async castUrl(track) {
      if (!/^https?:\/\//.test(track.stream || '')) throw new Error('Not a castable track');
      // Hand Sonos the final file URL rather than one that redirects.
      if (track.source === 'audius') return sources.audius.resolvedStreamUrl(track.id.replace(/^audius:/, ''));
      return track.stream;
    },
  });
  // Speakers seen last time, so the list fills in instantly.
  try {
    const { addHost } = await import('./shared/sonos.js');
    for (const h of JSON.parse(localStorage.getItem('encore.sonosHosts') || '[]')) addHost(h);
  } catch {}
  return localApi;
}

export async function api(path, opts = {}) {
  const method = opts.method || 'GET';
  if (MODE === 'server') {
    const res = await fetch(path, {
      method,
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  const handle = await getLocalApi();
  return handle(method, path, opts.body || {});
}

// Hardware back button: close whatever is open before leaving the app.
export function onBackButton(handler) {
  Plugins.App?.addListener?.('backButton', handler);
}
export function exitApp() {
  Plugins.App?.minimizeApp?.() ?? Plugins.App?.exitApp?.();
}

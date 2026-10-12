// Encore — web client (browser, PWA and Android app). No build step, no framework.
import { MODE, api, Plugins, canCast, onBackButton, exitApp } from './platform.js';
import { HtmlEngine, NativeEngine, SonosEngine } from './engines.js';
import { ICONS } from './icons.js';

// ================================================================ utils
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isPhone = () => window.innerWidth <= 860;
const icon = (name, cls = 'ic') => `<svg class="${cls}" viewBox="0 -960 960 960" aria-hidden="true"><path d="${ICONS[name] || ''}"/></svg>`;
function hydrateIcons(root = document) {
  root.querySelectorAll('svg[data-icon]').forEach((el) => {
    el.setAttribute('viewBox', '0 -960 960 960');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<path d="${ICONS[el.dataset.icon] || ''}"/>`;
  });
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (sec) => {
  if (!isFinite(sec) || sec <= 0) return '0:00';
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};
const ART_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2a2633"/><path d="M26 18v20.5a6 6 0 1 0 4 5.5V24h10v-6z" fill="#7d7690"/></svg>');
const art = (url) => esc(url || ART_FALLBACK);
const uid = () => Math.random().toString(36).slice(2, 10);
const hueOf = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const cleanStreamTitle = (...a) => sourcesMod?.cleanStreamTitle(...a) ?? null;
let sourcesMod = null;
import('./shared/sources.js').then((m) => { sourcesMod = m; }).catch(() => {});

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ================================================================ theme & dynamic color (Material You)
const systemLight = matchMedia('(prefers-color-scheme: light)');
function applyTheme() {
  const pref = library.settings.theme || 'system';
  const light = pref === 'light' || (pref === 'system' && systemLight.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  requestAnimationFrame(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    $('meta[name=theme-color]').setAttribute('content', bg);
  });
}
systemLight.addEventListener?.('change', applyTheme);

function setSeed(h, c = 1) {
  document.documentElement.style.setProperty('--h', Math.round(h));
  document.documentElement.style.setProperty('--c', c.toFixed(2));
}

// Pick a seed color from the artwork, like Android's Material You does from your wallpaper.
const seedCache = new Map();
function applySeedColor(t) {
  if (library.settings.dynamicColor === false || !t) return setSeed(262, 1);
  const key = t.artwork || t.id;
  if (seedCache.has(key)) return setSeed(...seedCache.get(key));
  setSeed(hueOf(t.artist || t.title), 0.8);
  if (!t.artwork) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 24;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 24, 24);
      const d = g.getImageData(0, 0, 24, 24).data;
      // Weight each pixel's hue by how colorful it is; ignore near-greys.
      let x = 0, y = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
        const max = Math.max(r, gg, b), min = Math.min(r, gg, b), chroma = max - min;
        if (chroma < 0.12 || max < 0.15) continue;
        let h = max === r ? ((gg - b) / chroma) % 6 : max === gg ? (b - r) / chroma + 2 : (r - gg) / chroma + 4;
        h *= 60;
        const weight = chroma * chroma;
        x += Math.cos((h * Math.PI) / 180) * weight;
        y += Math.sin((h * Math.PI) / 180) * weight;
        w += weight;
      }
      const seed = w > 0.4 ? [((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, Math.min(1, 0.55 + w / 40)] : [hueOf(t.artist || t.title), 0.35];
      seedCache.set(key, seed);
      if (current()?.artwork === t.artwork || current()?.id === t.id) setSeed(...seed);
    } catch {
      // Artwork host doesn't allow reading pixels: keep the fallback tint.
    }
  };
  img.src = t.artwork;
}

// ================================================================ library (persisted on the server or on the device)
const library = {
  liked: [], playlists: [], recent: [], recentCollections: [],
  settings: { volume: 0.8, eq: [0, 0, 0, 0, 0], eqPreset: 'Flat' },
};

function loadLocal() {
  try { return JSON.parse(localStorage.getItem('encore.library') || 'null'); } catch { return null; }
}
let saveTimer;
function saveLibrary() {
  try { localStorage.setItem('encore.library', JSON.stringify(library)); } catch {}
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api('/api/library', { method: 'PUT', body: library }).catch(() => {});
    // Android Auto shows your liked songs and playlists.
    if (MODE === 'native') Plugins.EncorePlayer?.setLibrary({ library: { liked: library.liked, playlists: library.playlists, recent: library.recent.slice(0, 30) } }).catch(() => {});
  }, 800);
  renderSidebar();
}
async function initLibrary() {
  const remote = await api('/api/library').catch(() => null);
  const data = remote && Object.keys(remote).length ? remote : loadLocal();
  if (data) {
    Object.assign(library, data);
    library.settings = { volume: 0.8, eq: [0, 0, 0, 0, 0], eqPreset: 'Flat', ...data.settings };
  }
}
const slim = (t) => ({ id: t.id, source: t.source, title: t.title, artist: t.artist, artistId: t.artistId, album: t.album, artwork: t.artwork, duration: t.duration, genre: t.genre, stream: t.stream, kind: t.kind, externalUrl: t.externalUrl, codec: t.codec });
const isLiked = (id) => library.liked.some((t) => t.id === id);
function toggleLike(track) {
  if (!track) return;
  if (isLiked(track.id)) {
    library.liked = library.liked.filter((t) => t.id !== track.id);
    toast('Removed from Liked Songs');
  } else {
    library.liked.unshift({ ...slim(track), addedAt: Date.now() });
    toast('Added to Liked Songs');
  }
  saveLibrary();
  $$(`[data-like="${CSS.escape(track.id)}"]`).forEach((el) => {
    el.classList.toggle('on', isLiked(track.id));
    el.innerHTML = icon(isLiked(track.id) ? 'heart-fill' : 'heart');
  });
  updatePlayerUI();
}
function pushRecent(track) {
  library.recent = [slim(track), ...library.recent.filter((t) => t.id !== track.id)].slice(0, 50);
  saveLibrary();
}
function pushRecentCollection(c) {
  library.recentCollections = [c, ...library.recentCollections.filter((x) => x.href !== c.href)].slice(0, 12);
  saveLibrary();
}
function createPlaylist(name, tracks = []) {
  const p = { id: uid(), name: name || `My Playlist #${library.playlists.length + 1}`, tracks: tracks.map(slim), created: Date.now(), description: '' };
  library.playlists.push(p);
  saveLibrary();
  return p;
}
function addToPlaylist(pid, tracks) {
  const p = library.playlists.find((x) => x.id === pid);
  if (!p) return;
  const have = new Set(p.tracks.map((t) => t.id));
  const fresh = tracks.filter((t) => !have.has(t.id));
  p.tracks.push(...fresh.map(slim));
  saveLibrary();
  toast(fresh.length ? `Added to ${p.name}` : `Already in ${p.name}`);
}

// ================================================================ player
const EQ_FREQS = [60, 230, 910, 3600, 14000];
const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0], 'Bass Boost': [6, 4, 0, 0, 0], 'Treble Boost': [0, 0, 0, 3, 6], Vocal: [-2, 0, 3, 4, 1],
  Electronic: [5, 2, -1, 2, 4], Acoustic: [3, 1, 1, 2, 2], 'Late Night': [3, 2, 0, -2, -3], Loudness: [5, 1, -1, 1, 4],
};
const EQ_SUPPORTED = MODE !== 'direct';

const player = {
  queue: [],       // tracks in play order
  index: -1,
  manual: 0,       // how many songs right after the current one were added with "Add to queue"
  context: null,   // { name, href } the queue was started from
  shuffle: false,
  ordered: null,   // context order before shuffling
  repeat: 'off',   // off | all | one
  playing: false,
  position: 0,
  duration: 0,
  cast: null,      // { id, name } of the Sonos group we're playing on
  sleepAt: null,   // timestamp, or 'track'
};
const current = () => player.queue[player.index] || null;

const hooks = {
  onIndex(i) {
    if (i === player.index || !player.queue[i]) return;
    if (i > player.index) player.manual = Math.max(0, player.manual - (i - player.index));
    player.index = i;
    trackChanged(true);
  },
  onState({ playing }) {
    if (player.playing === playing) return;
    player.playing = playing;
    updatePlayerUI();
  },
  onTime(pos, dur) {
    if (seeking) return;
    player.position = pos || 0;
    if (dur) player.duration = dur;
    updateProgress();
  },
  onEnd() { autoplay(); },
  onStreamTitle(raw) {
    const t = current();
    if (t?.kind !== 'live') return;
    const title = cleanStreamTitle(raw, t.title);
    if (title === player.streamTitle) return;
    player.streamTitle = title;
    updatePlayerUI();
  },
  onError(msg) { toast(msg); },
  onQueue(tracks, index) {
    player.queue = tracks;
    player.index = index;
    player.manual = 0;
    player.ordered = null;
    player.context = player.context || { name: 'Android Auto', href: '#/home' };
    trackChanged(false);
  },
};

function localEngine() {
  if (MODE === 'native' && Plugins.EncorePlayer) return new NativeEngine(hooks);
  return new HtmlEngine(hooks, { webAudioEq: MODE === 'server' });
}
let engine = localEngine();

function applyEngineSettings() {
  engine.setRepeat?.(player.repeat);
  if (!player.cast) engine.setVolume(library.settings.volume);
  engine.setEqualizer(library.settings.eq);
}

// Called whenever the current song changes.
function trackChanged(automatic) {
  const t = current();
  if (!t) return;
  if (automatic && player.sleepAt === 'track') {
    player.sleepAt = null;
    engine.pause();
    toast('Sleep timer: goodnight');
  }
  player.position = 0;
  player.duration = t.duration || 0;
  player.streamTitle = null;
  pushRecent(t);
  applySeedColor(t);
  watchStreamTitle();
  updatePlayerUI();
  renderPanel();
  loadLyrics(t);
}

function playList(list, startAt = 0, context = null) {
  const picked = list[startAt];
  if (!picked) return;
  // Videos open in the video player; audio goes to the queue.
  if (picked.kind === 'video') {
    const videos = list.filter((t) => t?.kind === 'video');
    return openVideo(videos, videos.indexOf(picked), context);
  }
  const tracks = list.filter((t) => t && t.kind !== 'video');
  const start = tracks.indexOf(picked);
  player.context = context;
  player.ordered = tracks.slice();
  if (player.shuffle) {
    const rest = tracks.filter((_, i) => i !== start);
    player.queue = [tracks[start], ...shuffleArray(rest)];
    player.index = 0;
  } else {
    player.queue = tracks.slice();
    player.index = start;
  }
  player.manual = 0;
  player.playing = true;
  trackChanged(false);
  engine.setQueue(player.queue, player.index, { play: true });
}

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function skipTo(i) {
  if (!player.queue[i]) return;
  if (i > player.index) player.manual = Math.max(0, player.manual - (i - player.index));
  player.index = i;
  player.playing = true;
  trackChanged(false);
  engine.skipTo(i);
}

function togglePlay() {
  if (!current()) {
    const list = lastRenderedList();
    if (list?.length) playList(list, 0);
    return;
  }
  player.playing = !player.playing;
  updatePlayerUI();
  player.playing ? engine.play() : engine.pause();
}

function next() {
  if (player.index < player.queue.length - 1) return skipTo(player.index + 1);
  if (player.repeat === 'all') return skipTo(0);
  autoplay();
}

function prev() {
  if (player.position > 3 || player.index <= 0) return seek(0);
  skipTo(player.index - 1);
}

// End of the queue: keep the music going with similar songs.
let autoplaying = false;
async function autoplay() {
  const t = current();
  if (!t || t.kind === 'live' || autoplaying) { player.playing = false; updatePlayerUI(); return; }
  autoplaying = true;
  try {
    const genre = t.genre || 'Electronic';
    const { tracks } = await api(`/api/genre/${encodeURIComponent(genre)}`);
    const have = new Set(player.queue.map((x) => x.id));
    const more = shuffleArray(tracks.filter((x) => !have.has(x.id))).slice(0, 20);
    if (!more.length) throw new Error('nothing new');
    player.queue.push(...more);
    await engine.sync(player.queue, player.index);
    toast(`Autoplay: more ${genre}`);
    skipTo(player.index + 1);
  } catch {
    player.playing = false;
    updatePlayerUI();
  } finally {
    autoplaying = false;
  }
}

function seek(sec) {
  const t = current();
  if (!t || t.kind === 'live') return;
  player.position = sec;
  engine.seek(sec);
  updateProgress();
}

function setVolume(v) {
  v = Math.max(0, Math.min(1, v));
  if (player.cast) engine.setVolume(v);
  else {
    library.settings.volume = v;
    engine.setVolume(v);
    saveLibrary();
  }
  updateVolumeUI();
}
const currentVolume = () => (player.cast ? (engine.volume ?? 30) / 100 : library.settings.volume);

function toggleShuffle() {
  player.shuffle = !player.shuffle;
  const t = current();
  if (t) {
    const added = player.queue.slice(player.index + 1, player.index + 1 + player.manual);
    if (player.shuffle) {
      player.ordered = player.ordered || player.queue.slice();
      const skip = new Set([t.id, ...added.map((x) => x.id)]);
      player.queue = [t, ...added, ...shuffleArray(player.queue.filter((x) => !skip.has(x.id)))];
      player.index = 0;
    } else if (player.ordered) {
      const skip = new Set(added.map((x) => x.id));
      const ordered = player.ordered.filter((x) => !skip.has(x.id));
      const at = ordered.findIndex((x) => x.id === t.id);
      player.queue = at >= 0 ? [...ordered.slice(0, at + 1), ...added, ...ordered.slice(at + 1)] : [t, ...added, ...ordered];
      player.index = Math.max(0, at);
    }
    engine.sync(player.queue, player.index);
  }
  toast(player.shuffle ? 'Shuffle on' : 'Shuffle off');
  updatePlayerUI();
  renderPanel();
}

function cycleRepeat() {
  player.repeat = { off: 'all', all: 'one', one: 'off' }[player.repeat];
  engine.setRepeat(player.repeat);
  toast({ off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' }[player.repeat]);
  updatePlayerUI();
}

function addToQueue(tracks, nextUp = false) {
  if (!current()) return playList(tracks, 0);
  const at = player.index + 1 + (nextUp ? 0 : player.manual);
  player.queue.splice(at, 0, ...tracks);
  player.manual += tracks.length;
  engine.sync(player.queue, player.index);
  toast(nextUp ? 'Playing next' : tracks.length > 1 ? `Added ${tracks.length} songs to queue` : 'Added to queue');
  renderPanel();
}

function removeFromQueue(i) {
  if (i <= player.index || !player.queue[i]) return;
  player.queue.splice(i, 1);
  if (i <= player.index + player.manual) player.manual = Math.max(0, player.manual - 1);
  engine.sync(player.queue, player.index);
  renderPanel();
}

// ================================================================ Sonos casting
async function switchEngine(next, label) {
  const t = current();
  const pos = player.position;
  const wasPlaying = player.playing;
  engine.stop();
  engine.destroy?.();
  engine = next;
  applyEngineSettings();
  updatePlayerUI();
  if (label) toast(label);
  if (t) await engine.setQueue(player.queue, player.index, { position: t.kind === 'live' ? 0 : pos, play: wasPlaying });
}

function startCast(group) {
  if (player.cast?.id === group.id) return;
  player.cast = { id: group.id, name: group.name };
  switchEngine(new SonosEngine(hooks, group), `Playing on ${group.name}`);
}

function stopCast() {
  if (!player.cast) return;
  player.cast = null;
  switchEngine(localEngine(), 'Playing on this phone');
}

let groupsCache = null;
async function fetchGroups(refresh = false) {
  const data = await api(`/api/sonos/groups${refresh ? '?refresh=1' : ''}`);
  groupsCache = data;
  return data;
}

// The "Play on" picker: a compact Material bottom sheet (phones) or menu (desktop).
async function openCastPicker(anchor) {
  const here = MODE === 'native' ? 'This phone' : 'This device';
  const hereSub = MODE === 'native' ? 'Speaker, headphones, Bluetooth or car' : 'Speakers or headphones';
  const row = (id, name, sub, ico, active) => `
    <button class="device ${active ? 'active' : ''}" data-cast-target="${esc(id)}">
      <span class="lead">${icon(ico)}</span>
      <span class="txt"><b>${esc(name)}</b><small>${sub}</small></span>
      ${active ? `<span class="check">${icon('check')}</span>` : ''}
    </button>`;
  if (!canCast) {
    openPopover(anchor, `<h2 class="sheet-title">Play on</h2><div class="devices">${row('', here, hereSub, 'laptop', true)}</div>
      <p class="devices-empty">Sonos speakers can only be reached from your home network. Use the Encore Android app, or run the Encore server at home.</p>`, 'up');
    return;
  }
  const render = (data, searching) => `
    <h2 class="sheet-title">Play on</h2>
    <div class="devices">
      ${row('', here, hereSub, MODE === 'native' ? 'phone' : 'laptop', !player.cast)}
      ${data.groups.map((g) => row(g.id, g.name, g.members.length > 1 ? `Sonos · ${g.members.length} speakers` : 'Sonos', g.members.length > 1 ? 'group' : 'speaker', player.cast?.id === g.id)
        + (player.cast?.id === g.id ? `<div class="device-vol">${icon('volume')}<input type="range" class="slider" min="0" max="100" value="${engine.volume ?? 30}" data-cast-volume aria-label="Speaker volume"></div>` : '')).join('')}
    </div>
    ${searching ? '<p class="devices-empty">Looking for Sonos speakers…</p>' : data.groups.length ? '' : `<p class="devices-empty">No Sonos speakers found. Make sure you're on the same Wi-Fi as your speakers, or add one by IP address in Settings.</p>`}
    <div class="sheet-actions">
      <button class="btn text" data-action="cast-refresh">${icon('refresh')}Search again</button>
      <a class="btn text" href="#/settings">${icon('group')}Group speakers</a>
    </div>`;
  const pop = openPopover(anchor, render(groupsCache || { groups: [] }, !groupsCache), 'up');
  const wire = (data) => {
    $$('[data-cast-target]', pop).forEach((el) => el.addEventListener('click', () => {
      closePopover();
      const g = data.groups.find((x) => x.id === el.dataset.castTarget);
      if (!g) return stopCast();
      startCast(g);
    }));
    const vol = $('[data-cast-volume]', pop);
    if (vol) {
      setRangePct(vol);
      vol.addEventListener('input', () => { setRangePct(vol); setVolume(vol.value / 100); });
    }
    $('[data-action=cast-refresh]', pop).addEventListener('click', async (e) => {
      e.stopPropagation();
      pop.innerHTML = render(groupsCache || { groups: [] }, true);
      await fetchGroups(true).catch(() => {});
      if (!pop.hidden) { pop.innerHTML = render(groupsCache || { groups: [] }, false); wire(groupsCache || { groups: [] }); }
    });
  };
  wire(groupsCache || { groups: [] });
  let data;
  try {
    data = await fetchGroups(!groupsCache?.groups.length);
  } catch {
    data = { groups: [] };
  }
  if (pop.hidden) return;
  pop.innerHTML = render(data, false);
  positionPopover(anchor, 'up');
  wire(data);
}

// ================================================================ media session (browser lock screen / media keys)
// The Android app gets these from its native player instead.
function updateMediaSession() {
  if (MODE === 'native' || !('mediaSession' in navigator)) return;
  const t = current();
  if (!t) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title, artist: t.artist, album: t.album || '',
    artwork: t.artwork ? [{ src: t.artwork, sizes: '480x480' }] : [],
  });
  navigator.mediaSession.playbackState = player.playing ? 'playing' : 'paused';
}
if (MODE !== 'native' && 'mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => !player.playing && togglePlay());
  ms.setActionHandler('pause', () => player.playing && togglePlay());
  ms.setActionHandler('previoustrack', prev);
  ms.setActionHandler('nexttrack', next);
  try { ms.setActionHandler('seekto', (d) => seek(d.seekTime)); } catch {}
}

// ================================================================ sleep timer
setInterval(() => {
  if (typeof player.sleepAt === 'number' && Date.now() >= player.sleepAt) {
    player.sleepAt = null;
    if (player.playing) togglePlay();
    toast('Sleep timer: goodnight');
    updatePlayerUI();
  }
}, 1000);

function openSleepMenu(anchor) {
  const opts = [[15, '15 minutes'], [30, '30 minutes'], [45, '45 minutes'], [60, '1 hour'], ['track', 'End of this song']];
  const remaining = typeof player.sleepAt === 'number' ? Math.ceil((player.sleepAt - Date.now()) / 60000) : null;
  const pop = openPopover(anchor, `
    <h2 class="sheet-title">Sleep timer</h2>
    <p class="sheet-sub">${remaining ? `Music stops in ${remaining} min` : player.sleepAt === 'track' ? 'Music stops after this song' : 'Stop the music after…'}</p>
    ${opts.map(([v, l]) => `<button class="menu-item" data-sleep="${v}">${icon(v === 'track' ? 'note' : 'timer')}${l}</button>`).join('')}
    ${player.sleepAt ? `<div class="menu-sep"></div><button class="menu-item" data-sleep="off">${icon('close')}Turn off timer</button>` : ''}`, 'up');
  $$('[data-sleep]', pop).forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.sleep;
    player.sleepAt = v === 'off' ? null : v === 'track' ? 'track' : Date.now() + Number(v) * 60000;
    toast(v === 'off' ? 'Sleep timer off' : v === 'track' ? 'Music stops after this song' : `Music stops in ${v} minutes`);
    closePopover();
    updatePlayerUI();
  }));
}

// ================================================================ lyrics
let lyricsState = { id: null, lines: null, plain: null, loading: false };
async function loadLyrics(t) {
  if (lyricsState.id === t.id) return;
  lyricsState = { id: t.id, lines: null, plain: null, loading: true };
  if (t.kind === 'live') { lyricsState.loading = false; return; }
  try {
    const r = await api(`/api/lyrics?${new URLSearchParams({ title: t.title, artist: t.artist, duration: t.fullDuration || t.duration || 0 })}`);
    if (lyricsState.id !== t.id) return;
    lyricsState.lines = r.synced ? parseLrc(r.synced) : null;
    lyricsState.plain = r.plain || null;
    lyricsState.instrumental = r.instrumental;
  } catch {}
  lyricsState.loading = false;
  if (panelTab === 'lyrics' || sheetOpen()) renderPanel();
}
function parseLrc(lrc) {
  const out = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (m) out.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() || '♪' });
  }
  return out.length ? out : null;
}
function lyricsHtml(t) {
  if (!t) return '<div class="empty">Play a song to see its lyrics.</div>';
  if (lyricsState.loading) return '<div class="empty">Finding lyrics…</div>';
  if (t.kind === 'live') return '<div class="empty">Lyrics aren\'t available for live radio.</div>';
  if (lyricsState.instrumental) return '<div class="empty">♪ Instrumental ♪</div>';
  if (lyricsState.lines && t.kind !== 'preview') return `<div class="lyrics">${lyricsState.lines.map((l) => `<p data-seek="${l.t}">${esc(l.text)}</p>`).join('')}</div>`;
  if (lyricsState.plain || lyricsState.lines) return `<div class="lyrics plain">${(lyricsState.plain || lyricsState.lines.map((l) => l.text).join('\n')).split('\n').map((l) => `<p>${esc(l) || '&nbsp;'}</p>`).join('')}</div>`;
  return '<div class="empty">No lyrics found for this song.</div>';
}
function updateLyricsHighlight() {
  if (!lyricsState.lines || current()?.kind === 'preview') return;
  const box = sheetOpen() ? (sheetTab === 'lyrics' ? $('#sheet-extra') : null) : panelTab === 'lyrics' ? $('#panel-body') : null;
  if (!box) return;
  const ps = $$('.lyrics p', box);
  let idx = -1;
  lyricsState.lines.forEach((l, i) => { if (l.t <= player.position + 0.3) idx = i; });
  ps.forEach((p, i) => { p.classList.toggle('current', i === idx); p.classList.toggle('past', i < idx); });
  const cur = ps[idx];
  if (cur && cur.dataset.scrolled !== '1') {
    ps.forEach((p) => delete p.dataset.scrolled);
    cur.dataset.scrolled = '1';
    cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// ================================================================ player UI (bar, mini player, full-screen sheet)
function setRangePct(input) {
  input.style.setProperty('--pct', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
}
let seeking = false;
function updateProgress() {
  const t = current();
  const live = t?.kind === 'live';
  const pct = live ? 100 : player.duration ? Math.min(100, (player.position / player.duration) * 100) : 0;
  for (const k of ['p', 's']) {
    const wave = $(`#${k}-wave`);
    $(`#${k}-time`).textContent = live ? 'LIVE' : fmt(player.position);
    $(`#${k}-dur`).textContent = live ? '' : fmt(player.duration);
    wave.classList.toggle('live', live);
    wave.classList.toggle('disabled', !t);
    $(`#${k}-seek`).disabled = live || !t;
    if (!seeking) {
      wave.style.setProperty('--pct', `${pct}%`);
      $(`#${k}-seek`).value = pct * 10;
    }
  }
  $('#mini-progress').style.width = `${pct}%`;
  updateLyricsHighlight();
}
function updateVolumeUI() {
  const v = currentVolume();
  const el = $('#p-vol');
  el.value = Math.round(v * 100);
  setRangePct(el);
  $('#p-mute').innerHTML = icon(v === 0 ? 'mute' : 'volume');
}
const badgeHtml = (t) => (t.kind === 'preview' ? '<span class="badge preview">PREVIEW</span>' : t.kind === 'live' ? '<span class="badge live">LIVE</span>' : t.kind === 'video' ? '<span class="badge video">VIDEO</span>' : '');
const deviceName = () => (player.cast ? player.cast.name : MODE === 'native' ? 'This phone' : 'This device');
const deviceIcon = () => (player.cast ? 'speaker' : MODE === 'native' ? 'phone' : 'laptop');

function updatePlayerUI() {
  const t = current();
  const liked = !!t && isLiked(t.id);
  $('#p-art').src = t?.artwork || ART_FALLBACK;
  $('#p-title').innerHTML = t ? `${badgeHtml(t)}${esc(t.title)}` : 'Nothing playing';
  const sub = !t ? 'Pick something to listen to'
    : player.cast && isPhone() ? `<span class="on-device">${icon('speaker')}${esc(player.cast.name)}</span>`
    : t.kind === 'live' && player.streamTitle ? `♪ ${esc(player.streamTitle)}` : esc(t.artist);
  $('#p-artist').innerHTML = sub;
  $$('[data-action=toggle]').forEach((b) => { b.innerHTML = icon(player.playing ? 'pause' : 'play'); b.title = player.playing ? 'Pause' : 'Play'; });
  $$('[data-action=like-current]').forEach((b) => { b.innerHTML = icon(liked ? 'heart-fill' : 'heart'); b.classList.toggle('on', liked); });
  $$('[data-action=shuffle]').forEach((b) => b.classList.toggle('on', player.shuffle));
  $$('[data-action=repeat]').forEach((b) => {
    b.classList.toggle('on', player.repeat !== 'off');
    b.innerHTML = icon(player.repeat === 'one' ? 'repeat-one' : 'repeat');
  });
  $$('[data-action=sleep]').forEach((b) => b.classList.toggle('on', !!player.sleepAt));
  $('#p-cast').classList.toggle('on', !!player.cast);
  const pill = $('#cast-badge');
  pill.hidden = !player.cast;
  pill.innerHTML = `${icon('speaker')}<span>${esc(player.cast?.name || '')}</span>`;
  $('#s-cast').innerHTML = `${icon(deviceIcon())}${esc(deviceName())}`;
  $('#s-cast').classList.toggle('on', !!player.cast);
  $('#s-sleep').innerHTML = `${icon('moon')}${typeof player.sleepAt === 'number' ? `${Math.max(1, Math.ceil((player.sleepAt - Date.now()) / 60000))} min` : player.sleepAt === 'track' ? 'End of song' : 'Sleep'}`;
  $('#s-sleep').classList.toggle('on', !!player.sleepAt);
  document.title = t ? `${t.title} · ${t.artist}` : 'Encore';
  document.body.classList.toggle('paused', !player.playing);
  document.body.classList.toggle('has-track', !!t);
  if (sheetOpen()) renderSheetMeta();
  updateProgress();
  updateVolumeUI();
  updateMediaSession();
  markPlayingRows();
}
function markPlayingRows() {
  const id = current()?.id;
  $$('.track').forEach((row) => {
    const on = row.dataset.id === id;
    row.classList.toggle('playing', on);
    const num = $('.t-num > span', row);
    if (num) num.innerHTML = on ? '<span class="eq-anim"><i></i><i></i><i></i></span>' : esc(num.dataset.n);
  });
  $$('.live-card[data-id]').forEach((c) => c.classList.toggle('playing', c.dataset.id === id));
}

// Radio "now playing": the native player reports it; the server version asks the server.
let titleTimer;
function watchStreamTitle() {
  clearInterval(titleTimer);
  const t = current();
  if (MODE !== 'server' || t?.kind !== 'live') return;
  const poll = async () => {
    if (current()?.id !== t.id || player.cast) return;
    const { title } = await api(`/api/nowplaying?id=${encodeURIComponent(t.id)}`).catch(() => ({}));
    if (current()?.id === t.id && title !== player.streamTitle) {
      player.streamTitle = title || null;
      updatePlayerUI();
      if (!isPhone() && panelTab === 'now') renderPanel();
    }
  };
  setTimeout(poll, 1500);
  titleTimer = setInterval(poll, 20000);
}
function onAirHtml() {
  const t = current();
  if (t?.kind !== 'live' || !player.streamTitle) return '';
  return `<button class="on-air-card" data-search-for="${esc(player.streamTitle)}">${icon('live')}<span class="clip"><span class="label">On air now</span><b class="clip">${esc(player.streamTitle)}</b></span>${icon('search')}</button>`;
}

// ---- full-screen Now Playing (phones)
const sheet = $('#sheet');
let sheetTab = 'queue';
const sheetOpen = () => sheet.classList.contains('open');
function openSheet() {
  if (!current()) return;
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sheet-is-open');
  renderSheetMeta();
  renderSheetExtra();
}
function closeSheet() {
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.style.transform = '';
  document.body.classList.remove('sheet-is-open');
}
function renderSheetMeta() {
  const t = current();
  if (!t) return closeSheet();
  $('#s-art').src = t.artwork || ART_FALLBACK;
  $('#s-context').textContent = player.context?.name || 'Your queue';
  $('#s-title').innerHTML = `${badgeHtml(t)}${esc(t.title)}`;
  $('#s-artist').innerHTML = t.artistId ? `<a href="#/artist/${encodeURIComponent(t.artistId)}">${esc(t.artist)}</a>` : esc(t.artist);
  $('#s-onair').innerHTML = onAirHtml();
}
function renderSheetExtra() {
  if (!sheetOpen()) return;
  $$('[data-sheet-tab]').forEach((b) => b.classList.toggle('active', b.dataset.sheetTab === sheetTab));
  const t = current();
  $('#sheet-extra').innerHTML = sheetTab === 'lyrics' ? lyricsHtml(t) : sheetTab === 'about' ? aboutHtml(t) : upNextHtml();
  markPlayingRows();
  updateLyricsHighlight();
}

// ---- side panel (desktop)
let panelTab = 'now';
function openPanel(tab) {
  if (isPhone()) {
    sheetTab = tab === 'now' ? 'queue' : tab;
    openSheet();
    return;
  }
  const app = $('#app');
  if (tab === panelTab && !app.classList.contains('panel-closed')) {
    app.classList.add('panel-closed');
    return;
  }
  panelTab = tab;
  app.classList.remove('panel-closed');
  renderPanel();
}
function aboutHtml(t) {
  if (!t) return '';
  const what = {
    full: 'Full-length song from <b>Audius</b>, where independent artists share their music.',
    preview: `30-second preview from the Apple Music catalog.${t.externalUrl ? ` <a href="${esc(t.externalUrl)}" target="_blank" rel="noopener">Hear the full song ↗</a>` : ''}`,
    live: `Live radio${t.bitrate ? ` · ${t.bitrate} kbps ${esc(t.codec || '')}` : ''}, via radio-browser.info.`,
  }[t.kind] || '';
  return `${onAirHtml()}<div class="info-card"><span class="label">About</span><div class="note">${what}
    ${t.genre ? `<br>Genre: <a href="#/genre/${encodeURIComponent(t.genre)}">${esc(t.genre)}</a>` : ''}</div></div>`;
}
function renderPanel() {
  if (sheetOpen()) { renderSheetMeta(); renderSheetExtra(); }
  $$('.tabs [data-panel]').forEach((b) => b.classList.toggle('active', b.dataset.panel === panelTab));
  const body = $('#panel-body');
  const t = current();
  if (panelTab === 'now') {
    if (!t) { body.innerHTML = `<div class="empty">Nothing playing yet.</div>`; return; }
    body.innerHTML = `
      <img class="np-art" src="${art(t.artwork)}" alt="">
      <div class="np-title">${esc(t.title)}</div>
      <div class="np-artist">${t.artistId ? `<a href="#/artist/${encodeURIComponent(t.artistId)}">${esc(t.artist)}</a>` : esc(t.artist)}</div>
      ${player.context ? `<div class="info-card"><span class="label">Playing from</span><a href="${esc(player.context.href)}">${esc(player.context.name)}</a></div>` : ''}
      ${aboutHtml(t)}
      ${upNextHtml(3)}`;
  } else if (panelTab === 'queue') {
    body.innerHTML = upNextHtml();
  } else {
    body.innerHTML = lyricsHtml(t);
  }
  markPlayingRows();
  updateLyricsHighlight();
}
function upNextHtml(limit = 80) {
  const t = current();
  if (!t) return '<div class="empty">Your queue is empty.</div>';
  const start = player.index + 1;
  const manualEnd = start + player.manual;
  const manual = player.queue.slice(start, Math.min(manualEnd, start + limit));
  const rest = player.queue.slice(manualEnd, manualEnd + Math.max(0, limit - manual.length));
  let html = limit < 80 ? '' : `<div class="queue-label">Now playing</div>${trackRows([t], { compact: true, list: 'np' })}`;
  if (manual.length) html += `<div class="queue-label">Next in queue</div>${trackRows(manual, { compact: true, list: 'q', offset: start })}`;
  if (rest.length) html += `<div class="queue-label">Next from ${esc(player.context?.name || 'your queue')}</div>${trackRows(rest, { compact: true, list: 'q', offset: manualEnd })}`;
  if (!manual.length && !rest.length && limit >= 80) html += `<div class="queue-label">${t.kind === 'live' ? 'Live radio plays until you stop it.' : 'Nothing up next. Autoplay will pick similar songs.'}</div>`;
  return html;
}

// ================================================================ video player (YouTube's embedded player)
const videoSheet = $('#video');
const video = { list: [], index: 0, context: null };
const videoOpen = () => videoSheet.classList.contains('open');
function openVideo(list, index = 0, context = null) {
  if (!list.length) return;
  if (player.playing) togglePlay(); // pause the music
  video.list = list;
  video.index = Math.max(0, index);
  video.context = context;
  videoSheet.classList.add('open');
  videoSheet.setAttribute('aria-hidden', 'false');
  renderVideo();
}
function renderVideo() {
  const v = video.list[video.index];
  if (!v) return;
  const next = video.list.slice(video.index + 1, video.index + 40).map((x) => x.videoId).join(',');
  const qs = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', modestbranding: '1', ...(next ? { playlist: next } : {}) });
  $('#v-frame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.videoId)}?${qs}" title="${esc(v.title)}"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  $('#v-context').textContent = video.context?.name || v.artist;
  $('#v-title').textContent = v.title;
  $('#v-channel').textContent = v.artist;
  $('#v-open').href = v.externalUrl;
  $('#v-yt').href = v.externalUrl;
  $('#v-list').innerHTML = `<div class="queue-label" style="color:#aaa">Up next</div>` + video.list.map((x, i) => `
    <div class="track ${i === video.index ? 'playing' : ''}" data-video-i="${i}" role="button" tabindex="0">
      <div class="t-main"><img class="t-art video" loading="lazy" src="${art(x.artwork)}" alt=""><div class="t-text"><div class="t-title">${esc(x.title)}</div><div class="t-artist">${esc(x.artist)}</div></div></div>
    </div>`).join('');
}
function closeVideo() {
  videoSheet.classList.remove('open');
  videoSheet.setAttribute('aria-hidden', 'true');
  $('#v-frame').innerHTML = '';
}

// ================================================================ rendering helpers
const lists = new Map(); // list id → tracks, so rows can be played from event handlers
let listSeq = 0, lastListId = null;
function registerList(tracks, meta = {}) {
  const id = `l${++listSeq}`;
  lists.set(id, { tracks, ...meta });
  if (lists.size > 80) lists.delete(lists.keys().next().value);
  return id;
}
function lastRenderedList() {
  return lastListId ? lists.get(lastListId)?.tracks : null;
}
// Rows in the queue use list "q" (index into player.queue) or "np" (the current song).
function trackFromRow(row) {
  const i = Number(row.dataset.i);
  if (row.dataset.list === 'q') return player.queue[i];
  if (row.dataset.list === 'np') return current();
  return lists.get(row.dataset.list)?.tracks[i];
}

function trackRows(tracks, { compact = false, list, context = null, playlistId = null, offset = 0, ranked = false } = {}) {
  if (!tracks.length) return '<div class="empty">No songs here yet.</div>';
  const lid = list || registerList(tracks, { context });
  if (!compact) lastListId = lid;
  return `<div class="list ${compact ? 'queue' : ''}">${tracks.map((t, i) => {
    const liked = isLiked(t.id);
    const artist = t.artistId ? `<a href="#/artist/${encodeURIComponent(t.artistId)}">${esc(t.artist)}</a>` : esc(t.artist);
    const main = `<div class="t-main"><img class="t-art ${t.kind === 'video' ? 'video' : ''}" loading="lazy" src="${art(t.artwork)}" alt=""><div class="t-text"><div class="t-title">${badgeHtml(t)}${esc(t.title)}</div><div class="t-artist">${artist}</div></div></div>`;
    const more = `<button class="t-more" data-more title="More options">${icon('more')}</button>`;
    if (compact) return `<div class="track" data-id="${esc(t.id)}" data-list="${lid}" data-i="${offset + i}">${main}${more}</div>`;
    return `<div class="track ${ranked ? 'ranked' : ''}" data-id="${esc(t.id)}" data-list="${lid}" data-i="${i}" ${playlistId ? `data-playlist="${esc(playlistId)}"` : ''}>
      <div class="t-num"><span data-n="${i + 1}">${i + 1}</span><button data-play-row title="Play">${icon('play')}</button></div>
      ${main}
      <div class="t-album">${t.album ? esc(t.album) : t.genre ? `<a href="#/genre/${encodeURIComponent(t.genre)}">${esc(t.genre)}</a>` : ''}</div>
      <button class="t-like ${liked ? 'on' : ''}" data-like="${esc(t.id)}" title="Like">${icon(liked ? 'heart-fill' : 'heart')}</button>
      <div class="t-dur">${t.kind === 'live' || t.kind === 'video' ? '' : fmt(t.duration)}</div>
      ${more}
    </div>`;
  }).join('')}</div>`;
}

function card({ href, img, title, sub, round = false, logo = false, play }) {
  return `<a class="card" href="${esc(href || '#')}" ${play ? `data-card-play="${esc(play)}"` : ''}>
    <img class="card-art ${round ? 'round' : ''} ${logo ? 'logo' : ''}" loading="lazy" src="${art(img)}" alt="">
    <div class="card-title">${esc(title)}</div>
    <div class="card-sub">${esc(sub || '')}</div>
    ${play ? `<span class="card-fab" data-card-play-btn>${icon('play')}</span>` : ''}
  </a>`;
}
const playlistCard = (p) => card({ href: `#/playlist/${encodeURIComponent(p.id)}`, img: p.artwork, title: p.name, sub: `${p.isAlbum ? 'Album' : 'Playlist'} · ${p.owner}`, play: `playlist:${p.id}` });
const artistCard = (a) => card({ href: `#/artist/${encodeURIComponent(a.id)}`, img: a.artwork, title: a.name, sub: `${a.followers.toLocaleString()} followers`, round: true });
function trackCards(tracks, context) {
  const lid = registerList(tracks, { context });
  return tracks.map((t, i) => card({ href: '#', img: t.artwork, title: t.title, sub: t.artist, play: `list:${lid}:${i}` })).join('');
}
function stationCards(stations, context = { name: 'Radio', href: '#/radio' }) {
  const lid = registerList(stations, { context });
  return stations.map((s, i) => card({ href: '#', img: s.artwork, title: s.title, sub: s.artist, logo: true, play: `list:${lid}:${i}` })).join('');
}
// Big gradient cards for live stations.
function liveCards(stations, context = { name: 'Radio', href: '#/radio' }) {
  const lid = registerList(stations, { context });
  return stations.map((s, i) => `
    <div class="live-card" style="--ch:${hueOf(s.title)}" data-card-play="list:${lid}:${i}" data-id="${esc(s.id)}" role="button" tabindex="0">
      <div class="lc-top"><img loading="lazy" src="${art(s.artwork)}" alt=""><span class="live-pill">LIVE</span></div>
      <div><div class="lc-name">${esc(s.title)}</div><div class="lc-sub">${esc(s.artist)}</div></div>
    </div>`).join('');
}
const tile = ({ href, title, sub, hue, ico = 'note' }) => `<a class="tile" href="${esc(href)}" style="--th:${hue}">${icon(ico)}${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</a>`;
const GENRES = ['Electronic', 'Hip-Hop/Rap', 'Pop', 'R&B/Soul', 'Rock', 'Alternative', 'House', 'Techno', 'Lo-Fi', 'Ambient', 'Jazz', 'Dubstep', 'Drum & Bass', 'Latin', 'Classical', 'Country', 'Reggae', 'Metal', 'Funk', 'Soundtrack'];
const genreTile = (g) => tile({ href: `#/genre/${encodeURIComponent(g)}`, title: g, hue: hueOf(g), ico: 'album' });
const section = (title, body, { ico, more } = {}) => `<section class="section"><div class="section-head"><h2 class="title-lg">${ico ? icon(ico) : ''}${title}</h2>${more || ''}</div>${body}</section>`;

// ================================================================ views
const main = $('#main');
let renderToken = 0;

function setView(html, hero) {
  main.innerHTML = `<div class="view">${html}</div>`;
  if (hero) main.querySelector('.hero')?.style.setProperty('--hero', hero);
  markPlayingRows();
}
const loading = () => setView('<div class="skeleton"></div><div class="section"><div class="skeleton" style="height:120px"></div></div>');
const failed = (e) => setView(`<div class="empty">Something went wrong: ${esc(e.message)}<br><br><button class="btn filled" onclick="location.reload()">Try again</button></div>`);
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Up late?' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const phoneActions = () => `<a class="icon-btn phone-only" href="#/settings" title="Settings">${icon('settings')}</a>`;
const topbar = (title, sub = '', extra = '', settings = true) => `<header class="topbar"><div class="grow"><h1 class="display">${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${extra}${settings ? phoneActions() : ''}</header>`;

async function viewHome(token) {
  const chips = [
    `<a class="chip" href="#/liked">${icon('heart-fill')}Liked Songs</a>`,
    ...library.recentCollections.slice(0, 8).map((c) => `<a class="chip img" href="${esc(c.href)}"><img src="${art(c.artwork)}" alt="">${esc(c.name)}</a>`),
  ].join('');
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const head = `${topbar(greeting(), today)}<div class="chips">${chips}</div>`;
  setView(`${head}<div class="skeleton"></div>`);
  const d = await api(`/api/home`);
  if (token !== renderToken) return;
  const onAir = [...d.onAir.hits.slice(0, 8), ...d.onAir.country.slice(0, 4)];
  const recent = library.recent.slice(0, 16);
  setView(`${head}
    ${onAir.length ? section('On the radio now', `<div class="row live-row">${liveCards(onAir, { name: 'On the radio', href: '#/radio' })}</div>`, { ico: 'live', more: '<a href="#/radio">All radio</a>' }) : ''}
    ${d.top.length ? section('Top songs right now', `${trackRows(d.top.slice(0, 5), { ranked: true, context: { name: 'Top 50', href: '#/chart/top' } })}
      <div class="chips" style="margin-top:12px">${d.charts.filter((c) => c.id !== 'top').map((c) => `<a class="chip" href="#/chart/${c.id}">${icon('chart')}${esc(c.name)}</a>`).join('')}</div>`, { ico: 'chart', more: '<a href="#/chart/top">See all</a>' }) : ''}
    ${d.countryChart.length ? section('Country chart', trackRows(d.countryChart.slice(0, 5), { ranked: true, context: { name: 'Country chart', href: '#/chart/country' } }), { ico: 'trending', more: '<a href="#/chart/country">See all</a>' }) : ''}
    <section class="section"><a class="kids-hero" href="#/kids" style="display:block;padding:20px 22px">
      <span class="blob b1"></span><span class="blob b3"></span>
      <h2 style="margin:0 0 4px;font-size:24px;font-weight:850">Kids corner</h2>
      <p style="margin:0">Ms Rachel, sing-alongs, kids radio and lullabies</p></a></section>
    ${recent.length ? section('Recently played', `<div class="row">${trackCards(recent, { name: 'Recently played', href: '#/library?tab=recent' })}</div>`, { ico: 'history' }) : ''}
    ${section('Fresh from independent artists', `<div class="row">${trackCards(d.trending.slice(0, 20), { name: 'Fresh on Audius', href: '#/genre/All' })}</div>`, { ico: 'trending', more: '<a href="#/genre/All">See all</a>' })}
    ${section('Popular playlists', `<div class="row">${d.playlists.map(playlistCard).join('')}</div>`)}
    ${section('Genres & moods', `<div class="tiles">${d.genres.map(genreTile).join('')}</div>`)}
    <p class="note" style="margin-top:36px">Music from <a href="https://audius.co" target="_blank" rel="noopener">Audius</a> (full songs), Apple Music charts (previews),
    <a href="https://www.radio-browser.info" target="_blank" rel="noopener">radio-browser.info</a> (live radio) and official YouTube channels. Lyrics from LRCLIB.</p>`);
}

let searchTab = 'all', searchData = null, searchTerm = '';
let exploreCache = null;
async function viewSearch(token, params) {
  const q = params.get('q') || '';
  setView(`<div class="searchbar"><label class="search-field">${icon('search')}<input id="search-input" type="search" placeholder="Songs, artists, radio stations…" value="${esc(q)}" autocomplete="off" enterkeyhint="search"></label></div>
    <div id="search-results"></div>`);
  const input = $('#search-input');
  if (!isPhone() || q) input.focus();
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { history.replaceState(null, '', `#/search?q=${encodeURIComponent(input.value.trim())}`); runSearch(input.value.trim()); }, 300);
  });
  runSearch(q);
}
async function runSearch(q) {
  const box = $('#search-results');
  if (!box) return;
  if (!q) {
    exploreCache = exploreCache || await Promise.all([api('/api/charts'), api('/api/onair')]).catch(() => [[], []]);
    if (!$('#search-results')) return;
    const [charts, formats] = exploreCache;
    box.innerHTML = section('Charts', `<div class="tiles">${charts.map((c) => tile({ href: `#/chart/${c.id}`, title: c.name, sub: 'Top songs', hue: c.hue, ico: 'chart' })).join('')}</div>`)
      + section('On the radio', `<div class="tiles">${formats.map((f) => tile({ href: `#/radio?f=${f.id}`, title: f.name, sub: 'Live', hue: hueOf(f.name), ico: 'radio' })).join('')}</div>`)
      + section('Genres', `<div class="tiles">${GENRES.map(genreTile).join('')}</div>`);
    return;
  }
  if (q !== searchTerm) {
    searchTerm = q;
    box.innerHTML = '<div class="skeleton"></div>';
    const key = library.settings.youtubeKey;
    try { searchData = await api(`/api/search?q=${encodeURIComponent(q)}${key ? `&yt=${encodeURIComponent(key)}` : ''}`); } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    if (q !== searchTerm) return;
  }
  renderSearch();
}
function renderSearch() {
  const box = $('#search-results');
  const d = searchData;
  if (!box || !d) return;
  const tabs = [['all', 'All'], ['tracks', 'Full songs'], ['previews', 'Hits (previews)'], ...(d.videos?.length ? [['videos', 'Videos']] : []), ['artists', 'Artists'], ['playlists', 'Playlists'], ['radio', 'Radio']];
  const ctx = { name: `“${searchTerm}”`, href: `#/search?q=${encodeURIComponent(searchTerm)}` };
  let html = `<div class="chips">${tabs.map(([k, l]) => `<button class="chip ${searchTab === k ? 'selected' : ''}" data-search-tab="${k}">${searchTab === k ? icon('check') : ''}${l}</button>`).join('')}</div>`;
  const total = d.tracks.length + d.previews.length + d.playlists.length + d.artists.length + d.radio.length + (d.videos?.length || 0);
  if (!total) html += `<div class="empty">No results for “${esc(searchTerm)}”.</div>`;
  else if (searchTab === 'all') {
    const exactArtist = d.artists[0] && d.artists[0].name.toLowerCase() === searchTerm.toLowerCase();
    const topTrack = d.previews[0] || d.tracks[0];
    const topLid = !exactArtist && topTrack ? registerList([topTrack], { context: ctx }) : null;
    const songs = [...d.previews.slice(0, 3), ...d.tracks.slice(0, 3)];
    html += `<div class="split">
      <div>${section('Top result', exactArtist
        ? `<a class="top-result" href="#/artist/${encodeURIComponent(d.artists[0].id)}"><img src="${art(d.artists[0].artwork)}" style="border-radius:50%" alt=""><div class="headline">${esc(d.artists[0].name)}</div><div class="note">Artist</div></a>`
        : topTrack ? `<div class="top-result" data-card-play="list:${topLid}:0"><img src="${art(topTrack.artwork)}" alt=""><div class="headline">${esc(topTrack.title)}</div><div class="note">${badgeHtml(topTrack)}${esc(topTrack.artist)}</div><span class="fab primary">${icon('play')}</span></div>` : '')}</div>
      <div>${section('Songs', trackRows(songs, { context: ctx }))}</div>
    </div>
    ${d.videos?.length ? section('Videos', trackRows(d.videos.slice(0, 5), { context: ctx }), { ico: 'video' }) : ''}
    ${d.tracks.length > 3 ? section('Full songs from independent artists', trackRows(d.tracks.slice(3, 9), { context: ctx })) : ''}
    ${d.artists.length ? section('Artists', `<div class="row">${d.artists.slice(0, 10).map(artistCard).join('')}</div>`) : ''}
    ${d.playlists.length ? section('Playlists', `<div class="row">${d.playlists.slice(0, 10).map(playlistCard).join('')}</div>`) : ''}
    ${d.radio.length ? section('Radio stations', `<div class="row">${stationCards(d.radio.slice(0, 10))}</div>`) : ''}`;
  } else if (searchTab === 'tracks') html += trackRows(d.tracks, { context: ctx });
  else if (searchTab === 'previews') html += `<p class="note">Major-label songs can only be streamed as 30-second previews outside the licensed apps. Use ⋯ → “Hear the full song” to open the full version.</p>${trackRows(d.previews, { context: ctx })}`;
  else if (searchTab === 'videos') html += trackRows(d.videos || [], { context: ctx });
  else if (searchTab === 'playlists') html += `<div class="grid">${d.playlists.map(playlistCard).join('')}</div>`;
  else if (searchTab === 'artists') html += `<div class="grid">${d.artists.map(artistCard).join('')}</div>`;
  else if (searchTab === 'radio') html += `<div class="grid">${stationCards(d.radio)}</div>`;
  box.innerHTML = html;
  markPlayingRows();
}

function collectionView({ kicker, title, sub, artwork, round, iconArt, tracks, context, extra = '', actions = '', playlistId, ranked = false }) {
  const lid = registerList(tracks, { context });
  return `<div class="hero">${iconArt ? `<div class="hero-art icon-art">${icon(iconArt)}</div>` : `<img class="hero-art ${round ? 'round' : ''}" src="${art(artwork)}" alt="">`}
    <div><div class="label">${esc(kicker)}</div><h1 class="display">${esc(title)}</h1><div class="hero-sub">${sub}</div></div></div>
    <div class="actions">
      ${tracks.length ? `<button class="fab primary" data-card-play="list:${lid}:0" title="Play">${icon('play')}</button>
      <button class="icon-btn tonal" data-action="shuffle-play" data-list="${lid}" title="Shuffle">${icon('shuffle')}</button>` : ''}
      ${actions}
    </div>
    ${extra}
    ${trackRows(tracks, { list: lid, context, playlistId, ranked })}`;
}

async function viewChart(token, id) {
  const c = await api(`/api/chart/${encodeURIComponent(id || 'top')}`);
  if (token !== renderToken) return;
  setView(collectionView({
    kicker: 'Chart · updated daily', title: c.id === 'top' ? 'Top 50' : `Top ${c.name}`, artwork: c.tracks[0]?.artwork, tracks: c.tracks, ranked: true,
    context: { name: c.id === 'top' ? 'Top 50' : `Top ${c.name}`, href: `#/chart/${c.id}` },
    sub: `The most popular ${c.id === 'top' ? '' : `${esc(c.name)} `}songs right now · 30-second previews`,
    extra: `<p class="note">Want the full songs? Tap ⋯ → “Hear the full song”, or <a href="#/radio?f=${c.id === 'country' ? 'country' : c.id === 'hiphop' || c.id === 'rnb' ? 'hiphop' : c.id === 'christian' ? 'christian' : c.id === 'kids' ? 'kids' : 'hits'}">listen live on the radio</a>.</p>`,
  }), `hsl(${c.hue} 50% 30% / .7)`);
}

async function viewPlaylist(token, id) {
  const p = await api(`/api/playlist/${encodeURIComponent(id)}`);
  if (token !== renderToken) return;
  const href = `#/playlist/${encodeURIComponent(id)}`;
  pushRecentCollection({ href, name: p.name, artwork: p.artwork });
  const dur = p.tracks.reduce((s, t) => s + t.duration, 0);
  setView(collectionView({
    kicker: p.isAlbum ? 'Album' : 'Playlist', title: p.name, artwork: p.artwork, tracks: p.tracks, context: { name: p.name, href },
    sub: `<b>${esc(p.owner)}</b> · ${p.tracks.length} songs, ${fmt(dur)}`,
    extra: p.description ? `<p class="note">${esc(p.description)}</p>` : '',
    actions: `<button class="icon-btn" data-action="save-playlist" data-list-save="${esc(p.name)}" title="Save to your library">${icon('add-list')}</button>`,
  }), `hsl(${hueOf(p.name)} 45% 30% / .7)`);
}

async function viewArtist(token, id) {
  const a = await api(`/api/artist/${encodeURIComponent(id)}`);
  if (token !== renderToken) return;
  const href = `#/artist/${encodeURIComponent(id)}`;
  pushRecentCollection({ href, name: a.name, artwork: a.artwork });
  setView(collectionView({
    kicker: a.verified ? 'Verified artist' : 'Artist', title: a.name, artwork: a.artwork, round: true, tracks: a.tracks,
    context: { name: a.name, href }, sub: `${a.followers.toLocaleString()} followers · @${esc(a.handle)}`,
    extra: a.bio ? `<p class="note" style="max-width:720px">${esc(a.bio)}</p>` : '',
  }), `hsl(${hueOf(a.name)} 40% 30% / .7)`);
}

async function viewGenre(token, name) {
  if (name === 'All') {
    const d = await api('/api/home');
    if (token !== renderToken) return;
    return setView(collectionView({ kicker: 'Audius', title: 'Fresh this week', artwork: d.trending[0]?.artwork, tracks: d.trending, context: { name: 'Fresh this week', href: '#/genre/All' }, sub: 'Trending full-length songs from independent artists' }));
  }
  const d = await api(`/api/genre/${encodeURIComponent(name)}`);
  if (token !== renderToken) return;
  const href = `#/genre/${encodeURIComponent(name)}`;
  setView(collectionView({
    kicker: 'Genre mix', title: name, artwork: d.tracks[0]?.artwork, tracks: d.tracks, context: { name: `${name} mix`, href },
    sub: `${d.tracks.length} full-length songs`,
    extra: d.radio.length ? `${section(`${esc(name)} on the radio`, `<div class="row live-row">${liveCards(d.radio.slice(0, 10))}</div>`, { ico: 'live' })}<div class="section"></div>` : '',
  }), `hsl(${hueOf(name)} 55% 35% / .7)`);
}

let radioFormats = null;
async function viewRadio(token, params) {
  const f = params.get('f') || 'hits';
  radioFormats = radioFormats || await api('/api/onair').catch(() => []);
  const chips = [...radioFormats.map((x) => [x.id, x.name]), ['world', 'Popular worldwide']];
  const head = `${topbar('Radio', 'Live stations playing right now')}
    <div class="chips">${chips.map(([id, n]) => `<a class="chip ${id === f ? 'selected' : ''}" href="#/radio?f=${id}">${id === f ? icon('check') : ''}${esc(n)}</a>`).join('')}</div>`;
  setView(`${head}<div class="skeleton"></div>`);
  const stations = f === 'world' ? await api('/api/radio') : (await api(`/api/onair/${encodeURIComponent(f)}`)).stations;
  if (token !== renderToken) return;
  const name = chips.find(([id]) => id === f)?.[1] || 'Radio';
  setView(`${head}<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${liveCards(stations, { name: `${name} radio`, href: `#/radio?f=${f}` })}</div>
    ${stations.length ? '' : '<div class="empty">No stations found.</div>'}`);
}

let kidsCache = null;
async function viewKids(token, arg) {
  if (arg) return viewKidsChannel(token, arg);
  const head = `<div class="kids-hero"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>
    <h1>Kids corner</h1><p>Sing-alongs, nursery rhymes, kids radio and bedtime songs.</p>
    <div class="btns"><button class="btn" data-action="kids-radio">${icon('radio')}Kids radio</button><button class="btn light" data-action="kids-shuffle">${icon('shuffle')}Shuffle songs</button></div></div>`;
  if (!kidsCache) setView(`${head}<div class="section"><div class="skeleton"></div></div>`);
  kidsCache = kidsCache || await api('/api/kids');
  if (token !== renderToken) return;
  const k = kidsCache;
  setView(`${head}
    ${section('Watch & sing', `<div class="channel-tiles">${k.channels.map((c) => `<a class="channel" href="#/kids/${encodeURIComponent(c.id)}" style="--ch:${c.hue}">${icon('video')}<b>${esc(c.name)}</b><small>${esc(c.blurb)}</small></a>`).join('')}</div>`, { ico: 'video' })}
    ${k.msRachel.length ? section('Ms Rachel songs', trackRows(k.msRachel.slice(0, 8), { context: { name: 'Ms Rachel', href: '#/kids' } }), { ico: 'note' }) : ''}
    ${k.radio.length ? section('Kids radio', `<div class="row live-row">${liveCards(k.radio, { name: 'Kids radio', href: '#/kids' })}</div>`, { ico: 'live' }) : ''}
    ${k.songs.length ? section('Top kids songs', trackRows(k.songs.slice(0, 10), { ranked: true, context: { name: 'Top kids songs', href: '#/chart/kids' } }), { ico: 'chart', more: '<a href="#/chart/kids">See all</a>' }) : ''}
    ${k.lullabies.length ? section('Bedtime', `<div class="row live-row">${liveCards(k.lullabies, { name: 'Lullabies', href: '#/kids' })}</div>`, { ico: 'bed' }) : ''}
    <p class="note" style="margin-top:28px">Videos play in YouTube's own player from each show's official channel. Songs from the kids chart are 30-second previews; kids radio plays full songs.</p>`);
}

async function viewKidsChannel(token, id) {
  const meta = kidsCache?.channels.find((c) => c.id === id);
  setView(`<div class="hero"><div class="hero-art icon-art" style="background:hsl(${meta?.hue ?? 200} 70% 55%);color:#fff">${icon('video')}</div><div><div class="label">Watch & sing</div><h1 class="display">${esc(meta?.name || 'Channel')}</h1></div></div><div class="skeleton"></div>`, `hsl(${meta?.hue ?? 200} 70% 50% / .6)`);
  const ch = await api(`/api/youtube/channel/${encodeURIComponent(id)}`);
  if (token !== renderToken) return;
  const lid = registerList(ch.videos, { context: { name: meta?.name || ch.name, href: `#/kids/${id}` } });
  setView(`<div class="hero"><div class="hero-art icon-art" style="background:hsl(${meta?.hue ?? 200} 70% 55%);color:#fff">${icon('video')}</div>
    <div><div class="label">Watch & sing</div><h1 class="display">${esc(meta?.name || ch.name)}</h1><div class="hero-sub">${esc(meta?.blurb || '')} · latest ${ch.videos.length} videos</div></div></div>
    <div class="actions"><button class="fab extended primary" data-card-play="list:${lid}:0">${icon('play')}Play all</button></div>
    <div class="video-grid">${ch.videos.map((v, i) => `<div class="video-card" data-card-play="list:${lid}:${i}" role="button" tabindex="0"><img loading="lazy" src="${art(v.artwork)}" alt=""><div class="card-title">${esc(v.title)}</div></div>`).join('')}</div>`,
  `hsl(${meta?.hue ?? 200} 70% 50% / .6)`);
}

function viewLibrary(token, params) {
  const tab = params.get('tab') || 'playlists';
  const tabs = [['playlists', 'Playlists'], ['liked', 'Liked'], ['recent', 'Recently played']];
  let body;
  if (tab === 'playlists') {
    body = `<div class="grid">
      <a class="card" href="#/liked"><div class="card-art hero-art icon-art" style="width:100%;height:auto;box-shadow:none">${icon('heart-fill')}</div><div class="card-title">Liked Songs</div><div class="card-sub">${library.liked.length} songs</div></a>
      ${library.playlists.map((p) => card({ href: `#/my/${p.id}`, img: p.tracks[0]?.artwork, title: p.name, sub: `${p.tracks.length} songs` })).join('')}
    </div>
    <div class="actions" style="justify-content:flex-end;margin-top:20px"><button class="fab extended" data-action="new-playlist">${icon('plus')}New playlist</button></div>`;
  } else if (tab === 'liked') body = trackRows(library.liked, { context: { name: 'Liked Songs', href: '#/liked' } });
  else body = trackRows(library.recent, { context: { name: 'Recently played', href: '#/library?tab=recent' } });
  setView(`${topbar('Library')}
    <div class="chips">${tabs.map(([k, l]) => `<a class="chip ${k === tab ? 'selected' : ''}" href="#/library?tab=${k}">${k === tab ? icon('check') : ''}${l}</a>`).join('')}</div>
    ${body}`);
}

function viewLiked() {
  setView(collectionView({ kicker: 'Playlist', title: 'Liked Songs', iconArt: 'heart-fill', tracks: library.liked, context: { name: 'Liked Songs', href: '#/liked' }, sub: `${library.liked.length} songs` }));
}

function viewMyPlaylist(token, id) {
  const p = library.playlists.find((x) => x.id === id);
  if (!p) return setView('<div class="empty">Playlist not found.</div>');
  setView(collectionView({
    kicker: 'Your playlist', title: p.name, artwork: p.tracks[0]?.artwork, tracks: p.tracks, context: { name: p.name, href: `#/my/${id}` }, playlistId: p.id,
    sub: `${p.tracks.length} songs, ${fmt(p.tracks.reduce((s, t) => s + (t.duration || 0), 0))}`,
    extra: p.tracks.length ? '' : '<p class="note">Add songs with the ⋮ menu on any song.</p>',
    actions: `<button class="icon-btn" data-action="rename-playlist" data-pid="${p.id}" title="Rename">${icon('edit')}</button>
      <button class="icon-btn" data-action="delete-playlist" data-pid="${p.id}" title="Delete">${icon('trash')}</button>`,
  }), `hsl(${hueOf(p.name)} 45% 30% / .7)`);
}

function viewSettings() {
  const s = library.settings;
  const eq = s.eq;
  const theme = s.theme || 'system';
  const sonosIntro = {
    native: 'Your phone talks to Sonos directly over Wi-Fi. No Sonos account needed.',
    server: 'The Encore server talks to Sonos over your home network. No Sonos account needed.',
    direct: 'Websites can\'t reach speakers on your home network. Use the Android app or the Encore server to play on Sonos.',
  }[MODE];
  setView(`${topbar('Settings', '', '', false)}<div class="settings">
    <div class="group"><span class="label">Appearance</span>
      <div class="setting">${icon('palette')}<div class="txt"><b>Theme</b></div>
        <div class="segmented">${[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button class="${theme === k ? 'on' : ''}" data-theme-set="${k}">${theme === k ? icon('check') : ''}${l}</button>`).join('')}</div></div>
      <label class="setting">${icon('album')}<div class="txt"><b>Colors from album art</b><small>The app takes its colors from what's playing</small></div>
        <span class="switch"><input type="checkbox" data-setting="dynamicColor" ${s.dynamicColor !== false ? 'checked' : ''}><i></i></span></label>
    </div>
    <div class="group"><span class="label">Sonos</span>
      <div class="setting">${icon('speaker')}<div class="txt"><small>${sonosIntro}</small></div></div>
      ${canCast ? `<div id="sonos-groups"><div class="setting-body note">Searching…</div></div>
      <div class="setting-body field"><input type="text" class="text-field" id="sonos-ip" inputmode="decimal" placeholder="Add a speaker by IP (e.g. 192.168.1.40)"><button class="btn tonal" data-action="sonos-add">Add</button><button class="btn text" data-action="sonos-refresh">${icon('refresh')}Search again</button></div>` : ''}
    </div>
    <div class="group"><span class="label">YouTube</span>
      <div class="setting">${icon('video')}<div class="txt"><b>YouTube search</b><small>Kids channels work without this. To search all of YouTube for music videos, add a free YouTube Data API key.
        <a href="https://developers.google.com/youtube/v3/getting-started" target="_blank" rel="noopener">How to get one</a></small></div></div>
      <div class="setting-body field"><input type="text" class="text-field" id="yt-key" placeholder="YouTube API key" value="${esc(s.youtubeKey || '')}" autocomplete="off" spellcheck="false"><button class="btn tonal" data-action="save-yt-key">Save</button></div>
    </div>
    ${MODE === 'native' ? `<div class="group"><span class="label">Android Auto</span>
      <div class="setting">${icon('headphones')}<div class="txt"><small>Encore shows up in Android Auto with your Liked Songs, playlists, the radio, charts and a Kids folder. Because it isn't from the Play Store, turn on Android Auto's developer settings once: open Android Auto settings, tap <b>Version</b> 10 times, then ⋮ → <b>Developer settings</b> → <b>Unknown sources</b>.</small></div></div></div>` : ''}
    ${EQ_SUPPORTED ? `<div class="group"><span class="label">Equalizer</span>
      <div class="setting-body"><p class="note" style="margin:0 0 12px">Applies to this ${MODE === 'native' ? 'phone' : 'device'}. Use the Sonos app for speaker EQ.</p>
      <div class="chips">${Object.keys(EQ_PRESETS).map((n) => `<button class="chip ${s.eqPreset === n ? 'selected' : ''}" data-eq-preset="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <div class="eq">${EQ_FREQS.map((f, i) => `<div class="eq-band"><span data-eq-val="${i}">${eq[i] > 0 ? '+' : ''}${eq[i]}</span><input class="slider vertical" type="range" min="-12" max="12" step="1" value="${eq[i]}" data-eq="${i}" aria-label="${f} Hz"><span>${f >= 1000 ? `${f / 1000}k` : f}</span></div>`).join('')}</div></div>
    </div>` : ''}
    <div class="group desktop-only"><span class="label">Keyboard shortcuts</span><div class="setting-body">
      <div class="kbd"><kbd>Space</kbd>Play / pause<kbd>→ / ←</kbd>Seek 10 seconds<kbd>Shift + → / ←</kbd>Next / previous<kbd>↑ / ↓</kbd>Volume<kbd>M</kbd>Mute<kbd>S</kbd>Shuffle<kbd>R</kbd>Repeat<kbd>L</kbd>Like<kbd>/</kbd>Search</div></div></div>
    <div class="group"><span class="label">Your data</span>
      <div class="setting">${icon('library')}<div class="txt"><small>${MODE === 'server' ? 'Likes and playlists are saved on the Encore server, so they follow you between devices at home.' : `Likes and playlists are saved on this ${MODE === 'native' ? 'phone' : 'browser'}.`}</small></div></div>
      <div class="setting-body field"><button class="btn tonal" data-action="export-library">Export library</button><button class="btn text" data-action="import-library">Import library</button></div>
    </div>
    <p class="note" style="text-align:center">Encore · full songs from Audius · charts from Apple Music · radio from radio-browser.info · videos from official YouTube channels · lyrics from LRCLIB</p>
  </div>`);
  $$('[data-eq]', main).forEach(setRangePct);
  if (canCast) renderSonosSettings(false);
}

async function renderSonosSettings(refresh) {
  const box = $('#sonos-groups');
  if (!box) return;
  let data;
  try { data = await fetchGroups(refresh || !groupsCache); } catch (e) { box.innerHTML = `<div class="setting-body note">${esc(e.message)}</div>`; return; }
  if (!$('#sonos-groups')) return;
  if (!data.groups.length) {
    box.innerHTML = `<div class="setting-body note">No speakers found yet. ${MODE === 'server'
      ? `Make sure this server is on the same network as your speakers. They stream from <b>${esc(data.publicUrl)}</b>.`
      : 'Make sure your phone is on the same Wi-Fi as your speakers (not mobile data or a guest network).'}</div>`;
    return;
  }
  const all = data.groups.flatMap((g) => g.members.map((m) => ({ ...m, group: g })));
  box.innerHTML = data.groups.map((g) => `
    <div class="speaker-row"><span class="lead">${icon(g.members.length > 1 ? 'group' : 'speaker')}</span>
      <div class="txt"><b>${esc(g.name)}</b><small>${g.members.length > 1 ? 'Group' : 'Speaker'} · ${esc(g.host)}</small></div>
      <button class="btn ${player.cast?.id === g.id ? 'filled' : 'tonal'}" data-cast-group="${esc(g.id)}">${player.cast?.id === g.id ? 'Playing' : 'Play here'}</button></div>
    <div class="speaker-actions">
      ${g.members.length > 1 ? g.members.slice(1).map((m) => `<button class="chip" data-sonos-leave="${esc(m.uuid)}">${icon('close')}${esc(m.name)}</button>`).join('') : ''}
      ${all.filter((m) => m.group !== g && m.group.members.length === 1).map((m) => `<button class="chip" data-sonos-join="${esc(m.uuid)}" data-coordinator="${esc(g.id)}">${icon('plus')}${esc(m.name)}</button>`).join('')}
    </div>`).join('');
}

// ================================================================ router
const routes = {
  home: viewHome, search: viewSearch, playlist: viewPlaylist, artist: viewArtist, genre: viewGenre, radio: viewRadio, kids: viewKids,
  chart: viewChart, library: viewLibrary, liked: viewLiked, my: viewMyPlaylist, settings: viewSettings,
};
const NAV_ICONS = { home: 'home', search: 'explore', radio: 'radio', kids: 'kids', library: 'library', settings: 'settings' };
async function route() {
  const [pathPart, query = ''] = (location.hash.slice(1) || '/home').split('?');
  const [, name = 'home', ...rest] = pathPart.split('/');
  const arg = decodeURIComponent(rest.join('/'));
  const params = new URLSearchParams(query);
  const token = ++renderToken;
  closePopover();
  closeSheet();
  const section = { liked: 'library', my: 'library', playlist: 'home', artist: 'search', genre: 'search', chart: 'search' }[name] || name;
  $$('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === section;
    a.classList.toggle('active', on);
    const base = NAV_ICONS[a.dataset.nav];
    const svg = $('svg', a);
    if (svg && ICONS[`${base}-fill`]) { svg.dataset.icon = on ? `${base}-fill` : base; hydrateIcons(a); }
  });
  if (name !== 'search') main.scrollTop = 0;
  if (isPhone()) $('#app').classList.add('panel-closed');
  const view = routes[name] || viewHome;
  if (['playlist', 'artist', 'genre', 'chart'].includes(name)) loading();
  try { await view(token, ['search', 'radio', 'library'].includes(name) ? params : arg); } catch (e) { if (token === renderToken) failed(e); }
}
window.addEventListener('hashchange', route);
function renderSidebar() {}

// ================================================================ menus (bottom sheets on phones)
const popover = $('#popover');
const backdrop = $('#backdrop');
function openPopover(anchor, html, dir = 'down') {
  popover.innerHTML = html;
  popover.hidden = false;
  backdrop.hidden = !isPhone();
  positionPopover(anchor, dir);
  return popover;
}
function positionPopover(anchor, dir) {
  if (isPhone()) { popover.style.left = popover.style.top = ''; return; }
  const r = anchor.getBoundingClientRect();
  const pw = popover.offsetWidth, ph = popover.offsetHeight;
  const left = Math.min(window.innerWidth - pw - 8, Math.max(8, r.right - pw));
  let top = dir === 'up' ? r.top - ph - 8 : r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  if (top < 8) top = Math.min(window.innerHeight - ph - 8, r.bottom + 6);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}
function closePopover() {
  popover.hidden = true;
  backdrop.hidden = true;
  popover.innerHTML = '';
}

function openTrackMenu(anchor, track, { playlistId, index, queueIndex } = {}) {
  const pls = library.playlists;
  const pop = openPopover(anchor, `
    <div class="menu-track"><img src="${art(track.artwork)}" alt=""><div class="clip"><div class="t-title">${esc(track.title)}</div><div class="t-artist">${esc(track.artist)}</div></div></div>
    <button class="menu-item" data-m="like">${icon(isLiked(track.id) ? 'heart-fill' : 'heart')}${isLiked(track.id) ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</button>
    ${track.kind === 'video' ? '' : queueIndex != null ? `<button class="menu-item" data-m="unqueue">${icon('close')}Remove from queue</button>` : `
    <button class="menu-item" data-m="next">${icon('play-next')}Play next</button>
    <button class="menu-item" data-m="queue">${icon('queue')}Add to queue</button>`}
    <div class="menu-sep"></div>
    <span class="menu-head label">Add to playlist</span>
    <button class="menu-item" data-m="newpl">${icon('plus')}New playlist</button>
    ${pls.map((p) => `<button class="menu-item" data-m="pl" data-pid="${p.id}">${icon('add-list')}${esc(p.name)}</button>`).join('')}
    ${playlistId ? `<div class="menu-sep"></div><button class="menu-item" data-m="remove">${icon('trash')}Remove from this playlist</button>` : ''}
    <div class="menu-sep"></div>
    ${track.kind === 'preview' ? `<button class="menu-item" data-m="findfull">${icon('search')}Find full-length versions</button>` : ''}
    ${track.artistId ? `<a class="menu-item" href="#/artist/${encodeURIComponent(track.artistId)}">${icon('user')}Go to artist</a>` : ''}
    ${track.genre && track.source === 'audius' ? `<a class="menu-item" href="#/genre/${encodeURIComponent(track.genre)}">${icon('album')}${esc(track.genre)} mix</a>` : ''}
    ${track.externalUrl ? `<a class="menu-item" href="${esc(track.externalUrl)}" target="_blank" rel="noopener">${icon('external')}${track.kind === 'video' ? 'Open in YouTube' : 'Hear the full song'}</a>` : ''}`);
  pop.onclick = (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) { if (e.target.closest('a')) closePopover(); return; }
    const m = b.dataset.m;
    if (m === 'next') addToQueue([track], true);
    else if (m === 'queue') addToQueue([track]);
    else if (m === 'unqueue') removeFromQueue(queueIndex);
    else if (m === 'like') toggleLike(track);
    else if (m === 'newpl') { const p = createPlaylist(null, [track]); toast(`Created ${p.name}`); }
    else if (m === 'pl') addToPlaylist(b.dataset.pid, [track]);
    else if (m === 'findfull') location.hash = `#/search?q=${encodeURIComponent(`${track.title} ${track.artist}`)}`;
    else if (m === 'remove') {
      const p = library.playlists.find((x) => x.id === playlistId);
      if (p) { p.tracks.splice(index, 1); saveLibrary(); route(); }
    }
    closePopover();
  };
}

// ================================================================ events
backdrop.addEventListener('click', closePopover);
// Broken artwork (dead mirrors, missing station logos) falls back to a placeholder.
document.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG' && e.target.src !== ART_FALLBACK) e.target.src = ART_FALLBACK;
}, true);

document.addEventListener('click', (e) => {
  const t = e.target;
  if (!popover.hidden && !popover.contains(t) && !t.closest('[data-action=cast],[data-action=sleep],[data-more],[data-action=more-current]')) closePopover();

  const more = t.closest('[data-more]');
  if (more) {
    e.preventDefault();
    const row = more.closest('.track');
    const track = trackFromRow(row);
    const i = Number(row.dataset.i);
    if (track) openTrackMenu(more, track, { playlistId: row.dataset.playlist, index: i, queueIndex: row.dataset.list === 'q' ? i : null });
    return;
  }
  const like = t.closest('[data-like]');
  if (like) { toggleLike(trackFromRow(like.closest('.track'))); return; }
  const playRow = t.closest('[data-play-row]');
  if (playRow) { playFromRow(playRow.closest('.track')); return; }
  const vid = t.closest('[data-video-i]');
  if (vid) { video.index = Number(vid.dataset.videoI); renderVideo(); return; }

  const cardPlay = t.closest('[data-card-play]');
  if (cardPlay && (t.closest('[data-card-play-btn]') || !cardPlay.matches('a') || cardPlay.getAttribute('href') === '#')) {
    e.preventDefault();
    const [kind, a, b] = cardPlay.dataset.cardPlay.split(':');
    if (kind === 'list') { const l = lists.get(a); if (l) playList(l.tracks, Number(b), l.context); }
    else if (kind === 'playlist') {
      const id = cardPlay.dataset.cardPlay.slice('playlist:'.length);
      api(`/api/playlist/${encodeURIComponent(id)}`).then((p) => playList(p.tracks, 0, { name: p.name, href: `#/playlist/${encodeURIComponent(id)}` })).catch((err) => toast(err.message));
    }
    return;
  }

  const seekLine = t.closest('[data-seek]');
  if (seekLine) { seek(Number(seekLine.dataset.seek)); if (!player.playing) togglePlay(); return; }
  const searchFor = t.closest('[data-search-for]');
  if (searchFor) { closeSheet(); location.hash = `#/search?q=${encodeURIComponent(searchFor.dataset.searchFor)}`; return; }

  const panelBtn = t.closest('[data-panel]');
  if (panelBtn) { panelTab = panelBtn.dataset.panel; renderPanel(); return; }
  const panelOpen = t.closest('[data-panel-open]');
  if (panelOpen) { openPanel(panelOpen.dataset.panelOpen); return; }
  const sheetTabBtn = t.closest('[data-sheet-tab]');
  if (sheetTabBtn) { sheetTab = sheetTabBtn.dataset.sheetTab; renderSheetExtra(); return; }
  // Tapping the mini player opens the full-screen player.
  if (isPhone() && t.closest('.player') && !t.closest('button')) { openSheet(); return; }
  // On desktop, clicking the song in the player bar opens the Now Playing panel.
  if (!isPhone() && t.closest('.player-meta, .player-art')) { openPanel('now'); return; }

  const tab = t.closest('[data-search-tab]');
  if (tab) { searchTab = tab.dataset.searchTab; renderSearch(); return; }

  const themeBtn = t.closest('[data-theme-set]');
  if (themeBtn) { library.settings.theme = themeBtn.dataset.themeSet; applyTheme(); saveLibrary(); route(); return; }

  const preset = t.closest('[data-eq-preset]');
  if (preset) {
    library.settings.eqPreset = preset.dataset.eqPreset;
    library.settings.eq = EQ_PRESETS[preset.dataset.eqPreset].slice();
    engine.setEqualizer(library.settings.eq);
    saveLibrary();
    route();
    return;
  }

  const castGroup = t.closest('[data-cast-group]');
  if (castGroup) {
    const g = groupsCache?.groups.find((x) => x.id === castGroup.dataset.castGroup);
    if (g) { startCast(g); setTimeout(() => renderSonosSettings(false), 300); }
    return;
  }
  const join = t.closest('[data-sonos-join]');
  if (join) {
    api('/api/sonos/join', { method: 'POST', body: { member: join.dataset.sonosJoin, coordinator: join.dataset.coordinator } })
      .then((d) => { groupsCache = { ...groupsCache, ...d }; renderSonosSettings(false); toast('Speakers grouped'); }).catch((err) => toast(err.message));
    return;
  }
  const leave = t.closest('[data-sonos-leave]');
  if (leave) {
    api('/api/sonos/leave', { method: 'POST', body: { member: leave.dataset.sonosLeave } })
      .then((d) => { groupsCache = { ...groupsCache, ...d }; renderSonosSettings(false); toast('Speaker ungrouped'); }).catch((err) => toast(err.message));
    return;
  }

  const action = t.closest('[data-action]');
  if (!action) return;
  const a = action.dataset.action;
  if (a === 'toggle') togglePlay();
  else if (a === 'next') next();
  else if (a === 'prev') prev();
  else if (a === 'shuffle') toggleShuffle();
  else if (a === 'repeat') cycleRepeat();
  else if (a === 'like-current') toggleLike(current());
  else if (a === 'more-current') { if (current()) openTrackMenu(action, current()); }
  else if (a === 'mute') toggleMute();
  else if (a === 'cast') popover.hidden ? openCastPicker(action) : closePopover();
  else if (a === 'sleep') popover.hidden ? openSleepMenu(action) : closePopover();
  else if (a === 'close-sheet') closeSheet();
  else if (a === 'close-video') closeVideo();
  else if (a === 'toggle-panel') $('#app').classList.toggle('panel-closed');
  else if (a === 'new-playlist') { const p = createPlaylist(); location.hash = `#/my/${p.id}`; }
  else if (a === 'kids-radio') { if (kidsCache?.radio.length) playList(kidsCache.radio, 0, { name: 'Kids radio', href: '#/kids' }); }
  else if (a === 'kids-shuffle') {
    const songs = [...(kidsCache?.msRachel || []), ...(kidsCache?.songs || [])];
    if (songs.length) { player.shuffle = true; playList(songs, Math.floor(Math.random() * songs.length), { name: 'Kids songs', href: '#/kids' }); updatePlayerUI(); }
  } else if (a === 'shuffle-play') {
    const l = lists.get(action.dataset.list);
    if (l) { player.shuffle = true; playList(l.tracks, Math.floor(Math.random() * l.tracks.length), l.context); updatePlayerUI(); }
  } else if (a === 'save-playlist') {
    const l = lists.get($('.fab[data-card-play]', main)?.dataset.cardPlay.split(':')[1]);
    if (l) { const p = createPlaylist(action.dataset.listSave, l.tracks); toast(`Saved “${p.name}” to your library`); }
  } else if (a === 'rename-playlist') {
    const p = library.playlists.find((x) => x.id === action.dataset.pid);
    const name = p && prompt('Playlist name', p.name);
    if (name) { p.name = name.trim() || p.name; saveLibrary(); route(); }
  } else if (a === 'delete-playlist') {
    const p = library.playlists.find((x) => x.id === action.dataset.pid);
    if (p && confirm(`Delete “${p.name}”?`)) { library.playlists = library.playlists.filter((x) => x !== p); saveLibrary(); location.hash = '#/library'; }
  } else if (a === 'save-yt-key') {
    library.settings.youtubeKey = $('#yt-key').value.trim();
    saveLibrary();
    searchTerm = '';
    toast(library.settings.youtubeKey ? 'YouTube search is on' : 'YouTube key removed');
  } else if (a === 'sonos-refresh') renderSonosSettings(true);
  else if (a === 'sonos-add') {
    const host = $('#sonos-ip').value.trim();
    if (host) api('/api/sonos/hosts', { method: 'POST', body: { host } }).then((d) => { groupsCache = { ...groupsCache, ...d }; renderSonosSettings(false); toast(d.groups.length ? 'Speakers found' : 'No Sonos speaker answered at that address'); }).catch((err) => toast(err.message));
  } else if (a === 'export-library') {
    const json = JSON.stringify(library, null, 2);
    if (MODE === 'native' && navigator.share) navigator.share({ title: 'Encore library', text: json }).catch(() => {});
    else Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: 'encore-library.json' }).click();
  } else if (a === 'import-library') {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
    inp.onchange = async () => {
      try {
        const data = JSON.parse(await inp.files[0].text());
        if (!Array.isArray(data.liked) || !Array.isArray(data.playlists)) throw new Error();
        Object.assign(library, data);
        saveLibrary(); toast('Library imported'); route();
      } catch { toast('That file is not an Encore library'); }
    };
    inp.click();
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'p-seek' || el.id === 's-seek') { seeking = false; seek((el.value / 1000) * player.duration); }
  if (el.dataset.setting === 'dynamicColor') { library.settings.dynamicColor = el.checked; saveLibrary(); applySeedColor(current()); }
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-card-play],[data-video-i]')) { e.preventDefault(); e.target.click(); }
});

document.addEventListener('dblclick', (e) => {
  const row = e.target.closest('.track');
  if (row && !e.target.closest('button,a') && !row.dataset.videoI) playFromRow(row);
});
// Single tap plays on touch screens (no hover, no double-click).
document.addEventListener('click', (e) => {
  if (!matchMedia('(hover: none)').matches) return;
  const row = e.target.closest('.track');
  if (row && !row.dataset.videoI && !e.target.closest('button,a')) playFromRow(row);
});

function playFromRow(row) {
  const listId = row.dataset.list;
  const i = Number(row.dataset.i);
  if (listId === 'np') return togglePlay();
  if (listId === 'q') return skipTo(i);
  const l = lists.get(listId);
  if (l) playList(l.tracks, i, l.context);
}

let preMute = 0.8;
function toggleMute() {
  const v = currentVolume();
  if (v > 0) { preMute = v; setVolume(0); } else setVolume(preMute || 0.5);
}

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'p-seek' || el.id === 's-seek') {
    seeking = true;
    const k = el.id[0];
    $(`#${k}-wave`).style.setProperty('--pct', `${el.value / 10}%`);
    $(`#${k}-time`).textContent = fmt((el.value / 1000) * player.duration);
  } else if (el.id === 'p-vol') { setRangePct(el); setVolume(el.value / 100); }
  else if (el.dataset.eq != null) {
    const i = Number(el.dataset.eq);
    library.settings.eq[i] = Number(el.value);
    library.settings.eqPreset = 'Custom';
    setRangePct(el);
    $(`[data-eq-val="${i}"]`).textContent = `${el.value > 0 ? '+' : ''}${el.value}`;
    engine.setEqualizer(library.settings.eq);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveLibrary, 400);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input[type=text],input[type=search],textarea') || e.metaKey || e.ctrlKey || e.altKey) {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  const k = e.key;
  if (k === ' ' && !e.target.matches('button,[role=button]')) { e.preventDefault(); togglePlay(); }
  else if (k === 'ArrowRight' && !e.target.matches('input')) { e.preventDefault(); e.shiftKey ? next() : seek(Math.min(player.duration, player.position + 10)); }
  else if (k === 'ArrowLeft' && !e.target.matches('input')) { e.preventDefault(); e.shiftKey ? prev() : seek(Math.max(0, player.position - 10)); }
  else if (k === 'ArrowUp' && !e.target.matches('input')) { e.preventDefault(); setVolume(currentVolume() + 0.05); }
  else if (k === 'ArrowDown' && !e.target.matches('input')) { e.preventDefault(); setVolume(currentVolume() - 0.05); }
  else if (k === 'm' || k === 'M') toggleMute();
  else if (k === 's' || k === 'S') toggleShuffle();
  else if (k === 'r' || k === 'R') cycleRepeat();
  else if (k === 'l' || k === 'L') toggleLike(current());
  else if (k === '/') { e.preventDefault(); location.hash = '#/search'; }
  else if (k === 'Escape') { closePopover(); closeSheet(); closeVideo(); }
});

// ---- touch gestures on the full-screen player:
// drag down to close, swipe the artwork sideways to change song.
(function sheetGestures() {
  let x0, y0, dx, dy, mode;
  sheet.addEventListener('touchstart', (e) => {
    if (e.target.closest('input,#sheet-extra,.sheet-chips')) { mode = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = dy = 0;
    mode = 'pending';
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (!mode) return;
    dx = e.touches[0].clientX - x0;
    dy = e.touches[0].clientY - y0;
    if (mode === 'pending' && Math.hypot(dx, dy) > 12) {
      mode = Math.abs(dy) > Math.abs(dx) ? (dy > 0 && $('.sheet-scroll').scrollTop === 0 ? 'down' : null) : e.target.closest('.sheet-art-wrap') ? 'side' : null;
    }
    if (mode === 'down') { sheet.style.transition = 'none'; sheet.style.transform = `translateY(${Math.max(0, dy)}px)`; }
    if (mode === 'side') $('#s-art').style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`;
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    sheet.style.transition = '';
    if (mode === 'down') {
      sheet.style.transform = '';
      if (dy > 110) closeSheet();
    }
    if (mode === 'side') {
      $('#s-art').style.transform = '';
      if (dx < -70) next();
      else if (dx > 70) prev();
    }
    mode = null;
  });
})();

// Android back button: close what's open, then go back, then leave the app.
onBackButton(() => {
  if (!popover.hidden) return closePopover();
  if (videoOpen()) return closeVideo();
  if (sheetOpen()) return closeSheet();
  if (location.hash && location.hash !== '#/home' && history.length > 1) return history.back();
  exitApp();
});

// ================================================================ boot
(async function boot() {
  document.body.dataset.mode = MODE;
  hydrateIcons();
  await initLibrary();
  applyTheme();
  applyEngineSettings();
  if (window.innerWidth > 1240) $('#app').classList.remove('panel-closed');
  updatePlayerUI();
  renderPanel();
  route();
  if (canCast) fetchGroups().catch(() => {}); // warm up Sonos discovery in the background
  if (MODE === 'native') saveLibrary(); // make sure Android Auto has the library
})();

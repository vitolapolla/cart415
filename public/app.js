// Encore — web client. No build step, no framework.

// ================================================================ icons
const ICONS = {
  home: 'M12 3 2 11h3v10h6v-6h2v6h6V11h3z',
  search: 'M10 2a8 8 0 0 1 6.32 12.9l5.39 5.4-1.41 1.4-5.4-5.39A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
  radio: 'M3.24 6.15 16.43 1l.73 1.86L8.3 6.3H20a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.3c0-.5.1-.87.24-1.15zM7 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-6v2h4v-2zm0 4v2h4v-2z',
  library: 'M4 3h2v18H4zm5 0h2v18H9zm5.4 1.1 1.9-.6 5.3 16.2-1.9.6z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  heart: 'M12 21s-7.5-4.6-9.6-9.3C.9 8.1 3.2 4 7.1 4c2 0 3.6 1.1 4.9 2.8C13.3 5.1 14.9 4 16.9 4c3.9 0 6.2 4.1 4.7 7.7C19.5 16.4 12 21 12 21zm0-2.4c2.4-1.6 6.3-4.6 7.7-7.6.9-2.2-.4-5-2.8-5-1.6 0-2.9 1-3.9 2.8l-1 1.7-1-1.7C10 7 8.7 6 7.1 6c-2.4 0-3.7 2.8-2.8 5 1.4 3 5.3 6 7.7 7.6z',
  'heart-fill': 'M12 21s-7.5-4.6-9.6-9.3C.9 8.1 3.2 4 7.1 4c2 0 3.6 1.1 4.9 2.8C13.3 5.1 14.9 4 16.9 4c3.9 0 6.2 4.1 4.7 7.7C19.5 16.4 12 21 12 21z',
  settings: 'M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.7a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.8 1.7 1L11 21h4l.4-2.7c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z',
  play: 'M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z',
  pause: 'M6 4h4v16H6zm8 0h4v16h-4z',
  prev: 'M6 5h2v14H6zm3.5 7L19 5v14z',
  next: 'M16 5h2v14h-2zM5 5l9.5 7L5 19z',
  shuffle: 'M17 3l4 4-4 4V8h-2.6l-2.7 3.6-1.25-1.67L13.4 6H17zM3 6h4.6l9.4 12H17v-3l4 4-4 4v-3h-1.6L6.6 8H3zm0 10h3.6l2.1-2.8 1.25 1.67L7.6 18H3z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z',
  moon: 'M12.3 2a9 9 0 1 0 9.7 11.3A7 7 0 0 1 12.3 2z',
  mic: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z',
  queue: 'M3 5h13v2H3zm0 4h13v2H3zm0 4h8v2H3zm12 0v6l5-3z',
  speaker: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm6 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  laptop: 'M4 5h16v10H4zm-2 12h20v2H2z',
  volume: 'M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
  mute: 'M3 9v6h4l5 5V4L7 9zm18.6 6.2-1.4 1.4-3.2-3.2-3.2 3.2-1.4-1.4 3.2-3.2-3.2-3.2 1.4-1.4 3.2 3.2 3.2-3.2 1.4 1.4-3.2 3.2z',
  more: 'M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  'play-next': 'M3 5h12v2H3zm0 4h12v2H3zm0 4h7v2H3zm13-1v3h-3v2h3v3h2v-3h3v-2h-3v-3z',
  'add-list': 'M3 6h12v2H3zm0 4h12v2H3zm0 4h8v2H3zm14 0v-3h2v3h3v2h-3v3h-2v-3h-3v-2z',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z',
  trash: 'M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7z',
  edit: 'M3 17.2V21h3.8L17.8 9.9 14 6.2zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z',
  external: 'M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14zM5 5h6v2H5v12h12v-6h2v8H3V5z',
  refresh: 'M17.65 6.35A8 8 0 1 0 19.73 14h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z',
  link: 'M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0zM8.5 19a4.5 4.5 0 0 1-3.2-7.7l2.1-2.1 1.4 1.4-2.1 2.1a2.5 2.5 0 0 0 3.5 3.5l2.1-2.1 1.4 1.4-2.1 2.1A4.5 4.5 0 0 1 8.5 19zm8.1-4.8-1.4-1.4 2.1-2.1a2.5 2.5 0 1 0-3.5-3.5L11.7 9.3l-1.4-1.4 2.1-2.1a4.5 4.5 0 1 1 6.4 6.4z',
};
const icon = (name, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
function hydrateIcons(root = document) {
  root.querySelectorAll('svg[data-icon]').forEach((el) => {
    el.setAttribute('viewBox', '0 0 24 24');
    el.innerHTML = `<path d="${ICONS[el.dataset.icon]}"/>`;
  });
}

// ================================================================ utils
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (sec) => {
  if (!isFinite(sec) || sec <= 0) return '0:00';
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};
const ART_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#262634"/><path d="M26 18v20.5a6 6 0 1 0 4 5.5V24h10v-6z" fill="#6c6c80"/></svg>');
const art = (url) => esc(url || ART_FALLBACK);
const uid = () => Math.random().toString(36).slice(2, 10);
const hueOf = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ================================================================ library (persisted on the server + localStorage)
const library = {
  liked: [], playlists: [], recent: [], recentCollections: [],
  settings: { volume: 0.8, eq: [0, 0, 0, 0, 0], eqPreset: 'Flat', crossfade: 0 },
};

function loadLocal() {
  try { return JSON.parse(localStorage.getItem('encore.library') || 'null'); } catch { return null; }
}
let saveTimer;
function saveLibrary() {
  try { localStorage.setItem('encore.library', JSON.stringify(library)); } catch {}
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api('/api/library', { method: 'PUT', body: library }).catch(() => {}), 800);
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
const slim = (t) => ({ id: t.id, source: t.source, title: t.title, artist: t.artist, artistId: t.artistId, album: t.album, artwork: t.artwork, duration: t.duration, genre: t.genre, stream: t.stream, kind: t.kind, externalUrl: t.externalUrl });
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
  $$(`[data-like="${CSS.escape(track.id)}"]`).forEach((el) => el.classList.toggle('on', isLiked(track.id)));
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

// ================================================================ audio engine
const audio = new Audio();
audio.preload = 'auto';
let audioCtx, eqNodes = [];
const EQ_FREQS = [60, 230, 910, 3600, 14000];
const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0], 'Bass Boost': [6, 4, 0, 0, 0], 'Treble Boost': [0, 0, 0, 3, 6], Vocal: [-2, 0, 3, 4, 1],
  Electronic: [5, 2, -1, 2, 4], Acoustic: [3, 1, 1, 2, 2], 'Late Night': [3, 2, 0, -2, -3], Loudness: [5, 1, -1, 1, 4],
};
function ensureAudioGraph() {
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
  try {
    audioCtx = new AudioContext();
    const src = audioCtx.createMediaElementSource(audio);
    let node = src;
    eqNodes = EQ_FREQS.map((f, i) => {
      const b = audioCtx.createBiquadFilter();
      b.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length - 1 ? 'highshelf' : 'peaking';
      b.frequency.value = f;
      b.Q.value = 1;
      b.gain.value = library.settings.eq[i] || 0;
      node.connect(b);
      node = b;
      return b;
    });
    node.connect(audioCtx.destination);
  } catch (e) {
    console.warn('Equalizer unavailable', e);
  }
}
function applyEq() {
  eqNodes.forEach((b, i) => { b.gain.value = library.settings.eq[i] || 0; });
}

// ================================================================ player state
const player = {
  queue: [],       // tracks in play order
  index: -1,
  manual: [],      // "Add to queue" items, played before the rest of the context
  context: null,   // { name, href }
  shuffle: false,
  ordered: null,   // context order before shuffling
  repeat: 'off',   // off | all | one
  playing: false,
  position: 0,
  duration: 0,
  cast: null,      // { id, name } of the Sonos group we're playing on
  castState: null,
  castVolume: null,
  sleepAt: null,   // timestamp, or 'track'
};
const current = () => player.queue[player.index] || null;

function playList(tracks, start = 0, context = null) {
  tracks = tracks.filter(Boolean);
  if (!tracks.length) return;
  player.context = context;
  player.ordered = tracks.slice();
  if (player.shuffle) {
    const first = tracks[start];
    const rest = tracks.filter((_, i) => i !== start);
    shuffleArray(rest);
    player.queue = [first, ...rest];
    player.index = 0;
  } else {
    player.queue = tracks.slice();
    player.index = start;
  }
  player.manual = [];
  loadAndPlay();
}

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadAndPlay(startAt = 0) {
  const t = current();
  if (!t) return;
  player.position = startAt;
  player.duration = t.duration || 0;
  pushRecent(t);
  updatePlayerUI();
  renderPanel();
  markPlayingRows();
  loadLyrics(t);
  if (player.cast) {
    lastCastState = null;
    castTransition = Date.now();
    try {
      await api(`/api/sonos/${encodeURIComponent(player.cast.id)}/play`, { method: 'POST', body: { track: t, position: startAt } });
      player.playing = true;
    } catch (e) {
      toast(e.message);
      player.playing = false;
    }
    updatePlayerUI();
    return;
  }
  ensureAudioGraph();
  audio.src = t.stream;
  if (startAt) audio.addEventListener('loadedmetadata', () => { audio.currentTime = startAt; }, { once: true });
  try {
    await audio.play();
  } catch (e) {
    if (e.name !== 'AbortError') toast(`Couldn't play "${t.title}"`);
  }
}

function togglePlay() {
  if (!current()) {
    const list = lastRenderedList();
    if (list?.length) playList(list, 0);
    return;
  }
  if (player.cast) {
    const action = player.playing ? 'pause' : 'resume';
    player.playing = !player.playing;
    updatePlayerUI();
    api(`/api/sonos/${encodeURIComponent(player.cast.id)}/${action}`, { method: 'POST', body: {} }).catch((e) => toast(e.message));
    return;
  }
  if (!audio.src) return loadAndPlay();
  ensureAudioGraph();
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
}

function next(auto = false) {
  if (auto && player.sleepAt === 'track') {
    player.sleepAt = null;
    stopPlayback();
    toast('Sleep timer: goodnight');
    updatePlayerUI();
    return;
  }
  if (auto && player.repeat === 'one') return loadAndPlay();
  if (player.manual.length) {
    player.queue.splice(player.index + 1, 0, player.manual.shift());
    player.index++;
    return loadAndPlay();
  }
  if (player.index < player.queue.length - 1) {
    player.index++;
    return loadAndPlay();
  }
  if (player.repeat !== 'off' || !auto) {
    if (player.repeat === 'off') return; // pressing "next" at the end does nothing
    player.index = 0;
    return loadAndPlay();
  }
  // End of queue: keep the music going with similar tracks (autoplay radio).
  autoplay();
}

async function autoplay() {
  const t = current();
  player.playing = false;
  updatePlayerUI();
  if (!t || t.kind === 'live') return;
  try {
    const genre = t.genre || 'Electronic';
    const { tracks } = await api(`/api/genre/${encodeURIComponent(genre)}`);
    const have = new Set(player.queue.map((x) => x.id));
    const more = shuffleArray(tracks.filter((x) => !have.has(x.id))).slice(0, 20);
    if (!more.length) return;
    player.queue.push(...more);
    player.index++;
    toast(`Autoplay: more ${genre}`);
    loadAndPlay();
  } catch {}
}

function prev() {
  if (player.position > 3 || player.index <= 0) return seek(0);
  player.index--;
  loadAndPlay();
}

function seek(sec) {
  const t = current();
  if (!t || t.kind === 'live') return;
  player.position = sec;
  if (player.cast) {
    api(`/api/sonos/${encodeURIComponent(player.cast.id)}/seek`, { method: 'POST', body: { position: sec } }).catch((e) => toast(e.message));
  } else {
    audio.currentTime = sec;
  }
  updateProgress();
}

function stopPlayback() {
  if (player.cast) api(`/api/sonos/${encodeURIComponent(player.cast.id)}/pause`, { method: 'POST', body: {} }).catch(() => {});
  else audio.pause();
  player.playing = false;
}

function setVolume(v) {
  v = Math.max(0, Math.min(1, v));
  library.settings.volume = v;
  if (player.cast) {
    player.castVolume = Math.round(v * 100);
    castVolumeSetAt = Date.now();
    clearTimeout(setVolume.t);
    setVolume.t = setTimeout(() => api(`/api/sonos/${encodeURIComponent(player.cast.id)}/volume`, { method: 'POST', body: { volume: player.castVolume } }).catch(() => {}), 150);
  } else {
    audio.volume = v;
    saveLibrary();
  }
  updateVolumeUI();
}

function toggleShuffle() {
  player.shuffle = !player.shuffle;
  const t = current();
  if (player.shuffle && player.queue.length > 1) {
    player.ordered = player.ordered || player.queue.slice();
    const rest = player.queue.filter((_, i) => i !== player.index);
    player.queue = [t, ...shuffleArray(rest)];
    player.index = 0;
  } else if (!player.shuffle && player.ordered && t) {
    player.queue = player.ordered.slice();
    player.index = Math.max(0, player.queue.findIndex((x) => x.id === t.id));
  }
  toast(player.shuffle ? 'Shuffle on' : 'Shuffle off');
  updatePlayerUI();
  renderPanel();
}

function cycleRepeat() {
  player.repeat = { off: 'all', all: 'one', one: 'off' }[player.repeat];
  toast({ off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' }[player.repeat]);
  updatePlayerUI();
}

function addToQueue(tracks, nextUp = false) {
  if (!current()) return playList(tracks, 0);
  if (nextUp) player.manual.unshift(...tracks);
  else player.manual.push(...tracks);
  toast(nextUp ? 'Playing next' : tracks.length > 1 ? `Added ${tracks.length} songs to queue` : 'Added to queue');
  renderPanel();
}

audio.addEventListener('play', () => { player.playing = true; updatePlayerUI(); });
audio.addEventListener('pause', () => { player.playing = false; updatePlayerUI(); });
audio.addEventListener('timeupdate', () => {
  if (player.cast) return;
  player.position = audio.currentTime;
  if (isFinite(audio.duration)) player.duration = audio.duration;
  updateProgress();
});
audio.addEventListener('ended', () => { if (!player.cast) next(true); });
audio.addEventListener('error', () => {
  if (player.cast || !audio.src) return;
  toast(`Couldn't load "${current()?.title}", skipping`);
  setTimeout(() => next(true), 800);
});

// ================================================================ Sonos casting
let castPoll, lastCastState = null, castTransition = 0, castVolumeSetAt = 0;

async function startCast(group) {
  const t = current();
  const pos = player.cast ? player.position : audio.currentTime || 0;
  const wasPlaying = player.playing;
  audio.pause();
  player.cast = { id: group.id, name: group.name };
  updatePlayerUI();
  toast(`Playing on ${group.name}`);
  clearInterval(castPoll);
  castPoll = setInterval(pollCast, 1000);
  if (t && (wasPlaying || player.position > 0)) {
    await loadAndPlay(t.kind === 'live' ? 0 : pos);
    if (!wasPlaying) togglePlay();
  }
}

async function stopCast(resumeLocally = true) {
  if (!player.cast) return;
  const g = player.cast;
  clearInterval(castPoll);
  let pos = player.position, wasPlaying = player.playing;
  player.cast = null;
  player.castVolume = null;
  updatePlayerUI();
  await api(`/api/sonos/${encodeURIComponent(g.id)}/pause`, { method: 'POST', body: {} }).catch(() => {});
  toast('Playing on this device');
  if (resumeLocally && current() && wasPlaying) loadAndPlay(current().kind === 'live' ? 0 : pos);
  audio.volume = library.settings.volume;
}

async function pollCast() {
  if (!player.cast) return;
  try {
    const s = await api(`/api/sonos/${encodeURIComponent(player.cast.id)}/status`);
    const t = current();
    player.castState = s.state;
    if (s.volume != null && Date.now() - castVolumeSetAt > 2000) player.castVolume = s.volume;
    if (s.state === 'PLAYING') player.playing = true;
    else if (s.state === 'PAUSED_PLAYBACK') player.playing = false;
    if (Date.now() - castTransition > 2500) {
      player.position = s.position;
      if (s.duration) player.duration = s.duration;
    }
    // The track finished on the speaker → advance our queue.
    if (s.state === 'STOPPED' && lastCastState === 'PLAYING' && t?.kind !== 'live' && Date.now() - castTransition > 4000) {
      lastCastState = null;
      next(true);
      return;
    }
    if (s.state !== 'TRANSITIONING') lastCastState = s.state;
    updatePlayerUI();
  } catch (e) {
    console.warn(e);
  }
}

let groupsCache = null;
async function fetchGroups(refresh = false) {
  const data = await api(`/api/sonos/groups${refresh ? '?refresh=1' : ''}`);
  groupsCache = data;
  return data;
}

async function openCastPicker(anchor) {
  const pop = openPopover(anchor, `<div class="cast-pop"><h3>Play on</h3><div class="note">Looking for Sonos speakers…</div></div>`, 'up');
  let data;
  try {
    data = groupsCache && !groupsCache.groups.length ? await fetchGroups(true) : await fetchGroups();
  } catch (e) {
    data = { groups: [], error: e.message };
  }
  if (!pop.isConnected || pop.hidden) return;
  const row = (id, name, sub, ico, active) => `
    <div class="device ${active ? 'active' : ''}" data-cast-target="${esc(id)}">
      ${icon(ico)}<div><div class="dname">${esc(name)}</div><div class="dsub">${sub}</div></div>
    </div>`;
  pop.innerHTML = `<div class="cast-pop">
    <h3>Play on</h3>
    ${row('', 'This device', 'Browser speakers / headphones', 'laptop', !player.cast)}
    ${data.groups.map((g) => row(g.id, g.name, g.members.length > 1 ? `Group of ${g.members.length} speakers` : 'Sonos', 'speaker', player.cast?.id === g.id)
      + (player.cast?.id === g.id ? `<div class="device-vol">${icon('volume')}<input type="range" min="0" max="100" value="${player.castVolume ?? 30}" data-cast-volume></div>` : '')).join('')}
    ${data.groups.length ? '' : `<div class="note" style="margin-top:8px">No Sonos speakers found. The Encore server must be on the same Wi-Fi as your speakers. You can also add a speaker by IP in <a href="#/settings">Settings</a>.</div>`}
    <div class="menu-sep"></div>
    <button class="menu-item" data-action="cast-refresh">${icon('refresh')}Search again</button>
    <a class="menu-item" href="#/settings">${icon('settings')}Group speakers…</a>
  </div>`;
  positionPopover(anchor, 'up');
  $$('[data-cast-target]', pop).forEach((el) => el.addEventListener('click', () => {
    closePopover();
    const g = data.groups.find((x) => x.id === el.dataset.castTarget);
    if (!g) return stopCast();
    if (player.cast?.id === g.id) return;
    startCast(g);
  }));
  const vol = $('[data-cast-volume]', pop);
  if (vol) {
    setRangePct(vol);
    vol.addEventListener('input', () => { setRangePct(vol); setVolume(vol.value / 100); });
  }
  $('[data-action=cast-refresh]', pop).addEventListener('click', async (e) => {
    e.stopPropagation();
    groupsCache = null;
    await fetchGroups(true).catch(() => {});
    openCastPicker(anchor);
  });
}

// ================================================================ media session (lock screen / keyboard media keys)
function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const t = current();
  if (!t) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title, artist: t.artist, album: t.album || '',
    artwork: t.artwork ? [{ src: t.artwork, sizes: '480x480' }] : [],
  });
  navigator.mediaSession.playbackState = player.playing ? 'playing' : 'paused';
}
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => !player.playing && togglePlay());
  ms.setActionHandler('pause', () => player.playing && togglePlay());
  ms.setActionHandler('previoustrack', prev);
  ms.setActionHandler('nexttrack', () => next());
  try { ms.setActionHandler('seekto', (d) => seek(d.seekTime)); } catch {}
}

// ================================================================ sleep timer
setInterval(() => {
  if (typeof player.sleepAt === 'number' && Date.now() >= player.sleepAt) {
    player.sleepAt = null;
    if (player.playing) stopPlayback();
    toast('Sleep timer: goodnight');
    updatePlayerUI();
  }
}, 1000);

function openSleepMenu(anchor) {
  const opts = [[5, '5 minutes'], [15, '15 minutes'], [30, '30 minutes'], [45, '45 minutes'], [60, '1 hour'], ['track', 'End of track']];
  const remaining = typeof player.sleepAt === 'number' ? Math.ceil((player.sleepAt - Date.now()) / 60000) : null;
  const pop = openPopover(anchor, `
    <div class="menu-head">Sleep timer${remaining ? ` · ${remaining} min left` : player.sleepAt === 'track' ? ' · end of track' : ''}</div>
    ${opts.map(([v, l]) => `<button class="menu-item" data-sleep="${v}">${l}</button>`).join('')}
    ${player.sleepAt ? `<div class="menu-sep"></div><button class="menu-item" data-sleep="off">Turn off timer</button>` : ''}`, 'up');
  $$('[data-sleep]', pop).forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.sleep;
    player.sleepAt = v === 'off' ? null : v === 'track' ? 'track' : Date.now() + Number(v) * 60000;
    toast(v === 'off' ? 'Sleep timer off' : `Sleep timer set`);
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
  if (panelTab === 'lyrics') renderPanel();
}
function parseLrc(lrc) {
  const out = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (m) out.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() || '♪' });
  }
  return out.length ? out : null;
}
function updateLyricsHighlight() {
  if (panelTab !== 'lyrics' || !lyricsState.lines || current()?.kind === 'preview') return;
  const ps = $$('.lyrics p', $('#panel-body'));
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

// ================================================================ player UI
function setRangePct(input) {
  input.style.setProperty('--pct', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
}
let seeking = false;
function updateProgress() {
  const t = current();
  const seekEl = $('#p-seek');
  const live = t?.kind === 'live';
  $('#p-time').textContent = live ? 'LIVE' : fmt(player.position);
  $('#p-dur').textContent = live ? '' : fmt(player.duration);
  if (!seeking) {
    seekEl.value = live || !player.duration ? (live ? 1000 : 0) : Math.min(1000, (player.position / player.duration) * 1000);
    setRangePct(seekEl);
  }
  seekEl.disabled = live || !t;
  updateLyricsHighlight();
}
function updateVolumeUI() {
  const v = player.cast ? (player.castVolume ?? 30) / 100 : library.settings.volume;
  const el = $('#p-vol');
  el.value = Math.round(v * 100);
  setRangePct(el);
  $('#p-mute').innerHTML = icon(v === 0 ? 'mute' : 'volume');
}
function updatePlayerUI() {
  const t = current();
  $('#p-art').src = t?.artwork || ART_FALLBACK;
  $('#p-title').innerHTML = t ? `${t.kind === 'preview' ? '<span class="badge preview">PREVIEW</span>' : t.kind === 'live' ? '<span class="badge live">LIVE</span>' : ''}${esc(t.title)}` : 'Nothing playing';
  $('#p-artist').innerHTML = t ? (t.artistId ? `<a href="#/artist/${encodeURIComponent(t.artistId)}">${esc(t.artist)}</a>` : esc(t.artist)) : 'Pick something to listen to';
  $('#p-play').innerHTML = icon(player.playing ? 'pause' : 'play');
  $('#p-like').innerHTML = icon(t && isLiked(t.id) ? 'heart-fill' : 'heart');
  $('#p-like').classList.toggle('on', !!t && isLiked(t.id));
  $('#p-shuffle').classList.toggle('on', player.shuffle);
  $('#p-repeat').classList.toggle('on', player.repeat !== 'off');
  $('#p-repeat').innerHTML = icon('repeat') + (player.repeat === 'one' ? '<span class="rep1">1</span>' : '');
  $('#p-sleep').classList.toggle('on', !!player.sleepAt);
  $('#p-cast').classList.toggle('on', !!player.cast);
  const badge = $('#cast-badge');
  badge.hidden = !player.cast;
  if (player.cast) badge.textContent = `▶ ${player.cast.name}`;
  document.title = t ? `${t.title} · ${t.artist}` : 'Encore';
  document.body.classList.toggle('paused', !player.playing);
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
    const num = $('.t-num span', row);
    if (num) num.innerHTML = on ? '<span class="eq-anim"><i></i><i></i><i></i></span>' : esc(num.dataset.n);
  });
}

// ================================================================ right panel
let panelTab = 'now';
function openPanel(tab) {
  const app = $('#app');
  if (tab === panelTab && !app.classList.contains('panel-closed') && window.innerWidth <= 1180) {
    app.classList.add('panel-closed');
    return;
  }
  panelTab = tab;
  app.classList.remove('panel-closed');
  renderPanel();
}
function renderPanel() {
  $$('.panel-tabs [data-panel]').forEach((b) => b.classList.toggle('active', b.dataset.panel === panelTab));
  const body = $('#panel-body');
  const t = current();
  if (panelTab === 'now') {
    if (!t) { body.innerHTML = `<div class="empty">Nothing playing yet.<br>Find something on <a href="#/home" style="color:var(--accent)">Home</a>.</div>`; return; }
    body.innerHTML = `
      <img class="np-art" src="${art(t.artwork)}" alt="">
      <div class="np-title">${esc(t.title)}</div>
      <div class="np-artist">${t.artistId ? `<a href="#/artist/${encodeURIComponent(t.artistId)}">${esc(t.artist)}</a>` : esc(t.artist)}</div>
      ${player.context ? `<div class="np-box"><h4>Playing from</h4><a href="${esc(player.context.href)}">${esc(player.context.name)}</a></div>` : ''}
      <div class="np-box"><h4>About this track</h4>
        <div class="note">${t.kind === 'full' ? 'Full-length stream from <b>Audius</b>, the artist-owned music network.' :
          t.kind === 'preview' ? `30-second preview from the Apple Music catalog.${t.externalUrl ? ` <a href="${esc(t.externalUrl)}" target="_blank" rel="noopener">Open full song ↗</a>` : ''}` :
          `Live radio via radio-browser.info${t.bitrate ? ` · ${t.bitrate} kbps ${esc(t.codec || '')}` : ''}.`}
          ${t.genre ? `<br>Genre: <a href="#/genre/${encodeURIComponent(t.genre)}">${esc(t.genre)}</a>` : ''}</div>
      </div>
      ${upNextHtml(3)}`;
  } else if (panelTab === 'queue') {
    body.innerHTML = t ? `<div class="queue-label">Now playing</div>${trackRows([t], { compact: true, list: 'np' })}${upNextHtml()}` : '<div class="empty">Your queue is empty.</div>';
  } else {
    if (!t) { body.innerHTML = '<div class="empty">Play a song to see its lyrics.</div>'; return; }
    if (lyricsState.loading) body.innerHTML = '<div class="empty">Finding lyrics…</div>';
    else if (t.kind === 'live') body.innerHTML = '<div class="empty">Lyrics aren\'t available for live radio.</div>';
    else if (lyricsState.instrumental) body.innerHTML = '<div class="empty">♪ Instrumental ♪</div>';
    else if (lyricsState.lines && t.kind !== 'preview') body.innerHTML = `<div class="lyrics">${lyricsState.lines.map((l) => `<p data-seek="${l.t}">${esc(l.text)}</p>`).join('')}</div>`;
    else if (lyricsState.plain || lyricsState.lines) body.innerHTML = `<div class="lyrics plain">${(lyricsState.plain || lyricsState.lines.map((l) => l.text).join('\n')).split('\n').map((l) => `<p>${esc(l) || '&nbsp;'}</p>`).join('')}</div>`;
    else body.innerHTML = '<div class="empty">No lyrics found for this song.</div>';
    updateLyricsHighlight();
  }
}
function upNextHtml(limit = 80) {
  const manual = player.manual.slice(0, limit);
  const rest = player.queue.slice(player.index + 1, player.index + 1 + Math.max(0, limit - manual.length));
  let html = '';
  if (manual.length) html += `<div class="queue-label">Next in queue</div>${trackRows(manual, { compact: true, list: 'manual' })}`;
  if (rest.length) html += `<div class="queue-label">Next from: ${esc(player.context?.name || 'your queue')}</div>${trackRows(rest, { compact: true, list: 'upnext' })}`;
  return html || (limit < 80 ? '' : '<div class="queue-label">Nothing up next. Autoplay will pick similar songs.</div>');
}

// ================================================================ rendering helpers
const lists = new Map(); // list id → tracks, so rows can be played from event handlers
let listSeq = 0, lastListId = null;
function registerList(tracks, meta = {}) {
  const id = `l${++listSeq}`;
  lists.set(id, { tracks, ...meta });
  if (lists.size > 60) lists.delete(lists.keys().next().value);
  return id;
}
function lastRenderedList() {
  return lastListId ? lists.get(lastListId)?.tracks : null;
}

function trackRows(tracks, { compact = false, list, context = null, showArt = true, playlistId = null } = {}) {
  if (!tracks.length) return '<div class="empty">No songs here yet.</div>';
  const lid = list || registerList(tracks, { context });
  if (list) lists.set(list, { tracks, context });
  if (!compact) lastListId = lid;
  return `<div class="tracks ${compact ? 'queue' : ''}">${tracks.map((t, i) => {
    const liked = isLiked(t.id);
    const badge = t.kind === 'preview' ? '<span class="badge preview">PREVIEW</span>' : t.kind === 'live' ? '<span class="badge live">LIVE</span>' : '';
    const artist = t.artistId ? `<a href="#/artist/${encodeURIComponent(t.artistId)}">${esc(t.artist)}</a>` : esc(t.artist);
    const main = `<div class="t-main">${showArt ? `<img class="t-art" loading="lazy" src="${art(t.artwork)}" alt="">` : ''}<div class="t-text"><div class="t-title">${badge}${esc(t.title)}</div><div class="t-artist">${artist}</div></div></div>`;
    const more = `<button class="t-more" data-more="${i}" title="More">${icon('more')}</button>`;
    if (compact) return `<div class="track" data-id="${esc(t.id)}" data-list="${lid}" data-i="${i}">${main}${more}</div>`;
    return `<div class="track" data-id="${esc(t.id)}" data-list="${lid}" data-i="${i}" ${playlistId ? `data-playlist="${esc(playlistId)}"` : ''}>
      <div class="t-num"><span data-n="${i + 1}">${i + 1}</span><button data-play-row title="Play">${icon('play')}</button></div>
      ${main}
      <div class="t-album">${t.genre ? `<a href="#/genre/${encodeURIComponent(t.genre)}">${esc(t.album || t.genre)}</a>` : esc(t.album || '')}</div>
      <button class="t-like ${liked ? 'on' : ''}" data-like="${esc(t.id)}" title="Like">${icon(liked ? 'heart-fill' : 'heart')}</button>
      <div class="t-dur">${t.kind === 'live' ? '' : fmt(t.duration)}</div>
      ${more}
    </div>`;
  }).join('')}</div>`;
}

function card({ href, img, title, sub, round = false, station = false, play }) {
  return `<a class="card" href="${esc(href || '#')}" ${play ? `data-card-play="${esc(play)}"` : ''}>
    <img class="card-art ${round ? 'round' : ''} ${station ? 'station' : ''}" loading="lazy" src="${art(img)}" alt="" onerror="this.src='${ART_FALLBACK}'">
    <div class="card-title">${esc(title)}</div>
    <div class="card-sub">${esc(sub || '')}</div>
    ${play ? `<button class="card-play" data-card-play-btn title="Play">${icon('play')}</button>` : ''}
  </a>`;
}

function playlistCard(p) {
  return card({ href: `#/playlist/${encodeURIComponent(p.id)}`, img: p.artwork, title: p.name, sub: `${p.isAlbum ? 'Album' : 'Playlist'} · ${p.owner}`, play: `playlist:${p.id}` });
}
function artistCard(a) {
  return card({ href: `#/artist/${encodeURIComponent(a.id)}`, img: a.artwork, title: a.name, sub: `Artist · ${a.followers.toLocaleString()} followers`, round: true });
}
function stationCards(stations) {
  const lid = registerList(stations, { context: { name: 'Radio', href: '#/radio' } });
  return stations.map((s, i) => card({ href: '#', img: s.artwork, title: s.title, sub: s.artist, station: true, play: `list:${lid}:${i}` })).join('');
}
function trackCards(tracks, context) {
  const lid = registerList(tracks, { context });
  return tracks.map((t, i) => card({ href: t.artistId ? `#/artist/${encodeURIComponent(t.artistId)}` : '#', img: t.artwork, title: t.title, sub: t.artist, play: `list:${lid}:${i}` })).join('');
}
const genreCard = (g) => `<a class="genre-card" href="#/genre/${encodeURIComponent(g)}" style="background:hsl(${hueOf(g)} 55% 42%)">${esc(g)}</a>`;

// ================================================================ views
const main = $('#main');
let renderToken = 0;

function setView(html, hero) {
  main.innerHTML = `<div class="view">${html}</div>`;
  if (hero) main.querySelector('.hero')?.style.setProperty('--hero', hero);
  markPlayingRows();
}
const loading = () => setView('<div class="skeleton"></div><h2>&nbsp;</h2><div class="skeleton" style="height:160px"></div>');
const failed = (e) => setView(`<div class="empty">Something went wrong: ${esc(e.message)}<br><br><button class="btn" onclick="location.reload()">Retry</button></div>`);

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Up late?' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

async function viewHome(token) {
  const quick = [
    `<a class="quick-item" href="#/liked"><span class="liked-tile">${icon('heart-fill')}</span><span>Liked Songs</span></a>`,
    ...library.recentCollections.slice(0, 7).map((c) => `<a class="quick-item" href="${esc(c.href)}"><img src="${art(c.artwork)}" alt=""><span>${esc(c.name)}</span></a>`),
  ].join('');
  setView(`<h1 class="greeting">${greeting()}</h1><div class="quick">${quick}</div><h2>Trending this week</h2><div class="skeleton"></div>`);
  const d = await api('/api/home');
  if (token !== renderToken) return;
  const recent = library.recent.slice(0, 20);
  setView(`
    <h1 class="greeting">${greeting()}</h1>
    <div class="quick">${quick}</div>
    ${recent.length ? `<h2>Recently played</h2><div class="shelf">${trackCards(recent, { name: 'Recently played', href: '#/library' })}</div>` : ''}
    <h2>Trending this week <small><a href="#/genre/All">See all</a></small></h2>
    <div class="shelf">${trackCards(d.trending.slice(0, 20), { name: 'Trending this week', href: '#/home' })}</div>
    <h2>Popular playlists</h2>
    <div class="shelf">${d.playlists.map(playlistCard).join('')}</div>
    <h2>Underground rising</h2>
    <div class="shelf">${trackCards(d.underground.slice(0, 20), { name: 'Underground rising', href: '#/home' })}</div>
    <h2>Live radio <small><a href="#/radio">See all</a></small></h2>
    <div class="shelf">${stationCards(d.radio.slice(0, 16))}</div>
    <h2>Browse genres</h2>
    <div class="grid">${d.genres.map(genreCard).join('')}</div>
    <p class="note" style="margin-top:32px">Full tracks come from <a href="https://audius.co" target="_blank" rel="noopener">Audius</a> ·
    mainstream catalog previews from Apple Music · radio from <a href="https://www.radio-browser.info" target="_blank" rel="noopener">radio-browser.info</a> ·
    lyrics from <a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a>.</p>`);
}

let searchTab = 'all', searchData = null, searchTerm = '';
async function viewSearch(token, params) {
  const q = params.get('q') || '';
  setView(`
    <div class="searchbar"><label>${icon('search')}<input id="search-input" type="search" placeholder="What do you want to listen to?" value="${esc(q)}" autocomplete="off"></label></div>
    <div id="search-results"></div>`);
  const input = $('#search-input');
  input.focus();
  input.setSelectionRange(q.length, q.length);
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => history.replaceState(null, '', `#/search?q=${encodeURIComponent(input.value.trim())}`) || runSearch(input.value.trim()), 300);
  });
  runSearch(q);
}
async function runSearch(q) {
  const box = $('#search-results');
  if (!box) return;
  if (!q) {
    const genres = ['Electronic', 'Hip-Hop/Rap', 'Pop', 'R&B/Soul', 'Rock', 'Alternative', 'House', 'Techno', 'Lo-Fi', 'Ambient', 'Jazz', 'Dubstep', 'Drum & Bass', 'Latin', 'Classical', 'Country', 'Reggae', 'Metal', 'Funk', 'Soundtrack'];
    box.innerHTML = `<h2>Browse all</h2><div class="grid">${genres.map(genreCard).join('')}</div>`;
    return;
  }
  if (q !== searchTerm) {
    searchTerm = q;
    box.innerHTML = '<div class="skeleton"></div>';
    try { searchData = await api(`/api/search?q=${encodeURIComponent(q)}`); } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    if (q !== searchTerm) return;
  }
  renderSearch();
}
function renderSearch() {
  const box = $('#search-results');
  const d = searchData;
  if (!box || !d) return;
  const tabs = [['all', 'All'], ['tracks', 'Full songs'], ['previews', 'Catalog previews'], ['playlists', 'Playlists'], ['artists', 'Artists'], ['radio', 'Radio']];
  const ctx = { name: `Search: ${searchTerm}`, href: `#/search?q=${encodeURIComponent(searchTerm)}` };
  let html = `<div class="pills">${tabs.map(([k, l]) => `<button class="pill ${searchTab === k ? 'active' : ''}" data-search-tab="${k}">${l}</button>`).join('')}</div>`;
  const total = d.tracks.length + d.previews.length + d.playlists.length + d.artists.length + d.radio.length;
  if (!total) html += `<div class="empty">No results for “${esc(searchTerm)}”.</div>`;
  else if (searchTab === 'all') {
    const top = d.artists[0] && d.artists[0].name.toLowerCase() === searchTerm.toLowerCase() ? { type: 'artist', a: d.artists[0] } : d.tracks[0] ? { type: 'track', t: d.tracks[0] } : d.previews[0] ? { type: 'track', t: d.previews[0] } : null;
    const topLid = top?.type === 'track' ? registerList([top.t], { context: ctx }) : null;
    const songs = [...d.tracks.slice(0, 4), ...d.previews.slice(0, 2)];
    html += `<div class="split">
      <div><h2>Top result</h2>${top ? top.type === 'artist'
        ? `<a class="top-result" href="#/artist/${encodeURIComponent(top.a.id)}"><img src="${art(top.a.artwork)}" style="border-radius:50%" alt=""><div class="title">${esc(top.a.name)}</div><div class="note">Artist</div></a>`
        : `<div class="top-result" data-card-play="list:${topLid}:0"><img src="${art(top.t.artwork)}" alt=""><div class="title">${esc(top.t.title)}</div><div class="note">Song · ${esc(top.t.artist)}</div><button class="card-play" style="opacity:1;transform:none;top:auto;bottom:20px" data-card-play-btn>${icon('play')}</button></div>` : ''}</div>
      <div><h2>Songs</h2>${trackRows(songs, { context: ctx, compact: false })}</div>
    </div>
    ${d.previews.length ? `<h2>From the mainstream catalog <small>30-sec previews</small></h2>${trackRows(d.previews.slice(0, 6), { context: ctx })}` : ''}
    ${d.artists.length ? `<h2>Artists</h2><div class="shelf">${d.artists.slice(0, 10).map(artistCard).join('')}</div>` : ''}
    ${d.playlists.length ? `<h2>Playlists</h2><div class="shelf">${d.playlists.slice(0, 10).map(playlistCard).join('')}</div>` : ''}
    ${d.radio.length ? `<h2>Radio stations</h2><div class="shelf">${stationCards(d.radio.slice(0, 10))}</div>` : ''}`;
  } else if (searchTab === 'tracks') html += trackRows(d.tracks, { context: ctx });
  else if (searchTab === 'previews') html += `<p class="note">The mainstream catalog (major-label music) can only be streamed as 30-second previews outside of the licensed apps. Use “Open full song” in the Now Playing panel to jump to the full version.</p>${trackRows(d.previews, { context: ctx })}`;
  else if (searchTab === 'playlists') html += `<div class="grid">${d.playlists.map(playlistCard).join('')}</div>`;
  else if (searchTab === 'artists') html += `<div class="grid">${d.artists.map(artistCard).join('')}</div>`;
  else if (searchTab === 'radio') html += `<div class="grid">${stationCards(d.radio)}</div>`;
  box.innerHTML = html;
  markPlayingRows();
}

function collectionView({ kicker, title, sub, artwork, round, tracks, context, extra = '', actions = '', playlistId }) {
  const lid = registerList(tracks, { context });
  return `<div class="hero"><img class="hero-art ${round ? 'round' : ''}" src="${art(artwork)}" alt="">
    <div><div class="hero-kicker">${esc(kicker)}</div><h1>${esc(title)}</h1><div class="hero-sub">${sub}</div></div></div>
    <div class="actions">
      ${tracks.length ? `<button class="big-play" data-card-play="list:${lid}:0" title="Play">${icon('play')}</button>
      <button class="icon-btn" data-action="shuffle-play" data-list="${lid}" title="Shuffle play">${icon('shuffle')}</button>` : ''}
      ${actions}
    </div>
    ${extra}
    ${trackRows(tracks, { list: lid, context, playlistId })}`;
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
  }), `hsl(${hueOf(p.name)} 45% 30%)`);
}

async function viewArtist(token, id) {
  const a = await api(`/api/artist/${encodeURIComponent(id)}`);
  if (token !== renderToken) return;
  const href = `#/artist/${encodeURIComponent(id)}`;
  pushRecentCollection({ href, name: a.name, artwork: a.artwork });
  setView(collectionView({
    kicker: a.verified ? '✓ Verified artist' : 'Artist', title: a.name, artwork: a.artwork, round: true, tracks: a.tracks,
    context: { name: a.name, href }, sub: `${a.followers.toLocaleString()} followers · @${esc(a.handle)}`,
    extra: a.bio ? `<p class="note" style="max-width:720px">${esc(a.bio)}</p><h2>Popular</h2>` : '<h2>Popular</h2>',
  }), `hsl(${hueOf(a.name)} 40% 30%)`);
}

async function viewGenre(token, name) {
  if (name === 'All') {
    const d = await api('/api/home');
    if (token !== renderToken) return;
    return setView(collectionView({ kicker: 'Chart', title: 'Trending this week', artwork: d.trending[0]?.artwork, tracks: d.trending, context: { name: 'Trending this week', href: '#/genre/All' }, sub: 'The hottest tracks on Audius right now' }), '#4c1d95');
  }
  const d = await api(`/api/genre/${encodeURIComponent(name)}`);
  if (token !== renderToken) return;
  const href = `#/genre/${encodeURIComponent(name)}`;
  setView(collectionView({
    kicker: 'Genre', title: name, artwork: d.tracks[0]?.artwork, tracks: d.tracks, context: { name: `${name} mix`, href },
    sub: `${d.tracks.length} trending songs`,
    extra: d.radio.length ? `<h2>${esc(name)} radio</h2><div class="shelf">${stationCards(d.radio.slice(0, 12))}</div><h2>Trending songs</h2>` : '',
  }), `hsl(${hueOf(name)} 55% 35%)`);
}

const RADIO_TAGS = ['pop', 'rock', 'jazz', 'classical', 'dance', 'hiphop', 'news', 'chillout', 'lounge', 'country', 'oldies', '80s', 'electronic', 'ambient', 'talk', 'latin'];
async function viewRadio(token, params) {
  const tag = params.get('tag') || '';
  setView(`<h1 class="greeting">Live radio</h1><div class="pills">${['', ...RADIO_TAGS].map((t) => `<a class="pill ${t === tag ? 'active' : ''}" href="#/radio${t ? `?tag=${t}` : ''}">${t || 'Most popular'}</a>`).join('')}</div><div class="skeleton"></div>`);
  const stations = await api(`/api/radio${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`);
  if (token !== renderToken) return;
  $('.skeleton', main)?.replaceWith(Object.assign(document.createElement('div'), { className: 'grid', innerHTML: stationCards(stations) }));
}

function viewLibrary() {
  const pls = library.playlists;
  setView(`<h1 class="greeting">Your Library</h1>
    <div class="grid">
      <a class="card" href="#/liked"><div class="card-art liked-tile" style="width:100%;height:auto;aspect-ratio:1;border-radius:6px">${icon('heart-fill')}</div><div class="card-title">Liked Songs</div><div class="card-sub">${library.liked.length} songs</div></a>
      ${pls.map((p) => card({ href: `#/my/${p.id}`, img: p.tracks[0]?.artwork, title: p.name, sub: `Playlist · ${p.tracks.length} songs` })).join('')}
      <button class="card" data-action="new-playlist" style="text-align:left"><div class="card-art" style="display:grid;place-items:center">${icon('plus')}</div><div class="card-title">New playlist</div><div class="card-sub">Create a playlist</div></button>
    </div>
    <h2>Recently played</h2>${trackRows(library.recent, { context: { name: 'Recently played', href: '#/library' } })}`);
}

function viewLiked() {
  setView(collectionView({
    kicker: 'Playlist', title: 'Liked Songs', artwork: null, tracks: library.liked, context: { name: 'Liked Songs', href: '#/liked' },
    sub: `${library.liked.length} songs`,
  }), '#5b21b6');
  $('.hero-art', main).outerHTML = `<div class="hero-art liked-tile">${icon('heart-fill')}</div>`;
  $('.hero .liked-tile svg', main).style.cssText = 'width:72px;height:72px';
}

function viewMyPlaylist(token, id) {
  const p = library.playlists.find((x) => x.id === id);
  if (!p) return setView('<div class="empty">Playlist not found.</div>');
  const href = `#/my/${id}`;
  setView(collectionView({
    kicker: 'Your playlist', title: p.name, artwork: p.tracks[0]?.artwork, tracks: p.tracks, context: { name: p.name, href }, playlistId: p.id,
    sub: `${p.tracks.length} songs, ${fmt(p.tracks.reduce((s, t) => s + (t.duration || 0), 0))}`,
    extra: p.tracks.length ? '' : '<p class="note">Add songs with the ⋯ menu on any track.</p>',
    actions: `<button class="icon-btn" data-action="rename-playlist" data-pid="${p.id}" title="Rename">${icon('edit')}</button>
      <button class="icon-btn" data-action="delete-playlist" data-pid="${p.id}" title="Delete">${icon('trash')}</button>`,
  }), `hsl(${hueOf(p.name)} 45% 30%)`);
}

async function viewSettings(token) {
  const eq = library.settings.eq;
  setView(`<h1 class="greeting">Settings</h1>
    <div class="settings-card"><h3>Sonos speakers</h3>
      <p class="note">Encore talks to your Sonos speakers directly over your home network: no Sonos account needed. Run the Encore server on a computer on the same Wi-Fi as the speakers.</p>
      <div id="sonos-groups"><div class="note">Searching…</div></div>
      <div class="field"><input type="text" id="sonos-ip" placeholder="Add a speaker by IP address (e.g. 192.168.1.40)"><button class="btn ghost" data-action="sonos-add">Add</button><button class="btn" data-action="sonos-refresh">${'Search again'}</button></div>
    </div>
    <div class="settings-card"><h3>Equalizer</h3>
      <p class="note">Applies to playback on this device. (Use the Sonos app for speaker EQ.)</p>
      <div class="pills" style="margin-top:12px">${Object.keys(EQ_PRESETS).map((n) => `<button class="pill ${library.settings.eqPreset === n ? 'active' : ''}" data-eq-preset="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <div class="eq">${EQ_FREQS.map((f, i) => `<div class="eq-band"><span data-eq-val="${i}">${eq[i] > 0 ? '+' : ''}${eq[i]} dB</span><input class="vertical" type="range" min="-12" max="12" step="1" value="${eq[i]}" data-eq="${i}"><span>${f >= 1000 ? `${f / 1000}k` : f} Hz</span></div>`).join('')}</div>
    </div>
    <div class="settings-card"><h3>Keyboard shortcuts</h3>
      <div class="kbd"><kbd>Space</kbd>Play / pause<kbd>→ / ←</kbd>Seek 10 seconds<kbd>Shift + → / ←</kbd>Next / previous song<kbd>↑ / ↓</kbd>Volume<kbd>M</kbd>Mute<kbd>S</kbd>Shuffle<kbd>R</kbd>Repeat<kbd>L</kbd>Like current song<kbd>/</kbd>Search</div>
    </div>
    <div class="settings-card"><h3>Your data</h3>
      <p class="note">Your likes and playlists are saved on the Encore server (data/library.json), so they follow you between devices on your network.</p>
      <div class="field"><button class="btn ghost" data-action="export-library">Export library</button><button class="btn ghost" data-action="import-library">Import library</button></div>
    </div>`);
  $$('[data-eq]', main).forEach((el) => { el.style.setProperty('--pct', `${((Number(el.value) + 12) / 24) * 100}%`); });
  renderSonosSettings(false);
}

async function renderSonosSettings(refresh) {
  const box = $('#sonos-groups');
  if (!box) return;
  box.innerHTML = '<div class="note">Searching…</div>';
  let data;
  try { data = await fetchGroups(refresh || !groupsCache); } catch (e) { box.innerHTML = `<div class="note">${esc(e.message)}</div>`; return; }
  if (!$('#sonos-groups')) return;
  if (!data.groups.length) {
    box.innerHTML = `<div class="note" style="margin-top:12px">No speakers found yet. Make sure this server is on the same network as your Sonos system. Speakers stream audio from <b>${esc(data.publicUrl)}</b>, so that address must be reachable from them.</div>`;
    return;
  }
  const all = data.groups.flatMap((g) => g.members.map((m) => ({ ...m, group: g })));
  box.innerHTML = data.groups.map((g) => `
    <div class="np-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div><b>${esc(g.name)}</b><div class="note">${g.members.length > 1 ? 'Group' : 'Speaker'} · ${esc(g.host)}</div></div>
      <button class="btn ${player.cast?.id === g.id ? '' : 'ghost'}" data-cast-group="${esc(g.id)}">${player.cast?.id === g.id ? 'Playing here' : 'Play here'}</button>
    </div>
    <div class="field">
      ${g.members.length > 1 ? g.members.slice(1).map((m) => `<button class="pill" data-sonos-leave="${esc(m.uuid)}">Ungroup ${esc(m.name)}</button>`).join('') : ''}
      ${all.filter((m) => m.group !== g && m.group.members.length === 1).map((m) => `<button class="pill" data-sonos-join="${esc(m.uuid)}" data-coordinator="${esc(g.id)}">+ Add ${esc(m.name)}</button>`).join('')}
    </div></div>`).join('');
}

// ================================================================ router
const routes = {
  home: viewHome, search: viewSearch, playlist: viewPlaylist, artist: viewArtist, genre: viewGenre, radio: viewRadio,
  library: viewLibrary, liked: viewLiked, my: viewMyPlaylist, settings: viewSettings,
};
async function route() {
  const [pathPart, query = ''] = (location.hash.slice(1) || '/home').split('?');
  const [, name = 'home', ...rest] = pathPart.split('/');
  const arg = decodeURIComponent(rest.join('/'));
  const params = new URLSearchParams(query);
  const token = ++renderToken;
  closePopover();
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name || (name === 'liked' || name === 'my') && a.dataset.nav === 'library'));
  $$('.sidebar-item').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${pathPart}`));
  if (name !== 'search') main.scrollTop = 0;
  if (window.innerWidth <= 860) $('#app').classList.add('panel-closed');
  const view = routes[name] || viewHome;
  if (!['library', 'liked', 'my', 'settings', 'home', 'search', 'radio'].includes(name)) loading();
  try { await view(token, name === 'search' || name === 'radio' ? params : arg); } catch (e) { if (token === renderToken) failed(e); }
}
window.addEventListener('hashchange', route);

function renderSidebar() {
  $('#sidebar-playlists').innerHTML = library.playlists.map((p) => `
    <a class="sidebar-item" href="#/my/${p.id}"><img class="mini-art" src="${art(p.tracks[0]?.artwork)}" alt="">${esc(p.name)}</a>`).join('');
}

// ================================================================ popovers & menus
const popover = $('#popover');
function openPopover(anchor, html, dir = 'down') {
  popover.innerHTML = html;
  popover.hidden = false;
  positionPopover(anchor, dir);
  return popover;
}
function positionPopover(anchor, dir) {
  const r = anchor.getBoundingClientRect();
  const pw = popover.offsetWidth, ph = popover.offsetHeight;
  let left = Math.min(window.innerWidth - pw - 8, Math.max(8, r.right - pw));
  let top = dir === 'up' ? r.top - ph - 8 : r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  if (top < 8) top = Math.min(window.innerHeight - ph - 8, r.bottom + 6);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}
function closePopover() { popover.hidden = true; popover.innerHTML = ''; }

function openTrackMenu(anchor, track, { playlistId, listId, index } = {}) {
  const pls = library.playlists;
  const pop = openPopover(anchor, `
    <button class="menu-item" data-m="next">${icon('play-next')}Play next</button>
    <button class="menu-item" data-m="queue">${icon('queue')}Add to queue</button>
    <button class="menu-item" data-m="like">${icon(isLiked(track.id) ? 'heart-fill' : 'heart')}${isLiked(track.id) ? 'Remove from Liked Songs' : 'Save to Liked Songs'}</button>
    <div class="menu-sep"></div>
    <div class="menu-head">Add to playlist</div>
    <button class="menu-item" data-m="newpl">${icon('plus')}New playlist</button>
    ${pls.map((p) => `<button class="menu-item" data-m="pl" data-pid="${p.id}">${icon('library')}${esc(p.name)}</button>`).join('')}
    ${playlistId ? `<div class="menu-sep"></div><button class="menu-item" data-m="remove">${icon('trash')}Remove from this playlist</button>` : ''}
    <div class="menu-sep"></div>
    ${track.artistId ? `<a class="menu-item" href="#/artist/${encodeURIComponent(track.artistId)}">${icon('user')}Go to artist</a>` : ''}
    ${track.genre ? `<a class="menu-item" href="#/genre/${encodeURIComponent(track.genre)}">${icon('radio')}Go to ${esc(track.genre)} mix</a>` : ''}
    ${track.externalUrl ? `<a class="menu-item" href="${esc(track.externalUrl)}" target="_blank" rel="noopener">${icon('external')}Open full song</a>` : ''}
    ${track.source === 'audius' ? `<button class="menu-item" data-m="share">${icon('link')}Copy link</button>` : ''}`);
  pop.onclick = (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) { if (e.target.closest('a')) closePopover(); return; }
    const m = b.dataset.m;
    if (m === 'next') addToQueue([track], true);
    else if (m === 'queue') addToQueue([track]);
    else if (m === 'like') toggleLike(track);
    else if (m === 'newpl') { const p = createPlaylist(null, [track]); toast(`Created ${p.name}`); }
    else if (m === 'pl') addToPlaylist(b.dataset.pid, [track]);
    else if (m === 'share') navigator.clipboard?.writeText(`${location.origin}/#/search?q=${encodeURIComponent(`${track.title} ${track.artist}`)}`).then(() => toast('Link copied'));
    else if (m === 'remove') {
      const p = library.playlists.find((x) => x.id === playlistId);
      if (p) { p.tracks.splice(index, 1); saveLibrary(); route(); }
    }
    closePopover();
  };
}

// ================================================================ global event handling
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!popover.hidden && !popover.contains(t) && !t.closest('[data-action=cast],[data-action=sleep],[data-more]')) closePopover();

  const more = t.closest('[data-more]');
  if (more) {
    e.preventDefault();
    const row = more.closest('.track');
    const l = lists.get(row.dataset.list);
    const i = Number(row.dataset.i);
    if (l) openTrackMenu(more, l.tracks[i], { playlistId: row.dataset.playlist, listId: row.dataset.list, index: i });
    return;
  }
  const like = t.closest('[data-like]');
  if (like) {
    const row = like.closest('.track');
    const l = lists.get(row.dataset.list);
    toggleLike(l?.tracks[Number(row.dataset.i)]);
    return;
  }
  const playRow = t.closest('[data-play-row]');
  if (playRow) { playFromRow(playRow.closest('.track')); return; }

  const cardPlay = t.closest('[data-card-play]');
  if (cardPlay && (t.closest('[data-card-play-btn]') || !cardPlay.getAttribute('href') || cardPlay.getAttribute('href') === '#' || cardPlay.matches('.big-play,.top-result'))) {
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

  const panelBtn = t.closest('[data-panel]');
  if (panelBtn) { panelTab = panelBtn.dataset.panel; renderPanel(); return; }
  const panelOpen = t.closest('[data-panel-open]');
  if (panelOpen) { openPanel(panelOpen.dataset.panelOpen); return; }
  if (window.innerWidth <= 860 && t.closest('.player-track')) { openPanel('now'); return; }

  const tab = t.closest('[data-search-tab]');
  if (tab) { searchTab = tab.dataset.searchTab; renderSearch(); return; }

  const preset = t.closest('[data-eq-preset]');
  if (preset) {
    library.settings.eqPreset = preset.dataset.eqPreset;
    library.settings.eq = EQ_PRESETS[preset.dataset.eqPreset].slice();
    applyEq(); saveLibrary(); route();
    return;
  }

  const castGroup = t.closest('[data-cast-group]');
  if (castGroup) {
    const g = groupsCache?.groups.find((x) => x.id === castGroup.dataset.castGroup);
    if (g) startCast(g).then(() => renderSonosSettings(false));
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
  else if (a === 'mute') toggleMute();
  else if (a === 'cast') popover.hidden ? openCastPicker(action) : closePopover();
  else if (a === 'sleep') popover.hidden ? openSleepMenu(action) : closePopover();
  else if (a === 'toggle-panel') $('#app').classList.toggle('panel-closed');
  else if (a === 'new-playlist') { const p = createPlaylist(); location.hash = `#/my/${p.id}`; }
  else if (a === 'shuffle-play') {
    const l = lists.get(action.dataset.list);
    if (l) { player.shuffle = true; playList(l.tracks, Math.floor(Math.random() * l.tracks.length), l.context); }
  } else if (a === 'save-playlist') {
    const l = lists.get($('.big-play', main)?.dataset.cardPlay.split(':')[1]);
    if (l) { const p = createPlaylist(action.dataset.listSave, l.tracks); toast(`Saved “${p.name}” to your library`); }
  } else if (a === 'rename-playlist') {
    const p = library.playlists.find((x) => x.id === action.dataset.pid);
    const name = p && prompt('Playlist name', p.name);
    if (name) { p.name = name.trim() || p.name; saveLibrary(); route(); }
  } else if (a === 'delete-playlist') {
    const p = library.playlists.find((x) => x.id === action.dataset.pid);
    if (p && confirm(`Delete “${p.name}”?`)) { library.playlists = library.playlists.filter((x) => x !== p); saveLibrary(); location.hash = '#/library'; }
  } else if (a === 'sonos-refresh') renderSonosSettings(true);
  else if (a === 'sonos-add') {
    const host = $('#sonos-ip').value.trim();
    if (host) api('/api/sonos/hosts', { method: 'POST', body: { host } }).then((d) => { groupsCache = { ...groupsCache, ...d }; renderSonosSettings(false); toast(d.groups.length ? 'Speakers found' : 'No Sonos speaker answered at that address'); }).catch((err) => toast(err.message));
  } else if (a === 'export-library') {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'encore-library.json' }).click();
  } else if (a === 'import-library') {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json' });
    inp.onchange = async () => {
      try {
        const data = JSON.parse(await inp.files[0].text());
        Object.assign(library, data);
        saveLibrary(); toast('Library imported'); route();
      } catch { toast('That file is not an Encore library'); }
    };
    inp.click();
  }
});

document.addEventListener('dblclick', (e) => {
  const row = e.target.closest('.track');
  if (row && !e.target.closest('button,a')) playFromRow(row);
});
// Single tap plays on touch screens (no hover, no double-click).
document.addEventListener('click', (e) => {
  if (!matchMedia('(hover: none)').matches) return;
  const row = e.target.closest('.track');
  if (row && !e.target.closest('button,a')) playFromRow(row);
});

function playFromRow(row) {
  const listId = row.dataset.list;
  const i = Number(row.dataset.i);
  if (listId === 'np') return togglePlay();
  if (listId === 'upnext') { player.index += i + 1; return loadAndPlay(); }
  if (listId === 'manual') {
    const [t] = player.manual.splice(i, 1);
    player.queue.splice(player.index + 1, 0, t);
    player.index++;
    return loadAndPlay();
  }
  const l = lists.get(listId);
  if (l) playList(l.tracks, i, l.context);
}

let preMute = 0.8;
function toggleMute() {
  const v = player.cast ? (player.castVolume ?? 30) / 100 : library.settings.volume;
  if (v > 0) { preMute = v; setVolume(0); } else setVolume(preMute || 0.5);
}

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'p-seek') { seeking = true; setRangePct(el); $('#p-time').textContent = fmt((el.value / 1000) * player.duration); }
  else if (el.id === 'p-vol') { setRangePct(el); setVolume(el.value / 100); }
  else if (el.dataset.eq != null) {
    const i = Number(el.dataset.eq);
    library.settings.eq[i] = Number(el.value);
    library.settings.eqPreset = 'Custom';
    el.style.setProperty('--pct', `${((Number(el.value) + 12) / 24) * 100}%`);
    $(`[data-eq-val="${i}"]`).textContent = `${el.value > 0 ? '+' : ''}${el.value} dB`;
    applyEq();
    clearTimeout(applyEq.t);
    applyEq.t = setTimeout(saveLibrary, 400);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'p-seek') { seeking = false; seek((e.target.value / 1000) * player.duration); }
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input[type=text],input[type=search],textarea') || e.metaKey || e.ctrlKey || e.altKey) {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  const k = e.key;
  if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === 'ArrowRight') { e.preventDefault(); e.shiftKey ? next() : seek(Math.min(player.duration, player.position + 10)); }
  else if (k === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? prev() : seek(Math.max(0, player.position - 10)); }
  else if (k === 'ArrowUp') { e.preventDefault(); setVolume((player.cast ? (player.castVolume ?? 30) / 100 : library.settings.volume) + 0.05); }
  else if (k === 'ArrowDown') { e.preventDefault(); setVolume((player.cast ? (player.castVolume ?? 30) / 100 : library.settings.volume) - 0.05); }
  else if (k === 'm' || k === 'M') toggleMute();
  else if (k === 's' || k === 'S') toggleShuffle();
  else if (k === 'r' || k === 'R') cycleRepeat();
  else if (k === 'l' || k === 'L') toggleLike(current());
  else if (k === '/') { e.preventDefault(); location.hash = '#/search'; }
  else if (k === 'Escape') closePopover();
});

// ================================================================ boot
(async function boot() {
  hydrateIcons();
  await initLibrary();
  audio.volume = library.settings.volume;
  if (window.innerWidth <= 1180) $('#app').classList.add('panel-closed');
  renderSidebar();
  updatePlayerUI();
  renderPanel();
  route();
  fetchGroups().catch(() => {}); // warm up Sonos discovery in the background
})();

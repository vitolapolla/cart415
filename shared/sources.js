// Music sources. Every source is normalised into the same Track shape:
// { id, source, title, artist, artistId, album, artwork, duration, genre,
//   stream, kind: 'full' | 'preview' | 'live' }
// Runs both in Node (the Encore server) and in the browser / Android app.
// In server mode `stream` points at the server's relay (/stream/...), so the
// browser gets same-origin audio (needed for the equalizer) and Sonos gets a
// LAN URL. In direct mode (app, static website) it is the source's own URL.

const APP_NAME = 'encore';
const AUDIUS = 'https://api.audius.co/v1';
// radio-browser runs several mirrors; fall back if one is down.
const RADIO_MIRRORS = ['de1', 'fi1', 'de2', 'nl1'].map((m) => `https://${m}.api.radio-browser.info/json`);
const RADIO = '@radio';

const cache = new Map();
const IS_BROWSER = typeof window !== 'undefined';
let direct = false;

export function configure(opts) {
  direct = !!opts.direct;
}

async function getJSON(url, opts = {}) {
  if (!url.startsWith(RADIO)) return fetchJSON(url, opts);
  let err;
  for (const mirror of RADIO_MIRRORS) {
    try { return await fetchJSON(mirror + url.slice(RADIO.length), opts); } catch (e) { err = e; }
  }
  throw err;
}

async function fetchJSON(url, { ttl = 60_000 } = {}) {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.value;
  // Browsers manage User-Agent themselves (and a custom one would force a CORS preflight).
  const headers = IS_BROWSER ? {} : { 'User-Agent': `${APP_NAME}/0.1` };
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  const value = await res.json();
  cache.set(url, { value, expires: Date.now() + ttl });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return value;
}

// ---------------------------------------------------------------- Audius
// Full-length, free, artist-uploaded tracks.

function audiusUrl(path, params = {}) {
  const u = new URL(AUDIUS + path);
  u.searchParams.set('app_name', APP_NAME);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, v);
  return u.toString();
}

function audiusArt(art) {
  return art?.['480x480'] || art?.['1000x1000'] || art?.['150x150'] || null;
}

function audiusTrack(t) {
  return {
    id: `audius:${t.id}`,
    source: 'audius',
    title: t.title,
    artist: t.user?.name || 'Unknown artist',
    artistId: t.user ? `audius:${t.user.id}` : null,
    album: null,
    artwork: audiusArt(t.artwork),
    duration: t.duration || 0,
    genre: t.genre || null,
    mood: t.mood || null,
    plays: t.play_count || 0,
    stream: direct ? audiusUrl(`/tracks/${t.id}/stream`) : `/stream/audius/${t.id}.mp3`,
    kind: 'full',
  };
}

const playable = (t) => t && t.is_streamable !== false && !t.is_stream_gated && !t.is_delete;

function audiusPlaylist(p) {
  return {
    id: `audius:${p.id}`,
    source: 'audius',
    name: p.playlist_name,
    owner: p.user?.name || '',
    artwork: audiusArt(p.artwork),
    trackCount: p.track_count || 0,
    description: p.description || '',
    isAlbum: !!p.is_album,
  };
}

function audiusArtist(u) {
  return {
    id: `audius:${u.id}`,
    source: 'audius',
    name: u.name,
    handle: u.handle,
    artwork: audiusArt(u.profile_picture),
    cover: u.cover_photo?.['2000x'] || u.cover_photo?.['640x'] || null,
    followers: u.follower_count || 0,
    bio: u.bio || '',
    verified: !!u.is_verified,
  };
}

export const audius = {
  async trending({ genre, time = 'week', limit = 30 } = {}) {
    const { data } = await getJSON(audiusUrl('/tracks/trending', { genre, time, limit }), { ttl: 10 * 60_000 });
    return data.filter(playable).map(audiusTrack);
  },
  async underground() {
    const { data } = await getJSON(audiusUrl('/tracks/trending/underground', { limit: 30 }), { ttl: 10 * 60_000 });
    return data.filter(playable).map(audiusTrack);
  },
  async searchTracks(q) {
    const { data } = await getJSON(audiusUrl('/tracks/search', { query: q, limit: 30 }));
    return data.filter(playable).map(audiusTrack);
  },
  async searchPlaylists(q) {
    const { data } = await getJSON(audiusUrl('/playlists/search', { query: q, limit: 20 }));
    return data.filter((p) => !p.is_private).map(audiusPlaylist);
  },
  async searchArtists(q) {
    const { data } = await getJSON(audiusUrl('/users/search', { query: q, limit: 20 }));
    return data.map(audiusArtist);
  },
  async trendingPlaylists() {
    const { data } = await getJSON(audiusUrl('/playlists/trending', { limit: 20 }), { ttl: 10 * 60_000 });
    return data.filter((p) => !p.is_private).map(audiusPlaylist);
  },
  async playlist(id) {
    const [{ data: [p] }, { data: tracks }] = await Promise.all([
      getJSON(audiusUrl(`/playlists/${id}`)),
      getJSON(audiusUrl(`/playlists/${id}/tracks`)),
    ]);
    return { ...audiusPlaylist(p), tracks: tracks.filter(playable).map(audiusTrack) };
  },
  async artist(id) {
    const [{ data: u }, { data: tracks }] = await Promise.all([
      getJSON(audiusUrl(`/users/${id}`)),
      getJSON(audiusUrl(`/users/${id}/tracks`, { limit: 50, sort: 'plays' })),
    ]);
    return { ...audiusArtist(u), tracks: tracks.filter(playable).map(audiusTrack) };
  },
  async track(id) {
    const { data } = await getJSON(audiusUrl(`/tracks/${id}`), { ttl: 60 * 60_000 });
    return audiusTrack(data);
  },
  streamUrl(id) {
    return audiusUrl(`/tracks/${id}/stream`);
  },
  // The final (signed) file URL, for players that don't follow redirects well.
  async resolvedStreamUrl(id) {
    const { data } = await fetchJSON(audiusUrl(`/tracks/${id}/stream`, { no_redirect: 'true' }), { ttl: 0 });
    return data;
  },
};

// ---------------------------------------------------------------- iTunes
// The mainstream catalog. Apple only allows 30-second previews.

function itunesTrack(r) {
  return {
    id: `itunes:${r.trackId}`,
    source: 'itunes',
    title: r.trackName,
    artist: r.artistName,
    artistId: null,
    album: r.collectionName || null,
    artwork: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : null,
    duration: 30,
    fullDuration: Math.round((r.trackTimeMillis || 0) / 1000),
    genre: r.primaryGenreName || null,
    stream: direct ? r.previewUrl : `/stream/itunes/${r.trackId}.m4a`,
    externalUrl: r.trackViewUrl,
    kind: 'preview',
  };
}

export const itunes = {
  async search(q) {
    const u = new URL('https://itunes.apple.com/search');
    u.search = new URLSearchParams({ term: q, entity: 'song', limit: '30' });
    const { results } = await getJSON(u.toString());
    return results.filter((r) => r.previewUrl).map(itunesTrack);
  },
  async previewUrl(id) {
    const { results } = await getJSON(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`, { ttl: 60 * 60_000 });
    if (!results[0]?.previewUrl) throw new Error('No preview available');
    return results[0].previewUrl;
  },
};

// ---------------------------------------------------------------- Radio
// ~50k live internet radio stations from radio-browser.info.

const isPlayableStation = (s) => s.url_resolved && !s.hls && /mp3|aac/i.test(s.codec || '') &&
  // An https web page can't play http streams (mixed content).
  !(direct && IS_BROWSER && location.protocol === 'https:' && s.url_resolved.startsWith('http:'));

function station(s) {
  return {
    id: `radio:${s.stationuuid}`,
    source: 'radio',
    title: s.name.trim(),
    artist: [s.country, s.tags?.split(',').slice(0, 2).join(', ')].filter(Boolean).join(' · ') || 'Live radio',
    artistId: null,
    album: null,
    artwork: s.favicon || null,
    duration: 0,
    genre: s.tags?.split(',')[0] || null,
    codec: s.codec,
    bitrate: s.bitrate,
    stream: direct ? s.url_resolved : `/stream/radio/${s.stationuuid}.${/aac/i.test(s.codec) ? 'aac' : 'mp3'}`,
    kind: 'live',
  };
}

export const radio = {
  async top() {
    const data = await getJSON(`${RADIO}/stations/topclick/80`, { ttl: 30 * 60_000 });
    return data.filter(isPlayableStation).slice(0, 40).map(station);
  },
  async search(q) {
    const qs = new URLSearchParams({ name: q, limit: '40', order: 'clickcount', reverse: 'true', hidebroken: 'true' });
    const data = await getJSON(`${RADIO}/stations/search?${qs}`);
    return data.filter(isPlayableStation).map(station);
  },
  async byTag(tag) {
    const qs = new URLSearchParams({ limit: '60', order: 'clickcount', reverse: 'true', hidebroken: 'true' });
    const data = await getJSON(`${RADIO}/stations/bytag/${encodeURIComponent(tag)}?${qs}`, { ttl: 30 * 60_000 });
    return data.filter(isPlayableStation).slice(0, 40).map(station);
  },
  async streamUrl(uuid) {
    const [s] = await getJSON(`${RADIO}/stations/byuuid/${encodeURIComponent(uuid)}`, { ttl: 60 * 60_000 });
    if (!s) throw new Error('Station not found');
    // Count the click, as radio-browser asks clients to do. Fire and forget.
    fetch(`${RADIO_MIRRORS[0]}/url/${encodeURIComponent(uuid)}`).catch(() => {});
    return s.url_resolved;
  },
};

// ---------------------------------------------------------------- Lyrics
// Synced (LRC) and plain lyrics from lrclib.net.

export async function lyrics({ title, artist, duration }) {
  const clean = (s) => (s || '').replace(/\s*[([].*?(remix|mix|edit|version|feat|ft\.).*?[)\]]/gi, '').trim();
  const u = new URL('https://lrclib.net/api/search');
  u.search = new URLSearchParams({ track_name: clean(title), artist_name: clean(artist) });
  const results = await getJSON(u.toString(), { ttl: 60 * 60_000 });
  if (!results.length) return null;
  // Prefer a synced match whose length is close to ours.
  const score = (r) => (r.syncedLyrics ? 0 : 1000) + (duration ? Math.abs(r.duration - duration) : 0);
  const best = [...results].sort((a, b) => score(a) - score(b))[0];
  return { synced: best.syncedLyrics || null, plain: best.plainLyrics || null, instrumental: !!best.instrumental };
}

export const GENRES = [
  'Electronic', 'Hip-Hop/Rap', 'Pop', 'R&B/Soul', 'Rock', 'Alternative', 'House', 'Techno',
  'Lo-Fi', 'Ambient', 'Jazz', 'Dubstep', 'Drum & Bass', 'Latin', 'Classical', 'Country',
  'Reggae', 'Metal', 'Funk', 'Soundtrack',
];

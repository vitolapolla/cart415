// The Encore API, independent of transport. The Node server exposes it over
// HTTP at /api/*; the Android app and the static website call it in-process.
//
// env = {
//   findSpeakers(): Promise<string[]>   hosts found by SSDP on this platform
//   loadLibrary(), saveLibrary(lib)     persistence
//   castUrl(track): Promise<string>     URL a Sonos speaker should fetch for a track
// }

import { audius, itunes, radio, lyrics, GENRES } from './sources.js';
import * as sonos from './sonos.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const settled = async (p) => { try { return await p; } catch (e) { console.warn(e.message); return []; } };
const stripId = (id) => decodeURIComponent(id || '').replace(/^\w+:/, '');
const MIME = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac' };

function mimeFor(track, uri) {
  const ext = (uri.split('?')[0].match(/\.(mp3|m4a|aac)$/i) || [])[1];
  if (ext) return MIME[ext.toLowerCase()];
  if (track.source === 'itunes') return MIME.m4a;
  if (track.source === 'radio' && /aac/i.test(track.codec || '')) return MIME.aac;
  return MIME.mp3;
}

export function createApi(env) {
  async function sonosRoute(method, parts, body, query) {
    const [first, action] = parts;
    if (first === 'groups' && method === 'GET') {
      const groups = query.get('refresh') || !sonos.cachedGroups().length
        ? await sonos.discover(await env.findSpeakers().catch(() => []))
        : sonos.cachedGroups();
      return { groups, publicUrl: env.publicUrl || null };
    }
    if (first === 'hosts' && method === 'POST') {
      if (!/^[\w.-]+(:\d+)?$/.test(body.host || '')) throw new ApiError(400, 'Invalid host');
      sonos.addHost(body.host);
      return { groups: await sonos.discover() };
    }
    if ((first === 'join' || first === 'leave') && method === 'POST') {
      const host = sonos.memberHost(body.member);
      if (!host) throw new ApiError(404, 'Unknown speaker');
      if (first === 'join') await sonos.joinGroup(host, body.coordinator);
      else await sonos.leaveGroup(host);
      return { groups: await sonos.discover() };
    }

    const host = sonos.hostFor(decodeURIComponent(first || ''));
    if (!host) throw new ApiError(404, 'Unknown Sonos group. Refresh the speaker list.');
    if (action === 'status' && method === 'GET') return sonos.status(host);
    if (method !== 'POST') throw new ApiError(405, 'Method not allowed');
    switch (action) {
      case 'play': {
        const t = body.track || {};
        const uri = await env.castUrl(t);
        await sonos.playUri(host, {
          uri, title: t.title, artist: t.artist, album: t.album, artwork: t.artwork,
          duration: t.duration, mime: mimeFor(t, uri), live: t.kind === 'live',
        });
        if (body.position > 1 && t.kind !== 'live') await sonos.seek(host, body.position).catch(() => {});
        break;
      }
      case 'resume': await sonos.play(host); break;
      case 'pause': await sonos.pause(host); break;
      case 'stop': await sonos.stop(host); break;
      case 'seek': await sonos.seek(host, Number(body.position) || 0); break;
      case 'volume': await sonos.setGroupVolume(host, Number(body.volume)); break;
      default: throw new ApiError(404, 'Unknown action');
    }
    return { ok: true };
  }

  // path: e.g. "/api/search?q=x" or "/search?q=x"
  return async function handle(method, path, body = {}) {
    const url = new URL(path, 'http://encore');
    const parts = url.pathname.replace(/^\/api/, '').split('/').filter(Boolean);
    const q = url.searchParams;
    const [route, arg] = parts;

    switch (route) {
      case 'home': {
        const [trending, underground, playlists, stations] = await Promise.all([
          settled(audius.trending()), settled(audius.underground()), settled(audius.trendingPlaylists()), settled(radio.top()),
        ]);
        return { trending, underground, playlists, radio: stations, genres: GENRES };
      }
      case 'search': {
        const term = (q.get('q') || '').trim();
        if (!term) return { tracks: [], previews: [], playlists: [], artists: [], radio: [] };
        const [tracks, previews, playlists, artists, stations] = await Promise.all([
          settled(audius.searchTracks(term)), settled(itunes.search(term)), settled(audius.searchPlaylists(term)),
          settled(audius.searchArtists(term)), settled(radio.search(term)),
        ]);
        return { tracks, previews, playlists, artists, radio: stations };
      }
      case 'genre': {
        const name = decodeURIComponent(arg || '');
        const [week, month] = await Promise.all([
          settled(audius.trending({ genre: name, time: 'week' })), settled(audius.trending({ genre: name, time: 'month' })),
        ]);
        const seen = new Set();
        const tracks = [...week, ...month].filter((t) => !seen.has(t.id) && seen.add(t.id));
        return { name, tracks, radio: await settled(radio.byTag(name.split('/')[0].toLowerCase())) };
      }
      case 'playlist': return audius.playlist(stripId(arg));
      case 'artist': return audius.artist(stripId(arg));
      case 'track': return audius.track(stripId(arg));
      case 'radio': return q.get('tag') ? radio.byTag(q.get('tag')) : radio.top();
      case 'lyrics':
        try {
          return (await lyrics({ title: q.get('title'), artist: q.get('artist'), duration: Number(q.get('duration')) })) || {};
        } catch {
          return {};
        }
      case 'library':
        if (method === 'GET') return (await env.loadLibrary()) || {};
        if (method === 'PUT') { await env.saveLibrary(body); return { ok: true }; }
        throw new ApiError(405, 'Method not allowed');
      case 'sonos': return sonosRoute(method, parts.slice(1), body, q);
      case 'info': return { publicUrl: env.publicUrl || null };
    }
    throw new ApiError(404, 'Not found');
  };
}

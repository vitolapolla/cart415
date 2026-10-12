import http from 'node:http';
import os from 'node:os';
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audius, itunes, radio, lyrics, GENRES } from './sources.js';
import * as sonos from './sonos.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const LIBRARY = path.join(DATA, 'library.json');
const PORT = Number(process.env.PORT) || 4415;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
};

// The address Sonos speakers use to fetch audio from this server.
function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) return i.address;
  }
  return '127.0.0.1';
}
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://${lanAddress()}:${PORT}`).replace(/\/$/, '');

// ---------------------------------------------------------------- helpers

function send(res, status, body, headers = {}) {
  const json = typeof body !== 'string';
  res.writeHead(status, { 'Content-Type': json ? 'application/json' : 'text/plain', ...headers });
  res.end(json ? JSON.stringify(body) : body);
}

async function readBody(req, limit = 5 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(c);
  }
  const text = Buffer.concat(chunks).toString();
  return text ? JSON.parse(text) : {};
}

const settled = async (p) => { try { return await p; } catch (e) { console.warn(e.message); return []; } };
const stripId = (id) => decodeURIComponent(id).replace(/^\w+:/, '');

// ---------------------------------------------------------------- audio proxy

async function proxyAudio(req, res, source, id) {
  let upstream;
  if (source === 'audius') upstream = audius.streamUrl(id);
  else if (source === 'itunes') upstream = await itunes.previewUrl(id);
  else if (source === 'radio') upstream = await radio.streamUrl(id);
  else return send(res, 404, { error: 'Unknown source' });

  const ac = new AbortController();
  res.on('close', () => ac.abort());
  const headers = { 'User-Agent': 'encore/0.1' };
  if (req.headers.range && source !== 'radio') headers.Range = req.headers.range;
  const up = await fetch(upstream, { headers, signal: ac.signal, redirect: 'follow' });
  if (!up.ok && up.status !== 206) return send(res, 502, { error: `Upstream returned ${up.status}` });

  const out = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = up.headers.get(h);
    if (v) out[h] = v;
  }
  // Apple serves previews as audio/x-m4p, which some players (and Sonos) reject.
  if (!out['content-type'] || /octet|x-m4p/.test(out['content-type'])) {
    out['content-type'] = MIME[path.extname(req.url.split('?')[0])] || 'audio/mpeg';
  }
  res.writeHead(up.status, out);
  if (req.method === 'HEAD' || !up.body) return res.end();
  Readable.fromWeb(up.body).on('error', () => res.destroy()).pipe(res);
}

// ---------------------------------------------------------------- library

async function loadLibrary() {
  try { return JSON.parse(await readFile(LIBRARY, 'utf8')); } catch { return null; }
}
async function saveLibrary(lib) {
  await mkdir(DATA, { recursive: true });
  await writeFile(LIBRARY, JSON.stringify(lib));
}

// ---------------------------------------------------------------- sonos

const STREAM_PATH = /^\/stream\/(audius|itunes|radio)\/[\w-]+\.(mp3|m4a|aac)$/;

async function sonosRoute(req, res, parts) {
  const [first, action] = parts;
  if (first === 'groups' && req.method === 'GET') {
    const refresh = new URL(req.url, 'http://x').searchParams.get('refresh');
    const groups = refresh || !sonos.cachedGroups().length ? await sonos.discover() : sonos.cachedGroups();
    return send(res, 200, { groups, publicUrl: PUBLIC_URL });
  }
  if (first === 'hosts' && req.method === 'POST') {
    const { host } = await readBody(req);
    if (!/^[\w.-]+(:\d+)?$/.test(host || '')) return send(res, 400, { error: 'Invalid host' });
    sonos.addHost(host);
    return send(res, 200, { groups: await sonos.discover() });
  }
  if (first === 'join' && req.method === 'POST') {
    const { member, coordinator } = await readBody(req);
    const host = sonos.memberHost(member);
    if (!host) return send(res, 404, { error: 'Unknown speaker' });
    await sonos.joinGroup(host, coordinator);
    return send(res, 200, { groups: await sonos.discover() });
  }
  if (first === 'leave' && req.method === 'POST') {
    const { member } = await readBody(req);
    const host = sonos.memberHost(member);
    if (!host) return send(res, 404, { error: 'Unknown speaker' });
    await sonos.leaveGroup(host);
    return send(res, 200, { groups: await sonos.discover() });
  }

  const host = sonos.hostFor(decodeURIComponent(first || ''));
  if (!host) return send(res, 404, { error: 'Unknown Sonos group. Refresh the speaker list.' });

  if (action === 'status' && req.method === 'GET') return send(res, 200, await sonos.status(host));
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const body = await readBody(req);
  switch (action) {
    case 'play': {
      const t = body.track || {};
      if (!STREAM_PATH.test(t.stream || '')) return send(res, 400, { error: 'Not a castable track' });
      const ext = path.extname(t.stream);
      await sonos.playUri(host, {
        uri: PUBLIC_URL + t.stream,
        title: t.title, artist: t.artist, album: t.album, artwork: t.artwork,
        duration: t.duration, mime: MIME[ext], live: t.kind === 'live',
      });
      if (body.position > 1 && t.kind !== 'live') await sonos.seek(host, body.position).catch(() => {});
      break;
    }
    case 'resume': await sonos.play(host); break;
    case 'pause': await sonos.pause(host); break;
    case 'stop': await sonos.stop(host); break;
    case 'seek': await sonos.seek(host, Number(body.position) || 0); break;
    case 'volume': await sonos.setGroupVolume(host, Number(body.volume)); break;
    default: return send(res, 404, { error: 'Unknown action' });
  }
  return send(res, 200, { ok: true });
}

// ---------------------------------------------------------------- api

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  const q = url.searchParams;
  const [route, arg] = parts;

  switch (route) {
    case 'home': {
      const [trending, underground, playlists, stations] = await Promise.all([
        settled(audius.trending()), settled(audius.underground()), settled(audius.trendingPlaylists()), settled(radio.top()),
      ]);
      return send(res, 200, { trending, underground, playlists, radio: stations, genres: GENRES });
    }
    case 'search': {
      const term = (q.get('q') || '').trim();
      if (!term) return send(res, 200, { tracks: [], previews: [], playlists: [], artists: [], radio: [] });
      const [tracks, previews, playlists, artists, stations] = await Promise.all([
        settled(audius.searchTracks(term)), settled(itunes.search(term)), settled(audius.searchPlaylists(term)),
        settled(audius.searchArtists(term)), settled(radio.search(term)),
      ]);
      return send(res, 200, { tracks, previews, playlists, artists, radio: stations });
    }
    case 'genre': {
      const name = decodeURIComponent(arg || '');
      const [week, month] = await Promise.all([
        settled(audius.trending({ genre: name, time: 'week' })), settled(audius.trending({ genre: name, time: 'month' })),
      ]);
      const seen = new Set();
      const tracks = [...week, ...month].filter((t) => !seen.has(t.id) && seen.add(t.id));
      return send(res, 200, { name, tracks, radio: await settled(radio.byTag(name.split('/')[0].toLowerCase())) });
    }
    case 'playlist': return send(res, 200, await audius.playlist(stripId(arg)));
    case 'artist': return send(res, 200, await audius.artist(stripId(arg)));
    case 'track': return send(res, 200, await audius.track(stripId(arg)));
    case 'radio': return send(res, 200, q.get('tag') ? await radio.byTag(q.get('tag')) : await radio.top());
    case 'lyrics':
      return send(res, 200, (await lyrics({ title: q.get('title'), artist: q.get('artist'), duration: Number(q.get('duration')) })) || {});
    case 'library':
      if (req.method === 'GET') return send(res, 200, (await loadLibrary()) || {});
      if (req.method === 'PUT') { await saveLibrary(await readBody(req)); return send(res, 200, { ok: true }); }
      return send(res, 405, { error: 'Method not allowed' });
    case 'sonos': return sonosRoute(req, res, parts.slice(1));
    case 'info': return send(res, 200, { publicUrl: PUBLIC_URL });
  }
  return send(res, 404, { error: 'Not found' });
}

// ---------------------------------------------------------------- static

async function serveStatic(req, res, pathname) {
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden');
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    await stat(file);
  } catch {
    file = path.join(PUBLIC, 'index.html'); // SPA fallback
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      const m = url.pathname.match(/^\/stream\/(audius|itunes|radio)\/([\w-]+)(?:\.\w+)?$/);
      if (m) return await proxyAudio(req, res, m[1], m[2]);
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return await serveStatic(req, res, url.pathname);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error(req.method, url.pathname, e.message);
      if (!res.headersSent) send(res, e.status || 500, { error: e.message });
      else res.destroy();
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Encore is running`);
    console.log(`  → On this computer:  http://localhost:${PORT}`);
    console.log(`  → On your network:   ${PUBLIC_URL}   (this is what Sonos streams from)\n`);
  });
}

import http from 'node:http';
import os from 'node:os';
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audius, itunes, radio } from '../shared/sources.js';
import { addHost } from '../shared/sonos.js';
import { createApi } from '../shared/api.js';
import { ssdpSearch } from './ssdp.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC = path.join(ROOT, 'public');
const SHARED = path.join(ROOT, 'shared');
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

// ---------------------------------------------------------------- api

for (const h of (process.env.SONOS_HOSTS || '').split(',').map((x) => x.trim()).filter(Boolean)) addHost(h);

// Only tracks relayed by this server may be cast, so the API can't be used to
// make speakers fetch arbitrary URLs.
const STREAM_PATH = /^\/stream\/(audius|itunes|radio)\/[\w-]+\.(mp3|m4a|aac)$/;

const handleApi = createApi({
  publicUrl: PUBLIC_URL,
  findSpeakers: () => ssdpSearch(),
  loadLibrary,
  saveLibrary,
  async castUrl(track) {
    if (!STREAM_PATH.test(track.stream || '')) throw Object.assign(new Error('Not a castable track'), { status: 400 });
    return PUBLIC_URL + track.stream;
  },
});

async function api(req, res, url) {
  const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
  send(res, 200, await handleApi(req.method, url.pathname + url.search, body));
}

// ---------------------------------------------------------------- static

async function serveStatic(req, res, pathname) {
  const dir = pathname.startsWith('/shared/') ? ROOT : PUBLIC;
  let file = path.normalize(path.join(dir, decodeURIComponent(pathname)));
  if (!file.startsWith(dir === ROOT ? SHARED : PUBLIC)) return send(res, 403, 'Forbidden');
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

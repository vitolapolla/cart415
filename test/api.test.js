import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../shared/api.js';
import { configure } from '../shared/sources.js';

// Fake the music services so the test runs offline.
const realFetch = globalThis.fetch;
after(() => { globalThis.fetch = realFetch; configure({ direct: false }); });

const audiusTrack = (id, extra = {}) => ({
  id, title: `Song ${id}`, duration: 200, genre: 'House', user: { id: 'u1', name: 'DJ' },
  artwork: { '480x480': `https://img/${id}.jpg` }, ...extra,
});

globalThis.fetch = async (url) => {
  const u = String(url);
  let body;
  if (u.includes('/tracks/trending/underground')) body = { data: [] };
  else if (u.includes('/tracks/trending')) body = { data: [audiusTrack('a1'), audiusTrack('a2', { is_stream_gated: true })] };
  else if (u.includes('/playlists/trending')) body = { data: [] };
  else if (u.includes('/stream') && u.includes('no_redirect')) body = { data: 'https://node.example/file.mp3?sig=1' };
  else if (u.includes('radio-browser')) body = [{ stationuuid: 's1', name: 'FM', url_resolved: 'http://radio/s1', codec: 'MP3', hls: 0, tags: 'pop' }];
  else body = {};
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const api = createApi({
  findSpeakers: async () => [],
  loadLibrary: async () => ({ liked: [] }),
  saveLibrary: async () => {},
  castUrl: async (t) => t.stream,
});

test('server mode streams through the relay; direct mode uses source URLs', async () => {
  configure({ direct: false });
  let home = await api('GET', '/api/home');
  assert.equal(home.trending.length, 1, 'stream-gated tracks are skipped');
  assert.equal(home.trending[0].stream, '/stream/audius/a1.mp3');
  assert.equal(home.radio[0].stream, '/stream/radio/s1.mp3');

  configure({ direct: true });
  home = await api('GET', '/home?x=1');
  assert.match(home.trending[0].stream, /^https:\/\/api\.audius\.co\/v1\/tracks\/a1\/stream\?app_name=encore/);
  assert.equal(home.radio[0].stream, 'http://radio/s1');
});

test('unknown routes and Sonos groups are errors with a status', async () => {
  await assert.rejects(api('GET', '/api/nope'), (e) => e.status === 404);
  await assert.rejects(api('POST', '/api/sonos/RINCON_X/play', { track: {} }), (e) => e.status === 404);
  await assert.rejects(api('POST', '/api/sonos/hosts', { host: 'bad host!' }), (e) => e.status === 400);
});

test('library is read and written through the environment', async () => {
  assert.deepEqual(await api('GET', '/api/library'), { liked: [] });
  assert.deepEqual(await api('PUT', '/api/library', { liked: [1] }), { ok: true });
});

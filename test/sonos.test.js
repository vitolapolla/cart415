import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as sonos from '../server/sonos.js';
import { createServer } from '../server/index.js';

// A fake Sonos speaker that answers the SOAP calls Encore makes.
const calls = [];
let speaker, speakerHost, app, appUrl;

function zoneState(host) {
  return `<ZoneGroupState><ZoneGroups>` +
    `<ZoneGroup Coordinator="RINCON_LIVING" ID="RINCON_LIVING:1">` +
    `<ZoneGroupMember UUID="RINCON_LIVING" Location="http://${host}/xml/device_description.xml" ZoneName="Living Room"/>` +
    `<ZoneGroupMember UUID="RINCON_SUB" Location="http://${host}/xml/device_description.xml" ZoneName="Living Room" Invisible="1"/>` +
    `</ZoneGroup>` +
    `<ZoneGroup Coordinator="RINCON_KITCHEN" ID="RINCON_KITCHEN:2">` +
    `<ZoneGroupMember UUID="RINCON_KITCHEN" Location="http://${host}/xml/device_description.xml" ZoneName="Kitchen &amp; Dining"/>` +
    `</ZoneGroup></ZoneGroups></ZoneGroupState>`;
}

function reply(action, inner = '') {
  return `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${action}Response>${inner}</u:${action}Response></s:Body></s:Envelope>`;
}

before(async () => {
  speaker = http.createServer(async (req, res) => {
    let body = '';
    for await (const c of req) body += c;
    const action = req.headers.soapaction.replace(/"/g, '').split('#')[1];
    calls.push({ path: req.url, action, body });
    const out = {
      GetZoneGroupState: `<ZoneGroupState>${sonos.escapeXml(zoneState(speakerHost))}</ZoneGroupState>`,
      GetTransportInfo: '<CurrentTransportState>PLAYING</CurrentTransportState>',
      GetPositionInfo: '<TrackDuration>0:03:30</TrackDuration><RelTime>0:01:05</RelTime><TrackURI>http://x/stream/audius/abc.mp3</TrackURI>',
      GetGroupVolume: '<CurrentVolume>25</CurrentVolume>',
    }[action] || '';
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(reply(action, out));
  });
  await new Promise((r) => speaker.listen(0, '127.0.0.1', r));
  speakerHost = `127.0.0.1:${speaker.address().port}`;

  app = createServer();
  await new Promise((r) => app.listen(0, '127.0.0.1', r));
  appUrl = `http://127.0.0.1:${app.address().port}`;
});

after(() => {
  speaker.close();
  app.close();
});

test('soap envelopes escape their arguments', () => {
  const xml = sonos.soapEnvelope('urn:x', 'SetAVTransportURI', { CurrentURI: 'http://a/b?c=1&d=<2>' });
  assert.match(xml, /<CurrentURI>http:\/\/a\/b\?c=1&amp;d=&lt;2&gt;<\/CurrentURI>/);
  assert.match(xml, /<u:SetAVTransportURI xmlns:u="urn:x">/);
});

test('DIDL metadata describes tracks and radio', () => {
  const track = sonos.didl({ uri: 'http://h/s.mp3', title: 'Rock & Roll', artist: 'A', duration: 215, mime: 'audio/mpeg' });
  assert.match(track, /Rock &amp; Roll/);
  assert.match(track, /duration="0:03:35"/);
  assert.match(track, /object\.item\.audioItem\.musicTrack/);
  const live = sonos.didl({ uri: 'x-rincon-mp3radio://h/s.mp3', title: 'FM', mime: 'audio/mpeg', live: true });
  assert.match(live, /audioBroadcast/);
  assert.match(live, /SA_RINCON65031_/);
});

test('zone groups skip invisible members and keep coordinators first', () => {
  const groups = sonos.parseZoneGroups(zoneState('192.168.1.5:1400'));
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((g) => g.name), ['Kitchen & Dining', 'Living Room']);
  assert.equal(groups[1].members.length, 1);
  assert.equal(groups[1].host, '192.168.1.5');
});

test('discovers speakers through a known host and lists them via the API', async () => {
  sonos.addHost(speakerHost);
  const res = await fetch(`${appUrl}/api/sonos/groups?refresh=1`);
  const { groups } = await res.json();
  assert.equal(groups.length, 2);
  assert.equal(groups[0].host, speakerHost);
});

test('casting a track sets the transport URI to this server and presses play', async () => {
  calls.length = 0;
  const track = { stream: '/stream/audius/abc.mp3', title: 'Song', artist: 'Artist', duration: 210, kind: 'full' };
  const res = await fetch(`${appUrl}/api/sonos/RINCON_LIVING/play`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track, position: 30 }),
  });
  assert.equal(res.status, 200);
  assert.deepEqual(calls.map((c) => c.action), ['SetAVTransportURI', 'Play', 'Seek']);
  assert.match(calls[0].body, /<CurrentURI>http:\/\/[\d.]+:\d+\/stream\/audius\/abc\.mp3<\/CurrentURI>/);
  assert.match(calls[0].body, /&lt;dc:title&gt;Song&lt;\/dc:title&gt;/);
  assert.match(calls[2].body, /<Target>0:00:30<\/Target>/);
});

test('radio is cast with the Sonos radio scheme', async () => {
  calls.length = 0;
  const track = { stream: '/stream/radio/9617a958-0601-11e8-ae97-52543be04c81.mp3', title: 'FM', artist: 'Live', kind: 'live' };
  await fetch(`${appUrl}/api/sonos/RINCON_LIVING/play`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track }) });
  assert.match(calls[0].body, /<CurrentURI>x-rincon-mp3radio:\/\//);
  assert.deepEqual(calls.map((c) => c.action), ['SetAVTransportURI', 'Play']);
});

test('refuses to cast arbitrary URLs', async () => {
  const res = await fetch(`${appUrl}/api/sonos/RINCON_LIVING/play`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track: { stream: 'http://evil.example/x.mp3' } }),
  });
  assert.equal(res.status, 400);
});

test('status reports state, position and group volume', async () => {
  const s = await (await fetch(`${appUrl}/api/sonos/RINCON_LIVING/status`)).json();
  assert.deepEqual(s, { state: 'PLAYING', position: 65, duration: 210, uri: 'http://x/stream/audius/abc.mp3', volume: 25 });
});

test('volume, pause and grouping commands reach the speaker', async () => {
  calls.length = 0;
  const post = (p, body = {}) => fetch(`${appUrl}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  await post('/api/sonos/RINCON_LIVING/volume', { volume: 140 });
  await post('/api/sonos/RINCON_LIVING/pause');
  await post('/api/sonos/join', { member: 'RINCON_KITCHEN', coordinator: 'RINCON_LIVING' });
  const actions = calls.map((c) => c.action);
  assert.deepEqual(actions.slice(0, 4), ['SnapshotGroupVolume', 'SetGroupVolume', 'Pause', 'SetAVTransportURI']);
  assert.match(calls[1].body, /<DesiredVolume>100<\/DesiredVolume>/);
  assert.match(calls[3].body, /<CurrentURI>x-rincon:RINCON_LIVING<\/CurrentURI>/);
});

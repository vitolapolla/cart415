// Minimal Sonos controller using the speakers' local UPnP/SOAP API (port 1400).
// No Sonos account or cloud API needed: the server must be on the same LAN.

import dgram from 'node:dgram';

const PORT = 1400;

const SERVICES = {
  AVTransport: { path: '/MediaRenderer/AVTransport/Control', urn: 'urn:schemas-upnp-org:service:AVTransport:1' },
  RenderingControl: { path: '/MediaRenderer/RenderingControl/Control', urn: 'urn:schemas-upnp-org:service:RenderingControl:1' },
  GroupRenderingControl: { path: '/MediaRenderer/GroupRenderingControl/Control', urn: 'urn:schemas-upnp-org:service:GroupRenderingControl:1' },
  ZoneGroupTopology: { path: '/ZoneGroupTopology/Control', urn: 'urn:schemas-upnp-org:service:ZoneGroupTopology:1' },
};

export function escapeXml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

export function unescapeXml(s) {
  return String(s ?? '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function soapEnvelope(urn, action, args) {
  const body = Object.entries(args).map(([k, v]) => `<${k}>${escapeXml(v)}</${k}>`).join('');
  return '<?xml version="1.0" encoding="utf-8"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
    `<s:Body><u:${action} xmlns:u="${urn}">${body}</u:${action}></s:Body></s:Envelope>`;
}

export function tag(xml, name) {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`));
  return m ? unescapeXml(m[1]) : null;
}

function attrs(s) {
  const out = {};
  for (const m of s.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = unescapeXml(m[2]);
  return out;
}

// Hosts are "ip" or "ip:port" (a port lets tests point at a fake speaker).
function base(host) {
  return host.includes(':') ? `http://${host}` : `http://${host}:${PORT}`;
}

export async function soap(host, service, action, args = {}) {
  const svc = SERVICES[service];
  const res = await fetch(base(host) + svc.path, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset="utf-8"', SOAPACTION: `"${svc.urn}#${action}"` },
    body: soapEnvelope(svc.urn, action, args),
    signal: AbortSignal.timeout(5000),
  });
  const text = await res.text();
  if (!res.ok) {
    const code = tag(text, 'errorCode');
    throw new Error(`Sonos ${action} failed (${res.status}${code ? `, UPnP error ${code}` : ''})`);
  }
  return text;
}

// ---------------------------------------------------------------- discovery

const known = new Set((process.env.SONOS_HOSTS || '').split(',').map((s) => s.trim()).filter(Boolean));

export function addHost(host) {
  known.add(host);
}

export function ssdpSearch(timeout = 2500) {
  return new Promise((resolve) => {
    const found = new Set();
    let sock;
    try {
      sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    } catch {
      return resolve([]);
    }
    const msg = Buffer.from([
      'M-SEARCH * HTTP/1.1',
      'HOST: 239.255.255.250:1900',
      'MAN: "ssdp:discover"',
      'MX: 1',
      'ST: urn:schemas-upnp-org:device:ZonePlayer:1',
      '', '',
    ].join('\r\n'));
    sock.on('message', (buf, rinfo) => {
      if (/Sonos/i.test(buf.toString()) || /ZonePlayer/i.test(buf.toString())) found.add(rinfo.address);
    });
    sock.on('error', () => finish());
    const finish = () => {
      try { sock.close(); } catch {}
      resolve([...found]);
    };
    sock.bind(() => {
      try {
        sock.setBroadcast(true);
        for (let i = 0; i < 2; i++) {
          sock.send(msg, 1900, '239.255.255.250');
          sock.send(msg, 1900, '255.255.255.255');
        }
      } catch {}
      setTimeout(finish, timeout);
    });
  });
}

// Parse ZoneGroupState into groups. Only a group's coordinator accepts playback commands.
export function parseZoneGroups(stateXml) {
  const groups = [];
  for (const g of stateXml.matchAll(/<ZoneGroup\s([^>]*)>([\s\S]*?)<\/ZoneGroup>/g)) {
    const { Coordinator, ID } = attrs(g[1]);
    const members = [];
    for (const m of g[2].matchAll(/<ZoneGroupMember\s([^>]*?)\/?>/g)) {
      const a = attrs(m[1]);
      if (a.Invisible === '1') continue; // e.g. the second speaker of a stereo pair, or a Sub
      const loc = a.Location ? new URL(a.Location) : null;
      members.push({ uuid: a.UUID, name: a.ZoneName, host: loc ? (loc.port && loc.port !== String(PORT) ? loc.host : loc.hostname) : null });
    }
    const coord = members.find((m) => m.uuid === Coordinator);
    if (!coord) continue;
    const others = members.filter((m) => m !== coord);
    groups.push({
      id: Coordinator,
      groupId: ID,
      name: [coord.name, ...others.map((m) => m.name)].join(' + '),
      host: coord.host,
      members: [coord, ...others],
    });
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

let lastGroups = [];

export async function discover() {
  const hosts = new Set([...known, ...(await ssdpSearch())]);
  for (const g of lastGroups) hosts.add(g.host);
  // Any one speaker knows the whole household's topology.
  for (const host of hosts) {
    try {
      const xml = await soap(host, 'ZoneGroupTopology', 'GetZoneGroupState');
      const state = tag(xml, 'ZoneGroupState');
      if (state) {
        lastGroups = parseZoneGroups(state);
        return lastGroups;
      }
    } catch {}
  }
  lastGroups = [];
  return lastGroups;
}

export function cachedGroups() {
  return lastGroups;
}

export function hostFor(groupId) {
  return lastGroups.find((g) => g.id === groupId)?.host || null;
}

export function memberHost(uuid) {
  for (const g of lastGroups) for (const m of g.members) if (m.uuid === uuid) return m.host;
  return null;
}

// ---------------------------------------------------------------- playback

function hms(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function secs(s) {
  if (!s || !/^\d+:\d{2}:\d{2}/.test(s)) return 0;
  const [h, m, x] = s.split(':').map(Number);
  return h * 3600 + m * 60 + x;
}

export function didl({ uri, title, artist, album, artwork, duration, mime, live }) {
  const cls = live ? 'object.item.audioItem.audioBroadcast' : 'object.item.audioItem.musicTrack';
  return '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" ' +
    'xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">' +
    '<item id="-1" parentID="-1" restricted="true">' +
    `<res protocolInfo="http-get:*:${escapeXml(mime)}:*"${duration ? ` duration="${hms(duration)}"` : ''}>${escapeXml(uri)}</res>` +
    `<dc:title>${escapeXml(title)}</dc:title>` +
    (artist ? `<dc:creator>${escapeXml(artist)}</dc:creator>` : '') +
    (album ? `<upnp:album>${escapeXml(album)}</upnp:album>` : '') +
    (artwork ? `<upnp:albumArtURI>${escapeXml(artwork)}</upnp:albumArtURI>` : '') +
    `<upnp:class>${cls}</upnp:class>` +
    (live ? '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON65031_</desc>' : '') +
    '</item></DIDL-Lite>';
}

export async function playUri(host, { uri, ...meta }) {
  // Sonos plays endless HTTP streams properly only with its radio scheme.
  const transportUri = meta.live ? uri.replace(/^https?:\/\//, 'x-rincon-mp3radio://') : uri;
  await soap(host, 'AVTransport', 'SetAVTransportURI', {
    InstanceID: 0,
    CurrentURI: transportUri,
    CurrentURIMetaData: didl({ uri: transportUri, ...meta }),
  });
  await soap(host, 'AVTransport', 'Play', { InstanceID: 0, Speed: 1 });
}

export const play = (host) => soap(host, 'AVTransport', 'Play', { InstanceID: 0, Speed: 1 });
export const pause = (host) => soap(host, 'AVTransport', 'Pause', { InstanceID: 0 });
export const stop = (host) => soap(host, 'AVTransport', 'Stop', { InstanceID: 0 });
export const seek = (host, sec) => soap(host, 'AVTransport', 'Seek', { InstanceID: 0, Unit: 'REL_TIME', Target: hms(sec) });

export async function status(host) {
  const [t, p, v] = await Promise.all([
    soap(host, 'AVTransport', 'GetTransportInfo', { InstanceID: 0 }),
    soap(host, 'AVTransport', 'GetPositionInfo', { InstanceID: 0 }),
    soap(host, 'GroupRenderingControl', 'GetGroupVolume', { InstanceID: 0 }).catch(() => null),
  ]);
  return {
    state: tag(t, 'CurrentTransportState'), // PLAYING | PAUSED_PLAYBACK | STOPPED | TRANSITIONING
    position: secs(tag(p, 'RelTime')),
    duration: secs(tag(p, 'TrackDuration')),
    uri: tag(p, 'TrackURI'),
    volume: v ? Number(tag(v, 'CurrentVolume')) : null,
  };
}

export async function setGroupVolume(host, volume) {
  const v = Math.max(0, Math.min(100, Math.round(volume)));
  await soap(host, 'GroupRenderingControl', 'SnapshotGroupVolume', { InstanceID: 0 }).catch(() => {});
  await soap(host, 'GroupRenderingControl', 'SetGroupVolume', { InstanceID: 0, DesiredVolume: v });
}

// Make speaker `memberHost` follow the group coordinated by `coordinatorUuid`.
export const joinGroup = (memberHost, coordinatorUuid) =>
  soap(memberHost, 'AVTransport', 'SetAVTransportURI', { InstanceID: 0, CurrentURI: `x-rincon:${coordinatorUuid}`, CurrentURIMetaData: '' });

export const leaveGroup = (memberHost) =>
  soap(memberHost, 'AVTransport', 'BecomeCoordinatorOfStandaloneGroup', { InstanceID: 0 });

// SSDP discovery of Sonos speakers for the Node server.
import dgram from 'node:dgram';

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
      if (/Sonos|ZonePlayer/i.test(buf.toString())) found.add(rinfo.address);
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

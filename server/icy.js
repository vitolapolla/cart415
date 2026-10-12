// Reads the "now playing" title that most internet radio streams embed (ICY / SHOUTcast metadata).
export async function streamTitle(url, timeoutMs = 8000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'Icy-MetaData': '1', 'User-Agent': 'encore/0.1' }, signal: ac.signal });
    const metaint = Number(res.headers.get('icy-metaint'));
    if (!res.ok || !metaint || !res.body) return null;
    const reader = res.body.getReader();
    let buf = new Uint8Array(0);
    // Audio bytes, then one length byte (×16), then the metadata block.
    while (true) {
      if (buf.length > metaint) {
        const len = buf[metaint] * 16;
        if (len === 0) return null;
        if (buf.length >= metaint + 1 + len) {
          const meta = new TextDecoder().decode(buf.slice(metaint + 1, metaint + 1 + len));
          const m = meta.match(/StreamTitle='(.*?)';/);
          return m && m[1].trim() ? m[1].trim() : null;
        }
      }
      const { value, done } = await reader.read();
      if (done) return null;
      const next = new Uint8Array(buf.length + value.length);
      next.set(buf);
      next.set(value, buf.length);
      buf = next;
      if (buf.length > metaint + 5000) return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    ac.abort();
  }
}

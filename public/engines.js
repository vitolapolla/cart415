// Playback engines. The app owns the queue and hands it to whichever engine is
// active; engines report back through hooks:
//   onIndex(i)          the current queue position changed on its own (track ended, car controls…)
//   onState({playing})  play/pause state
//   onTime(pos, dur)    progress, in seconds
//   onEnd()             reached the end of the queue (repeat off)
//   onError(message)
//   onQueue(tracks, i)  the queue was replaced outside the app (e.g. from Android Auto)

import { api, Plugins } from './platform.js';

// ---------------------------------------------------------------- shared queue logic for JS engines

class JsQueueEngine {
  constructor(hooks) {
    this.hooks = hooks;
    this.queue = [];
    this.index = -1;
    this.repeat = 'off';
  }
  get current() { return this.queue[this.index]; }
  async setQueue(queue, index, { position = 0, play = true } = {}) {
    this.queue = queue;
    this.index = index;
    await this.load(position, play);
  }
  sync(queue, index) {
    this.queue = queue;
    this.index = index;
  }
  async skipTo(index) {
    this.index = index;
    await this.load(0, true);
  }
  setRepeat(mode) { this.repeat = mode; }
  trackEnded() {
    if (this.repeat === 'one') return this.load(0, true);
    if (this.index + 1 < this.queue.length) this.index++;
    else if (this.repeat === 'all' && this.queue.length) this.index = 0;
    else return this.hooks.onEnd();
    this.hooks.onIndex(this.index);
    return this.load(0, true);
  }
}

// ---------------------------------------------------------------- browser <audio>

const EQ_FREQS = [60, 230, 910, 3600, 14000];

export class HtmlEngine extends JsQueueEngine {
  constructor(hooks, { webAudioEq = false } = {}) {
    super(hooks);
    this.name = 'html';
    this.webAudioEq = webAudioEq;
    this.eqGains = [0, 0, 0, 0, 0];
    const a = (this.audio = new Audio());
    a.preload = 'auto';
    a.addEventListener('play', () => hooks.onState({ playing: true }));
    a.addEventListener('pause', () => hooks.onState({ playing: false }));
    a.addEventListener('timeupdate', () => hooks.onTime(a.currentTime, isFinite(a.duration) ? a.duration : 0));
    a.addEventListener('ended', () => this.trackEnded());
    a.addEventListener('error', () => {
      if (!a.getAttribute('src')) return;
      hooks.onError(`Couldn't load "${this.current?.title}", skipping`);
      setTimeout(() => this.trackEnded(), 800);
    });
  }
  ensureGraph() {
    if (!this.webAudioEq) return;
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new AudioContext();
      let node = this.ctx.createMediaElementSource(this.audio);
      this.eq = EQ_FREQS.map((f, i) => {
        const b = this.ctx.createBiquadFilter();
        b.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length - 1 ? 'highshelf' : 'peaking';
        b.frequency.value = f;
        b.gain.value = this.eqGains[i] || 0;
        node.connect(b);
        node = b;
        return b;
      });
      node.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Equalizer unavailable', e);
    }
  }
  async load(position, play) {
    const t = this.current;
    if (!t) return;
    this.ensureGraph();
    this.audio.src = t.stream;
    if (position) this.audio.addEventListener('loadedmetadata', () => { this.audio.currentTime = position; }, { once: true });
    if (!play) return;
    try { await this.audio.play(); } catch (e) { if (e.name !== 'AbortError') this.hooks.onError(`Couldn't play "${t.title}"`); }
  }
  play() {
    this.ensureGraph();
    if (!this.audio.getAttribute('src')) return this.load(0, true);
    return this.audio.play().catch(() => {});
  }
  pause() { this.audio.pause(); }
  seek(sec) { this.audio.currentTime = sec; }
  setVolume(v) { this.audio.volume = v; }
  setEqualizer(gains) {
    this.eqGains = gains;
    this.eq?.forEach((b, i) => { b.gain.value = gains[i] || 0; });
  }
  stop() {
    this.audio.pause();
  }
  destroy() {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}

// ---------------------------------------------------------------- Android native player (Media3)

export class NativeEngine {
  constructor(hooks) {
    this.name = 'native';
    this.hooks = hooks;
    this.p = Plugins.EncorePlayer;
    this.ids = [];
    this.lastIndex = -1;
    this.lastEnded = false;
    this.listeners = [
      this.p.addListener('state', (s) => this.handle(s)),
      this.p.addListener('queue', ({ tracks, index }) => {
        const ids = tracks.map((t) => t.id);
        if (ids.join() !== this.ids.join()) {
          this.ids = ids;
          this.lastIndex = index;
          hooks.onQueue(tracks, index);
        }
      }),
      this.p.addListener('error', ({ message }) => hooks.onError(`Playback error (${message})`)),
    ];
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') this.p.getState().then((s) => this.handle(s)).catch(() => {});
    }, 500);
    // Pick up whatever the service was already playing (e.g. started from the car).
    this.p.getQueue().then(({ tracks }) => {
      if (!tracks?.length) return;
      return this.p.getState().then((s) => {
        this.ids = tracks.map((t) => t.id);
        this.lastIndex = s.index;
        hooks.onQueue(tracks, s.index);
        this.handle(s);
      });
    }).catch(() => {});
  }
  handle(s) {
    if (!s) return;
    if (s.index !== this.lastIndex && s.index >= 0) {
      this.lastIndex = s.index;
      this.hooks.onIndex(s.index);
    }
    this.hooks.onState({ playing: s.playing || (s.playWhenReady && s.buffering) });
    this.hooks.onTime(s.position, s.duration);
    if (s.ended && !this.lastEnded) this.hooks.onEnd();
    this.lastEnded = s.ended;
  }
  async setQueue(queue, index, { position = 0, play = true } = {}) {
    this.ids = queue.map((t) => t.id);
    this.lastIndex = index;
    this.lastEnded = false;
    await this.p.setQueue({ tracks: queue, index, position, play });
  }
  async sync(queue, index) {
    this.ids = queue.map((t) => t.id);
    this.lastIndex = index;
    await this.p.sync({ tracks: queue, index });
  }
  async skipTo(index) {
    this.lastIndex = index;
    this.lastEnded = false;
    await this.p.skipTo({ index });
  }
  play() { this.lastEnded = false; return this.p.play(); }
  pause() { return this.p.pause(); }
  seek(sec) { return this.p.seek({ position: sec }); }
  setRepeat(mode) { return this.p.setRepeat({ mode }); }
  setVolume(v) { return this.p.setVolume({ volume: v }); }
  setEqualizer(gains) { return this.p.setEqualizer({ gains }); }
  stop() { return this.p.pause(); }
  destroy() {
    clearInterval(this.timer);
    this.listeners.forEach((l) => Promise.resolve(l).then((h) => h?.remove?.()));
  }
}

// ---------------------------------------------------------------- Sonos

export class SonosEngine extends JsQueueEngine {
  constructor(hooks, group) {
    super(hooks);
    this.name = 'sonos';
    this.group = group;
    this.base = `/api/sonos/${encodeURIComponent(group.id)}`;
    this.lastState = null;
    this.transitionAt = 0;
    this.volume = null;
    this.volumeSetAt = 0;
    this.timer = setInterval(() => this.poll(), 1000);
  }
  async load(position, play) {
    const t = this.current;
    if (!t) return;
    this.lastState = null;
    this.transitionAt = Date.now();
    try {
      await api(`${this.base}/play`, { method: 'POST', body: { track: t, position } });
      this.hooks.onState({ playing: true });
      if (!play) await this.pause();
    } catch (e) {
      this.hooks.onError(e.message);
      this.hooks.onState({ playing: false });
    }
  }
  async poll() {
    try {
      const s = await api(`${this.base}/status`);
      if (s.volume != null && Date.now() - this.volumeSetAt > 2000) this.volume = s.volume;
      if (s.state === 'PLAYING') this.hooks.onState({ playing: true });
      else if (s.state === 'PAUSED_PLAYBACK') this.hooks.onState({ playing: false });
      if (Date.now() - this.transitionAt > 2500) this.hooks.onTime(s.position, s.duration);
      // The song finished on the speaker → play the next one.
      if (s.state === 'STOPPED' && this.lastState === 'PLAYING' && this.current?.kind !== 'live' && Date.now() - this.transitionAt > 4000) {
        this.lastState = null;
        this.trackEnded();
        return;
      }
      if (s.state !== 'TRANSITIONING') this.lastState = s.state;
    } catch (e) {
      console.warn(e);
    }
  }
  command(action, body = {}) {
    return api(`${this.base}/${action}`, { method: 'POST', body }).catch((e) => this.hooks.onError(e.message));
  }
  play() { this.hooks.onState({ playing: true }); return this.command('resume'); }
  pause() { this.hooks.onState({ playing: false }); return this.command('pause'); }
  seek(sec) { return this.command('seek', { position: sec }); }
  setVolume(v) {
    this.volume = Math.round(v * 100);
    this.volumeSetAt = Date.now();
    clearTimeout(this.volTimer);
    this.volTimer = setTimeout(() => this.command('volume', { volume: this.volume }), 150);
  }
  setEqualizer() {}
  stop() { return this.command('pause'); }
  destroy() { clearInterval(this.timer); }
}

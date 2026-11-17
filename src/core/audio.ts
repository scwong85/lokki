import { tuning } from './tuning';

export type Sfx = 'flap' | 'hop' | 'screech' | 'thud' | 'bonk' | 'chime' | 'pop' | 'splat' | 'clatter' | 'crash' | 'gasp' | 'yelp' | 'win' | 'lose' | 'hiss' | 'whistle' | 'twang' | 'alarm' | 'crow' | 'bell' | 'tramBell' | 'horn' | 'honk' | 'splash' | 'jukebox';

/**
 * Tiny audio manager. Placeholder sounds are synthesised with WebAudio (no files, no licences, fully offline).
 * The AudioContext is created lazily on the first user gesture (browser autoplay rules).
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private windGain!: GainNode;
  private noise!: AudioBuffer;
  muted = false;
  /** The last sounds played (name and volume scale), for tests and the debug view. */
  readonly log: { name: Sfx; vol: number }[] = [];
  private ambient: { tram: GainNode; sea: GainNode; city: GainNode } | null = null;

  /** Call from a user gesture. Safe to call repeatedly and when WebAudio is unavailable. */
  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // continuous air-rush, volume follows speed
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      src.connect(lp).connect(this.windGain).connect(this.master);
      src.start();
      this.buildAmbient();
    }
    void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /** Air-rush loudness from speed (0..1 of max speed). */
  setAir(speedFrac: number, airborne: boolean): void {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : tuning.audio.master.value;
    const target = airborne ? Math.min(1, speedFrac) ** 2 * 0.35 * tuning.audio.wind.value : 0;
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
  }

  /** `vol`: 0..1 scale (distance); sounds are logged even when the browser has not unlocked audio yet. */
  play(name: Sfx, vol = 1): void {
    this.log.push({ name, vol });
    if (this.log.length > 24) this.log.shift();
    if (!this.ctx || this.muted || vol <= 0.01) return;
    const v = tuning.audio.sfx.value * vol;
    switch (name) {
      case 'flap':
        this.burst(0.14, 700, 0.9, 0.5 * v, 350);
        this.tone('sine', 150, 80, 0.1, 0.25 * v);
        break;
      case 'hop':
        this.burst(0.08, 900, 1, 0.25 * v, 500);
        break;
      case 'screech':
        this.screech(v);
        break;
      case 'thud':
        this.tone('sine', 140, 45, 0.2, 0.7 * v);
        this.burst(0.12, 300, 0.7, 0.3 * v, 120);
        break;
      case 'bonk':
        this.tone('square', 240, 110, 0.14, 0.25 * v);
        this.burst(0.1, 500, 0.8, 0.4 * v, 200);
        break;
      case 'gasp':
        this.tone('triangle', 420, 640, 0.12, 0.25 * v);
        break;
      case 'yelp':
        this.tone('sawtooth', 700, 1100, 0.1, 0.18 * v);
        this.tone('sawtooth', 1100, 600, 0.16, 0.18 * v, 0.09);
        break;
      case 'win':
        this.tone('sine', 660, 660, 0.12, 0.3 * v);
        this.tone('sine', 880, 880, 0.12, 0.3 * v, 0.12);
        this.tone('sine', 1320, 1320, 0.3, 0.3 * v, 0.24);
        break;
      case 'lose':
        this.tone('sawtooth', 300, 180, 0.35, 0.2 * v);
        break;
      case 'crow':
        this.tone('sawtooth', 650, 380, 0.2, 0.3 * v);
        this.tone('sawtooth', 620, 340, 0.22, 0.3 * v, 0.26);
        this.burst(0.18, 900, 2, 0.15 * v, 500);
        break;
      case 'hiss':
        this.burst(0.45, 6000, 1, 0.4 * v, 3500);
        break;
      case 'whistle':
        this.tone('sine', 1800, 2400, 0.35, 0.25 * v);
        break;
      case 'twang':
        this.tone('triangle', 300, 120, 0.22, 0.3 * v);
        this.burst(0.12, 1500, 2, 0.2 * v, 900);
        break;
      case 'alarm':
        this.tone('square', 660, 660, 0.12, 0.18 * v);
        this.tone('square', 880, 880, 0.18, 0.18 * v, 0.14);
        break;
      case 'pop':
        this.tone('sine', 500, 900, 0.07, 0.3 * v);
        break;
      case 'splat':
        this.burst(0.18, 450, 0.6, 0.55 * v, 150);
        this.tone('sine', 220, 70, 0.12, 0.35 * v);
        break;
      case 'clatter':
        this.tone('square', 520, 380, 0.09, 0.2 * v);
        this.tone('triangle', 900, 600, 0.12, 0.2 * v, 0.03);
        this.burst(0.1, 2200, 1.5, 0.25 * v, 1500);
        break;
      case 'crash':
        this.burst(0.35, 3500, 0.5, 0.6 * v, 1200);
        this.tone('triangle', 2400, 1400, 0.2, 0.2 * v);
        break;
      case 'chime':
        this.tone('sine', 880, 1100, 0.18, 0.3 * v);
        this.tone('sine', 1320, 1760, 0.22, 0.25 * v, 0.07);
        break;
      case 'splash':
        // a body hitting water: a heavy whoosh, a wet slap, then bubbles
        this.burst(0.5, 900, 0.5, 0.7 * v, 180);
        this.tone('sine', 160, 55, 0.3, 0.55 * v);
        this.burst(0.12, 3200, 1.2, 0.35 * v, 1600);
        for (let i = 0; i < 4; i++) this.tone('sine', 500 + i * 170, 900 + i * 260, 0.07, 0.1 * v, 0.18 + i * 0.07);
        break;
      case 'jukebox':
        // a jaunty little tune: eight notes up and down a major scale
        [523, 659, 784, 659, 880, 784, 659, 523].forEach((f, i) => {
          this.tone('square', f, f, 0.16, 0.14 * v, i * 0.17);
          this.tone('triangle', f / 2, f / 2, 0.16, 0.2 * v, i * 0.17);
        });
        break;
      case 'honk':
        this.screech(1.5 * vol);
        this.tone('sawtooth', 420, 300, 0.22, 0.28 * v);
        break;
      case 'bell':
        this.churchBell(v);
        break;
      case 'tramBell':
        // two quick pings: ding-ding
        for (const d of [0, 0.2]) {
          this.tone('sine', 1568, 1560, 0.45, 0.4 * v, d);
          this.tone('triangle', 3136, 3100, 0.25, 0.14 * v, d);
        }
        break;
      case 'horn':
        this.horn(v);
        break;
    }
  }

  /** A big church bell: a low strike with inharmonic partials that ring on for seconds. */
  private churchBell(v: number): void {
    const base = 196;
    // partials of a real bell: hum, prime, tierce, quint, nominal... with long decays for the low ones
    const partials: [number, number, number][] = [[0.5, 0.5, 4.5], [1, 1, 4.2], [1.19, 0.55, 3.2], [1.5, 0.45, 2.6], [2, 0.5, 2.2], [2.5, 0.3, 1.6], [3.01, 0.22, 1.2], [4.2, 0.14, 0.8]];
    for (const [m, g, dur] of partials) this.tone('sine', base * m, base * m * 0.998, dur, 0.5 * g * v, 0, 0.004);
    this.burst(0.08, 2200, 1, 0.35 * v, 900); // the clapper
  }

  /** A ferry horn: two low notes, a fifth apart, with a slow swell. */
  private horn(v: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    for (const f of [98, 147]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.32 * v, t0 + 0.18);
      g.gain.setValueAtTime(0.32 * v, t0 + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
      o.connect(lp).connect(g).connect(this.master);
      o.start(t0);
      o.stop(t0 + 1.9);
    }
  }

  /** Always-on layers: a tram rumble, the sea, and a murmur of the city. Their loudness is set from the game each frame. */
  private buildAmbient(): void {
    const ctx = this.ctx!;
    const layer = (freq: number, q: number, lfoHz: number, lfoDepth: number): GainNode => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      if (lfoHz > 0) {
        // a slow swell (waves) on the gain
        const lfo = ctx.createOscillator();
        lfo.frequency.value = lfoHz;
        const d = ctx.createGain();
        d.gain.value = lfoDepth;
        lfo.connect(d).connect(g.gain);
        lfo.start();
      }
      src.connect(f).connect(g).connect(this.master);
      src.start();
      return g;
    };
    const tram = layer(90, 0.9, 0, 0); // low rumble of wheels
    const sea = layer(420, 0.6, 0.13, 0.05);
    const city = layer(750, 0.5, 0, 0);
    this.ambient = { tram, sea, city };
  }

  /** Set the ambient layers (each 0..1): the tram rumble, the sea, and the city murmur. */
  setAmbient(a: { tram: number; sea: number; city: number }): void {
    if (!this.ctx || !this.ambient) return;
    const k = this.muted ? 0 : tuning.audio.ambient.value;
    const t = this.ctx.currentTime;
    this.ambient.tram.gain.setTargetAtTime(a.tram * 0.5 * k, t, 0.3);
    this.ambient.sea.gain.setTargetAtTime(a.sea * 0.085 * k, t, 0.6);
    this.ambient.city.gain.setTargetAtTime(a.city * 0.05 * k, t, 0.8);
  }

  private env(g: GainNode, t0: number, dur: number, peak: number, attack = 0.005): void {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  /** Band-passed noise burst with a downward frequency sweep. */
  private burst(dur: number, f0: number, q: number, gain: number, f1: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    this.env(g, t0, dur, gain);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0, attack = 0.005): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    this.env(g, t0, dur, gain, attack);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  /** Generic bird cry: two rising-then-falling sweeps with vibrato. */
  private screech(v: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f = o.frequency;
    f.setValueAtTime(1300, t0);
    f.exponentialRampToValueAtTime(2300, t0 + 0.12);
    f.exponentialRampToValueAtTime(1500, t0 + 0.3);
    f.exponentialRampToValueAtTime(2000, t0 + 0.38);
    f.exponentialRampToValueAtTime(1100, t0 + 0.6);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 28;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain).connect(f);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    this.env(g, t0, 0.62, 0.35 * v, 0.03);
    o.connect(bp).connect(g).connect(this.master);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + 0.7);
    lfo.stop(t0 + 0.7);
  }
}

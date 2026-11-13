import { tuning } from './tuning';

export type Sfx = 'flap' | 'hop' | 'screech' | 'thud' | 'bonk' | 'chime' | 'pop' | 'splat' | 'clatter' | 'crash' | 'gasp' | 'yelp' | 'win' | 'lose' | 'hiss' | 'whistle' | 'twang' | 'alarm';

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

  play(name: Sfx): void {
    if (!this.ctx || this.muted) return;
    const v = tuning.audio.sfx.value;
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
    }
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

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    this.env(g, t0, dur, gain);
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

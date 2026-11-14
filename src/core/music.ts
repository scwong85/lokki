import { tuning } from './tuning';
import { MUSIC, type MusicTier } from '../data/music';
import { approach, nextTrack } from '../gameplay/musicDirector';

interface Slot {
  tier: MusicTier;
  index: number;
  el: HTMLAudioElement;
  level: number;
}

/**
 * Background music: one track per tier plays at a time, tiers crossfade. Plain HTMLAudioElements
 * (files are bundled, nothing is fetched from elsewhere). Starts after the first user gesture.
 */
export class MusicPlayer {
  slots: Slot[] = [];
  private tier: MusicTier = 'calm';
  private started = false;
  private lastIndex: Record<MusicTier, number> = { calm: -1, playful: -1, chaos: -1 };
  muted = false;
  private base = import.meta.env.BASE_URL;

  get current(): string {
    const s = this.slots.find((x) => x.tier === this.tier);
    return s ? MUSIC[s.tier][s.index].title : '';
  }

  get playing(): MusicTier | null {
    return this.started ? this.tier : null;
  }

  /** Call from a user gesture (autoplay rules). */
  start(): void {
    if (this.started || typeof Audio === 'undefined') return;
    this.started = true;
    this.ensure(this.tier);
  }

  setTier(t: MusicTier): void {
    this.tier = t;
    if (this.started) this.ensure(t);
  }

  private ensure(tier: MusicTier): Slot {
    let s = this.slots.find((x) => x.tier === tier);
    if (!s) {
      const list = MUSIC[tier];
      const index = nextTrack(list.length, this.lastIndex[tier]);
      this.lastIndex[tier] = index;
      const el = new Audio(`${this.base}audio/music/${list[index].file}`);
      el.preload = 'auto';
      el.volume = 0;
      s = { tier, index, el, level: 0 };
      el.addEventListener('ended', () => this.slots.splice(this.slots.indexOf(s!), 1)); // next call picks the next track
      this.slots.push(s);
    }
    if (s.el.paused) void s.el.play().catch(() => undefined);
    return s;
  }

  update(dt: number): void {
    if (!this.started) return;
    const vol = this.muted ? 0 : tuning.audio.master.value * tuning.audio.music.value;
    const fade = tuning.audio.musicFade.value;
    // a tier whose track has finished starts its next one while it is still the wanted tier
    this.ensure(this.tier);
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const s = this.slots[i];
      s.level = approach(s.level, s.tier === this.tier ? 1 : 0, dt, fade);
      s.el.volume = Math.min(1, Math.max(0, s.level * vol));
      if (s.tier !== this.tier && s.level === 0 && !s.el.paused) s.el.pause(); // keeps its position for when the tier returns
    }
    // resume a tier that was paused earlier
    const cur = this.slots.find((x) => x.tier === this.tier);
    if (cur && cur.el.paused && !cur.el.ended) void cur.el.play().catch(() => undefined);
  }
}

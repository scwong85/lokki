import { tuning } from '../core/tuning';

/**
 * Sunbathers lie with their eyes shut. They wake up when a gull's SHADOW crosses their face: the shadow lies offset from the gull
 * by the sun direction, scaled by height, and fades when the gull flies high. A woken sunbather sits up for a while, swats gulls
 * away from the towel, then lies down again. Pure logic.
 */
export interface Sunbather {
  x: number;
  z: number;
  state: 'asleep' | 'awake';
  t: number;
}

export interface SunGull {
  x: number;
  y: number;
  z: number;
  /** Cloud Glide: gliding high shrinks the shadow. */
  cloud: boolean;
}

export type SunEvent = { type: 'woke'; index: number } | { type: 'lay'; index: number } | { type: 'allAwake' };

/** Where a gull's shadow lies on the ground, and how big its "wake radius" is. */
export function shadowOf(g: SunGull, height: number): { x: number; z: number; r: number } {
  const t = tuning.sun;
  const fade = Math.max(0, 1 - height / t.fadeHeight.value);
  const k = g.cloud && height > 5 ? t.cloudFactor.value : 1;
  return { x: g.x + t.shadowDx.value * height, z: g.z + t.shadowDz.value * height, r: t.wakeRadius.value * fade * k };
}

export class Sunbathers {
  readonly list: Sunbather[];
  private all = false;

  constructor(spots: readonly { x: number; z: number }[]) {
    this.list = spots.map((s) => ({ x: s.x, z: s.z, state: 'asleep', t: 0 }));
  }

  update(dt: number, gulls: readonly SunGull[]): { events: SunEvent[]; shoves: { gull: number; x: number; z: number }[] } {
    const events: SunEvent[] = [];
    const shoves: { gull: number; x: number; z: number }[] = [];
    const t = tuning.sun;
    this.list.forEach((s, i) => {
      if (s.state === 'awake') {
        s.t -= dt;
        if (s.t <= 0) {
          s.state = 'asleep';
          events.push({ type: 'lay', index: i });
        }
      }
      gulls.forEach((g, gi) => {
        const sh = shadowOf(g, g.y);
        if (s.state === 'asleep' && sh.r > 0.05 && Math.hypot(sh.x - s.x, sh.z - s.z) < sh.r) {
          s.state = 'awake';
          s.t = t.awakeSeconds.value;
          events.push({ type: 'woke', index: i });
        }
        if (s.state === 'awake' && g.y < 2) {
          const dx = g.x - s.x, dz = g.z - s.z, d = Math.hypot(dx, dz);
          if (d < t.guardRadius.value) {
            const k = (t.shove.value * dt) / Math.max(d, 0.5);
            shoves.push({ gull: gi, x: dx * k, z: dz * k });
          }
        }
      });
    });
    const everyone = this.list.every((s) => s.state === 'awake');
    if (everyone && !this.all) events.push({ type: 'allAwake' });
    this.all = everyone;
    return { events, shoves };
  }
}

import { tuning } from '../core/tuning';

export type HeatReason = 'noticed' | 'snatch' | 'poopNpc' | 'break' | 'tipped' | 'clatter';

export interface TierChange {
  from: number;
  to: number;
}

/** Tier (0..4) for a heat value, using the thresholds in the tuning panel. */
export function tierOf(value: number): number {
  const h = tuning.heat;
  return value >= h.tier4.value ? 4 : value >= h.tier3.value ? 3 : value >= h.tier2.value ? 2 : value >= h.tier1.value ? 1 : 0;
}

/**
 * Heat (0-100): rises with mischief, falls when nobody sees you. The tier decides how hard the city fights back.
 * Pure logic.
 */
export class Heat {
  value = 0;
  private unseenT = 0;
  tier = 0;

  private gain(reason: HeatReason): number {
    const h = tuning.heat;
    switch (reason) {
      case 'noticed': return h.gainNoticed.value;
      case 'snatch': return h.gainSnatch.value;
      case 'poopNpc': return h.gainPoopNpc.value;
      case 'break': return h.gainBreak.value;
      case 'tipped': return h.gainTip.value;
      case 'clatter': return h.gainClatter.value;
    }
  }

  private set(v: number): TierChange | null {
    this.value = Math.min(100, Math.max(0, v));
    const t = tierOf(this.value);
    if (t === this.tier) return null;
    const c = { from: this.tier, to: t };
    this.tier = t;
    return c;
  }

  add(reason: HeatReason): TierChange | null {
    this.unseenT = 0;
    return this.set(this.value + this.gain(reason));
  }

  /** Make sure the city is at least this worked up (a quest starting). */
  raiseTo(v: number): TierChange | null {
    return v > this.value ? this.set(v) : null;
  }

  /** Lower the heat (e.g. the Warden is humiliated). */
  relieve(amount: number): TierChange | null {
    return this.set(this.value - amount);
  }

  tick(dt: number, seen: boolean): TierChange | null {
    if (seen) {
      this.unseenT = 0;
      return null;
    }
    this.unseenT += dt;
    if (this.unseenT < tuning.heat.decayDelay.value) return null;
    return this.set(this.value - tuning.heat.decay.value * dt);
  }

  reset(): void {
    this.value = 0;
    this.tier = 0;
    this.unseenT = 0;
  }
}

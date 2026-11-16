import { tuning } from '../core/tuning';

/**
 * Lawn sprinklers. Peck the valve (stand on it) and every spray zone runs for a while, one section after another; people flee
 * the wet lawn. Pure logic.
 */
export interface SprayZone {
  x: number;
  z: number;
  r: number;
}

export type SprinklerEvent = { type: 'on' } | { type: 'off' };

export class Sprinklers {
  private left = 0;

  constructor(readonly zones: readonly SprayZone[]) {}

  get running(): boolean {
    return this.left > 0;
  }

  /** Seconds left (0 when off). */
  get remaining(): number {
    return Math.max(0, this.left);
  }

  /** A guest is told how long they still run. */
  setRemaining(seconds: number): void {
    this.left = seconds;
  }

  start(): SprinklerEvent[] {
    if (this.left > 0) return [];
    this.left = tuning.sprinkler.seconds.value;
    return [{ type: 'on' }];
  }

  update(dt: number): SprinklerEvent[] {
    if (this.left <= 0) return [];
    this.left -= dt;
    return this.left <= 0 ? [{ type: 'off' }] : [];
  }

  /** Which zone (if any) is spraying over this spot? Sections take turns: each zone is live in its share of the run. */
  wetAt(x: number, z: number): number {
    if (this.left <= 0) return -1;
    for (let i = 0; i < this.zones.length; i++) {
      const s = this.zones[i];
      if (Math.hypot(x - s.x, z - s.z) <= s.r) return i;
    }
    return -1;
  }
}

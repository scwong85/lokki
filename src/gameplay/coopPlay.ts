import { tuning } from '../core/tuning';

/**
 * Co-op teamwork rules (two gulls with different jobs at the same time). Pure logic.
 * - Taunt (decoy and thief): a taunting gull holds people's attention, so the other one goes unseen.
 * - Mid-air pass: a tossed item is caught in flight by the other gull.
 * - Spotter and bomber: one gull's target lock guides the other's droppings.
 * - Rescue: a gull caught by the city's defences is stuck until its partner pecks it free.
 */

export interface P2 {
  x: number;
  z: number;
}

/** Which gull does this person watch? A taunting gull within the taunt radius wins; otherwise the nearest. */
export function watchedGull<T extends P2 & { taunt?: boolean }>(n: P2, gulls: readonly T[]): T {
  const r = tuning.coop.tauntRadius.value;
  let best = gulls[0];
  let bd = Infinity;
  let taunter: T | null = null;
  let td = Infinity;
  for (const g of gulls) {
    const d = Math.hypot(g.x - n.x, g.z - n.z);
    if (d < bd) { bd = d; best = g; }
    if (g.taunt && d <= r && d < td) { td = d; taunter = g; }
  }
  return taunter ?? best;
}

/** Is a snatch by `thief` covered by a partner's taunt? (The decoy must be taunting close enough to the scene.) */
export function decoyCovers(thief: number, at: P2, gulls: readonly (P2 & { taunt?: boolean })[]): boolean {
  return gulls.some((g, i) => i !== thief && !!g.taunt && Math.hypot(g.x - at.x, g.z - at.z) <= tuning.coop.tauntRadius.value);
}

/** Tracks items in flight after a toss or drop, so a catch by the other gull counts as a pass. */
export class PassTracker {
  private flying = new Map<number, { by: number; t: number }>();
  /** Passes in the current chain (reset when the item lands or times out). */
  chain = 0;
  private chainT = -1e9;

  released(propId: number, by: number, now: number): void {
    this.flying.set(propId, { by, t: now });
  }

  /** The thrower of an item still in flight (released a moment ago), or null. */
  thrower(propId: number, now: number): number | null {
    const f = this.flying.get(propId);
    return f && now - f.t <= tuning.coop.passWindow.value ? f.by : null;
  }

  /** Items thrown a moment ago and still counted as in flight. */
  fresh(now: number): number[] {
    const out: number[] = [];
    for (const [id, f] of this.flying) if (now - f.t <= tuning.coop.passWindow.value) out.push(id);
    else this.flying.delete(id);
    return out;
  }

  /** A gull took the item. Returns true when that was a pass (another gull threw it and it was still in flight). */
  grabbed(propId: number, by: number, now: number, airborne: boolean): boolean {
    const from = this.thrower(propId, now);
    this.flying.delete(propId);
    if (from === null || from === by || !airborne) return false;
    this.chain = now - this.chainT <= tuning.coop.chainWindow.value ? this.chain + 1 : 1;
    this.chainT = now;
    return true;
  }

  /** Should this free-flying item jump into the beak of a gull at distance `d`? Only the partner's fresh throws do. */
  autoCatch(propId: number, catcher: number, now: number, d: number, airborne: boolean): boolean {
    const from = this.thrower(propId, now);
    return from !== null && from !== catcher && airborne && d <= tuning.coop.catchRadius.value && now - (this.flying.get(propId)?.t ?? 0) > 0.25;
  }

  reset(): void {
    this.flying.clear();
    this.chain = 0;
    this.chainT = -1e9;
  }
}

/** Did a dropping land on what the partner had locked? */
export function spotterHit(lock: { x: number; y: number; z: number } | null | undefined, hit: { x: number; z: number }): boolean {
  return !!lock && Math.hypot(lock.x - hit.x, lock.z - hit.z) <= tuning.coop.spotRadius.value;
}

/** Gulls caught by the city (net, line, spray): stuck for a while unless the partner comes close and pecks them free. */
export class Tangle {
  readonly left: number[] = [];

  /** Gull `i` was caught. Only matters with two gulls. */
  caught(i: number): void {
    this.left[i] = tuning.coop.tangleSeconds.value;
  }

  stuck(i: number): boolean {
    return (this.left[i] ?? 0) > 0;
  }

  /** Advance. Returns the gulls freed by a partner this tick: [freed, by]. */
  update(dt: number, gulls: readonly (P2 & { y: number })[]): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i < gulls.length; i++) {
      if (!this.stuck(i)) continue;
      this.left[i] -= dt;
      const me = gulls[i];
      for (let j = 0; j < gulls.length; j++) {
        if (j === i || this.stuck(j)) continue;
        const o = gulls[j];
        if (Math.hypot(o.x - me.x, o.z - me.z) <= tuning.coop.rescueRadius.value && Math.abs(o.y - me.y) <= 3) {
          this.left[i] = 0;
          out.push([i, j]);
          break;
        }
      }
    }
    return out;
  }

  reset(): void {
    this.left.length = 0;
  }
}

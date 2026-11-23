import { createRng, type Rng } from '../core/rng';
import { tuning } from '../core/tuning';

/** Things that happen on a schedule, not because of the gull: a ferry comes in, a shower passes, a gust of wind. */
export type TimetableKind = 'ferry' | 'rain' | 'gust';

export interface TimetableEvent {
  kind: TimetableKind;
  /** 'start' when it begins; 'end' for the ones that last (rain, gust). */
  phase: 'start' | 'end';
}

/** Seconds a kind lasts (0 = a moment) and the gap range before the next one, from tuning. */
const spec = (k: TimetableKind, ferryGap?: number): { first: [number, number]; gap: [number, number]; last: number } => {
  const t = tuning.timetable;
  const fg = ferryGap ?? t.ferryGap.value;
  if (k === 'ferry') return { first: [t.ferryFirst.value * 0.8, t.ferryFirst.value * 1.2], gap: [fg * 0.9, fg * 1.1], last: 0 };
  if (k === 'rain') return { first: [t.rainFirst.value * 0.8, t.rainFirst.value * 1.2], gap: [t.rainGap.value * 0.8, t.rainGap.value * 1.2], last: t.rainSeconds.value };
  return { first: [t.gustFirst.value * 0.8, t.gustFirst.value * 1.2], gap: [t.gustGap.value * 0.8, t.gustGap.value * 1.2], last: t.gustSeconds.value };
};

/** A seeded timetable: the same level always runs the same day (so a bug can be reproduced, and co-op players agree). Pure logic. */
export class Timetable {
  private rng: Rng;
  private next = new Map<TimetableKind, number>();
  private until = new Map<TimetableKind, number>();
  private clock = 0;

  constructor(readonly kinds: readonly TimetableKind[], seed = 7, private ferryGap?: number) {
    this.rng = createRng(seed);
    for (const k of kinds) this.next.set(k, this.rng.range(...spec(k, ferryGap).first));
  }

  /** Is this one going on now (rain, gust)? */
  active(k: TimetableKind): boolean {
    return (this.until.get(k) ?? 0) > this.clock;
  }

  /** Seconds until this one next starts (0 while it is going on); null if the level has none. */
  nextIn(k: TimetableKind): number | null {
    if (!this.next.has(k)) return null;
    return this.active(k) ? 0 : Math.max(0, this.next.get(k)! - this.clock);
  }

  update(dt: number): TimetableEvent[] {
    this.clock += dt;
    const out: TimetableEvent[] = [];
    for (const k of this.kinds) {
      const end = this.until.get(k);
      if (end !== undefined && end > 0 && this.clock >= end) {
        this.until.set(k, 0);
        out.push({ kind: k, phase: 'end' });
      }
      const at = this.next.get(k)!;
      if (this.clock >= at && !this.active(k)) {
        const s = spec(k, this.ferryGap);
        out.push({ kind: k, phase: 'start' });
        if (s.last > 0) this.until.set(k, this.clock + s.last);
        this.next.set(k, this.clock + s.last + this.rng.range(...s.gap));
      }
    }
    return out;
  }
}

import type { ObjectiveDef, QuestDef } from '../data/quests';
import type { QuestState } from './quest';
import { stepKey } from './hintLadder';

/**
 * Collection to-dos (M107, docs/design/stages-10min.md section 5): a headline goal with rows you discover on the spot. A row is "???"
 * until the gull has been near its place (then a half title, "??? …something fishy"), and the full wish once it has been right there.
 * Both stick. The row the gull is at now is the one the hint ladder works on. Pure logic.
 */
export type RowSight = 'hidden' | 'seen' | 'known';

/** How much nearer than the reveal radius "right there" is, and how far the half title reaches. */
export const SEEN_FACTOR = 2;
export const FOCUS_FACTOR = 2.5;

export class RowScout {
  private seen = new Set<string>();
  private known = new Set<string>();
  /** The row being worked on (the last known, open row the gull was near), as a ladder key. */
  focus: string | null = null;

  sight(key: string): RowSight {
    return this.known.has(key) ? 'known' : this.seen.has(key) ? 'seen' : 'hidden';
  }

  reset(): void {
    this.seen.clear();
    this.known.clear();
    this.focus = null;
  }

  /** Look around: which rows the gull has come near. */
  update(defs: readonly QuestDef[], quests: readonly QuestState[], gull: { x: number; z: number }): void {
    let best: { key: string; d: number } | null = null;
    for (const d of defs) {
      if (!d.collect) continue;
      const q = quests.find((x) => x.id === d.id);
      if (!q || q.status !== 'active') continue;
      d.objectives.forEach((od, i) => {
        if (!od.row || rowLocked(d, q, i)) return; // a row in a course that is not open yet cannot be found
        const key = stepKey(d.id, od.id);
        const dist = Math.hypot(od.row.reveal.x - gull.x, od.row.reveal.z - gull.z);
        if (dist <= od.row.reveal.r * SEEN_FACTOR) this.seen.add(key);
        if (dist <= od.row.reveal.r) this.known.add(key);
        if (!q.objectives[i].done && this.known.has(key) && dist <= od.row.reveal.r * FOCUS_FACTOR && (!best || dist < best.d)) best = { key, d: dist };
      });
    }
    if (best) this.focus = (best as { key: string }).key;
    else if (this.focus) {
      // the focus stays on a row until it is done
      const [qid, oid] = this.focus.split(':');
      const q = quests.find((x) => x.id === qid);
      if (!q || q.objectives.find((o) => o.id === oid)?.done) this.focus = null;
    }
  }
}

/** Rows done out of rows in a collection to-do. */
export function rowCount(def: QuestDef, q: QuestState): { done: number; total: number } {
  let done = 0, total = 0;
  def.objectives.forEach((od, i) => {
    if (!od.row) return;
    total++;
    if (q.objectives[i]?.done) done++;
  });
  return { done, total };
}

/** The course a row belongs to (rows without one are in course 1). */
export const courseOf = (od: ObjectiveDef): number => od.row?.course ?? 1;

/** Rows of a collection that are in this course. */
export function courseRows(def: QuestDef, course: number): number[] {
  const out: number[] = [];
  def.objectives.forEach((od, i) => {
    if (od.row && courseOf(od) === course) out.push(i);
  });
  return out;
}

/** Is every row of this course done? (A course with no rows counts as done.) */
export function courseDone(def: QuestDef, q: QuestState, course: number): boolean {
  return courseRows(def, course).every((i) => q.objectives[i]?.done);
}

/** How many rows of this course must be done for the next course to open (M118): every row, unless the next course says `need`. */
export function courseTarget(def: QuestDef, course: number): number {
  return def.collect?.courses?.[course]?.need ?? courseRows(def, course).length;
}

/** Has this course been served enough to open the next one? */
export function courseReached(def: QuestDef, q: QuestState, course: number): boolean {
  const done = courseRows(def, course).filter((i) => q.objectives[i]?.done).length;
  return done >= courseTarget(def, course);
}

/** A course is open when every course before it is served enough (M111, M118: `need` lets a stage open the next course after fewer rows, so one hard row cannot lock the rest). Rows outside a collection are always open. */
export function courseOpen(def: QuestDef, q: QuestState, course: number): boolean {
  for (let c = 1; c < course; c++) if (!courseReached(def, q, c)) return false;
  return true;
}

/** Is this objective a row that cannot be worked on yet? */
export function rowLocked(def: QuestDef, q: QuestState, i: number): boolean {
  const od = def.objectives[i];
  return !!def.collect && !!od?.row && !courseOpen(def, q, courseOf(od));
}

/** The highest course number a collection has. */
export const courseCount = (def: QuestDef): number => def.objectives.reduce((m, od) => (od.row ? Math.max(m, courseOf(od)) : m), 1);

/**
 * The row compass (M120): after a long stretch with no progress (no row found, none served), point at the nearest open row the gull has not
 * found yet, so a stage with rows spread over the whole square never leaves the player lost. Found rows get their marker from the hint ladder.
 */
export class RowCompass {
  private idle = 0;
  private sig = '';

  reset(): void {
    this.idle = 0;
    this.sig = '';
  }

  /** `after`: seconds without progress before it points. Returns the spot to point at, or null. */
  update(dt: number, after: number, defs: readonly QuestDef[], quests: readonly QuestState[], scout: RowScout, gull: { x: number; z: number }): { x: number; z: number } | null {
    let best: { x: number; z: number; d: number } | null = null;
    let sig = '';
    for (const d of defs) {
      if (!d.collect) continue;
      const q = quests.find((x) => x.id === d.id);
      if (!q || q.status !== 'active') continue;
      d.objectives.forEach((od, i) => {
        if (!od.row) return;
        const key = `${d.id}:${od.id}`;
        const found = scout.sight(key) === 'known';
        sig += q.objectives[i].done ? 'd' : found ? 'k' : '-';
        if (q.objectives[i].done || found || rowLocked(d, q, i)) return;
        const dist = Math.hypot(od.row.reveal.x - gull.x, od.row.reveal.z - gull.z);
        if (!best || dist < best.d) best = { x: od.row.reveal.x, z: od.row.reveal.z, d: dist };
      });
    }
    if (sig !== this.sig) {
      this.sig = sig;
      this.idle = 0;
    }
    this.idle += dt;
    if (!best || this.idle < after) return null;
    const b = best as { x: number; z: number };
    return { x: b.x, z: b.z };
  }
}

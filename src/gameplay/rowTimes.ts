/**
 * Time per row (M111, docs/design/picnic-v2.md section 8): when each row of a collection was delivered and how long it took after the one before,
 * so a playtest says where the minutes went. Pure.
 */
export interface RowSplit {
  quest: string;
  objective: string;
  /** "A tablecloth (the Waiter)". */
  label: string;
  /** 1-based course. */
  course: number;
  /** Seconds since the level started when it was delivered. */
  at: number;
  /** Seconds since the previous row (or the start). */
  since: number;
}

export const fmtClock = (s: number): string => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

export class RowTimes {
  splits: RowSplit[] = [];
  /** When each course was served (course number -> seconds). */
  served = new Map<number, number>();
  private last = 0;

  record(quest: string, objective: string, label: string, course: number, at: number): void {
    this.splits.push({ quest, objective, label, course, at, since: Math.max(0, at - this.last) });
    this.last = at;
  }

  course(course: number, at: number): void {
    if (!this.served.has(course)) this.served.set(course, at);
  }

  reset(): void {
    this.splits = [];
    this.served.clear();
    this.last = 0;
  }

  /**
   * Lines for the results card: rows grouped under their course heading (each course once, even when rows of two courses were done in turn),
   * with the time at and since. A row done in the same second as the one before it (its item was already on the roof when its course opened)
   * says so, so a "+0:00" is not mistaken for a free row.
   */
  lines(courseNames: readonly string[] = []): string[] {
    if (!this.splits.length) return [];
    const out = ['Time per row (in the order you did them):'];
    const courses = [...new Set(this.splits.map((x) => x.course))].sort((a, b) => a - b);
    for (const c of courses) {
      if (courseNames.length) {
        const at = this.served.get(c);
        out.push(`${courseNames[c - 1] ?? `Course ${c}`}${at !== undefined ? ` (served at ${fmtClock(at)})` : ''}`);
      }
      for (const s of this.splits.filter((x) => x.course === c)) out.push(`${s.label}: ${fmtClock(s.at)}, +${fmtClock(s.since)}${s.since < 1 ? ' (its item was ready)' : ''}`);
    }
    return out;
  }
}

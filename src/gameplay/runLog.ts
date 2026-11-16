/**
 * A timestamped record of what happened in a run. Scoring, headlines and awards all read it. Pure.
 */
export interface RunEvent {
  t: number;
  kind: string;
  by: number;
}

export class RunLog {
  readonly events: RunEvent[] = [];

  constructor(private readonly cap = 2000) {}

  add(t: number, kind: string, by = 0): void {
    if (this.events.length >= this.cap) this.events.shift();
    this.events.push({ t, kind, by });
  }

  count(kind: string): number {
    return this.events.reduce((n, e) => n + (e.kind === kind ? 1 : 0), 0);
  }

  /** Distinct kinds that happened, with counts. */
  tally(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const e of this.events) out[e.kind] = (out[e.kind] ?? 0) + 1;
    return out;
  }

  clear(): void {
    this.events.length = 0;
  }
}

/** What you got up to this run: shown on the level-complete screen. Pure logic. */
export type StatKind = 'snatch' | 'poopPerson' | 'poopWarden' | 'break' | 'tip' | 'sprayed' | 'dodge';

export interface StatSummary {
  seconds: number;
  snatches: number;
  poopsOnPeople: number;
  poopsOnWarden: number;
  broken: number;
  tipped: number;
  hits: number;
  dodges: number;
  peakHeat: number;
}

export class LevelStats {
  private s: StatSummary = this.blank();

  private blank(): StatSummary {
    return { seconds: 0, snatches: 0, poopsOnPeople: 0, poopsOnWarden: 0, broken: 0, tipped: 0, hits: 0, dodges: 0, peakHeat: 0 };
  }

  tick(dt: number, heat: number): void {
    this.s.seconds += dt;
    this.s.peakHeat = Math.max(this.s.peakHeat, heat);
  }

  add(kind: StatKind): void {
    const s = this.s;
    if (kind === 'snatch') s.snatches++;
    else if (kind === 'poopPerson') s.poopsOnPeople++;
    else if (kind === 'poopWarden') s.poopsOnWarden++;
    else if (kind === 'break') s.broken++;
    else if (kind === 'tip') s.tipped++;
    else if (kind === 'sprayed') s.hits++;
    else s.dodges++;
  }

  summary(): StatSummary {
    return { ...this.s };
  }

  reset(): void {
    this.s = this.blank();
  }
}

export function formatTime(seconds: number): string {
  const t = Math.round(seconds);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

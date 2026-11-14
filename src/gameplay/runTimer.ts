/** Normal play vs a speedrun: the clock starts on the first move and stops when the finale is won. Pure logic. */
export class RunTimer {
  mode: 'normal' | 'speedrun' = 'normal';
  running = false;
  finished = false;
  time = 0;

  startSpeedrun(): void {
    this.mode = 'speedrun';
    this.running = false;
    this.finished = false;
    this.time = 0;
  }

  setNormal(): void {
    this.mode = 'normal';
    this.running = false;
    this.finished = false;
    this.time = 0;
  }

  /** The first move of a speedrun starts the clock. */
  begin(): void {
    if (this.mode === 'speedrun' && !this.running && !this.finished) this.running = true;
  }

  tick(dt: number): void {
    if (this.running) this.time += dt;
  }

  /** The finale is won: returns the speedrun time (null outside a running speedrun). */
  finish(): number | null {
    if (this.mode !== 'speedrun' || !this.running) return null;
    this.running = false;
    this.finished = true;
    return this.time;
  }
}

/** Is this time a new best (faster than the old one, or the first)? */
export const isBest = (time: number, best: number | null): boolean => best === null || time < best;

/** m:ss.t for the speedrun clock. */
export function formatClock(seconds: number): string {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

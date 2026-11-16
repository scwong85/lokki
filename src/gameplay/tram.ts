import { tuning } from '../core/tuning';

/**
 * The Senate Square tram: runs back and forth along a straight track (x from `x0` to `x1` at height z), stops at a stop in the
 * middle for a few seconds, rings its bell when it sets off, and halts while something blocks the track ahead (the driver gets out
 * to clear it). Pure logic: no rendering.
 */
export type TramMode = 'run' | 'dwell' | 'blocked';

export interface TramEvent {
  type: 'bell' | 'blocked' | 'cleared';
}

export interface TramDef {
  z: number;
  x0: number;
  x1: number;
  stopX: number;
  length: number;
  width: number;
  roofY: number;
}

export class Tram {
  x: number;
  dir: 1 | -1 = 1;
  mode: TramMode = 'dwell';
  /** Signed velocity along x this tick (for carrying a gull on the roof). */
  vx = 0;
  private timer = 0;
  private blockT = 0;
  private stopped = false;

  constructor(readonly def: TramDef) {
    this.x = def.x0;
    this.timer = tuning.tram.startDelay.value;
  }

  /** Front of the tram in the driving direction. */
  get frontX(): number {
    return this.x + this.dir * this.def.length / 2;
  }

  /** Advance. `blockerAhead`: something lies on the track within the braking distance. */
  update(dt: number, blockerAhead: boolean): TramEvent[] {
    const ev: TramEvent[] = [];
    const t = tuning.tram;
    const before = this.x;
    if (this.mode === 'blocked') {
      this.blockT -= dt;
      if (this.blockT <= 0 && !blockerAhead) {
        this.mode = 'run';
        ev.push({ type: 'cleared' }, { type: 'bell' });
      }
    } else if (this.mode === 'dwell') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.mode = 'run';
        this.stopped = true;
        ev.push({ type: 'bell' });
      }
    } else {
      if (blockerAhead) {
        this.mode = 'blocked';
        this.blockT = t.blockedSeconds.value;
        ev.push({ type: 'blocked' });
      } else {
        this.x += this.dir * t.speed.value * dt;
        const d = this.def;
        if (!this.stopped && Math.sign(this.x - d.stopX) === this.dir && Math.abs(this.x - d.stopX) < t.speed.value * dt + 0.01) {
          this.x = d.stopX;
          this.mode = 'dwell';
          this.timer = t.dwellSeconds.value;
        }
        if (this.stopped && Math.abs(this.x - d.stopX) > 6) this.stopped = false;
        if ((this.dir === 1 && this.x >= d.x1) || (this.dir === -1 && this.x <= d.x0)) {
          this.x = this.dir === 1 ? d.x1 : d.x0;
          this.dir = (this.dir * -1) as 1 | -1;
          this.mode = 'dwell';
          this.timer = t.endSeconds.value;
          this.stopped = false;
        }
      }
    }
    this.vx = dt > 0 ? (this.x - before) / dt : 0;
    return ev;
  }

  /** Is (x,z) on the roof footprint (with a little slack)? */
  onRoof(x: number, z: number, slack = 0): boolean {
    const d = this.def;
    return Math.abs(x - this.x) <= d.length / 2 + slack && Math.abs(z - d.z) <= d.width / 2 + slack;
  }

  /** Does a point lie on the track ahead within `ahead` metres of the tram's front? */
  trackAhead(px: number, pz: number, ahead: number): boolean {
    const d = this.def;
    if (Math.abs(pz - d.z) > d.width / 2 + tuning.tram.trackSlack.value) return false;
    const rel = (px - this.frontX) * this.dir;
    return rel > -0.2 && rel <= ahead;
  }
}

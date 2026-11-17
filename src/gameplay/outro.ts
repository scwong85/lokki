/**
 * The victory run (M42): when a level is cleared the gull lands, then runs straight at the camera laughing while the camera
 * backs away in front of it. This file is the pure part: finding a clear stretch of ground, the camera path, and the
 * phase clock. The game wires it to the gull, the camera and the level card.
 */
export interface V2 { x: number; z: number }
export interface Ground { y: number; water: boolean }
/** Ground height and water at a point (the top surface there). */
export type Sample = (x: number, z: number) => Ground;

export interface RunPlan {
  /** Where the gull lands and starts to run. */
  start: V2;
  /** Unit direction of the run (towards the camera). */
  dir: V2;
  /** How much flat, dry ground there is ahead (metres), camera room included. */
  flat: number;
  /** The ground height at the start. */
  y: number;
}

/** How far the ground stays dry and level (within `tol`) from `from` along `dir`, up to `max` metres. */
export function flatRun(sample: Sample, from: V2, dir: V2, max: number, tol = 0.35, step = 1, side = 1.8): number {
  const g0 = sample(from.x, from.z);
  if (g0.water) return 0;
  const px = -dir.z * side, pz = dir.x * side; // the ground to either side must be fine too (no running along a quay edge)
  const ok = (x: number, z: number): boolean => {
    const g = sample(x, z);
    return !g.water && Math.abs(g.y - g0.y) <= tol;
  };
  let d = 0;
  while (d + step <= max) {
    const x = from.x + dir.x * (d + step), z = from.z + dir.z * (d + step);
    if (!ok(x, z) || !ok(x + px, z + pz) || !ok(x - px, z - pz)) break;
    d += step;
  }
  return d;
}

const dirAt = (a: number): V2 => ({ x: Math.cos(a), z: Math.sin(a) });

/**
 * Pick where to land and which way to run: the longest flat run from the gull's own spot, or from a ring of spots around it
 * if that is too short (over water, a wall, a roof edge). Returns the best found even if it is shorter than `need`.
 */
export function planRun(sample: Sample, from: V2, need: number, heading = 0, rings = [0, 8, 16, 26, 38, 52]): RunPlan {
  let best = null as RunPlan | null;
  for (const r of rings) {
    const spots = r === 0 ? 1 : 10;
    for (let i = 0; i < spots; i++) {
      const a = (i / spots) * Math.PI * 2;
      const start = r === 0 ? { ...from } : { x: from.x + Math.cos(a) * r, z: from.z + Math.sin(a) * r };
      const g = sample(start.x, start.z);
      if (g.water) continue;
      for (let k = 0; k < 16; k++) {
        // directions in order of preference: the way the gull was facing first
        const ang = heading + (k / 16) * Math.PI * 2;
        const dir = dirAt(ang);
        const flat = flatRun(sample, start, dir, need + 4);
        if (!best || flat > best.flat + 0.5) best = { start, dir, flat, y: g.y };
        if (best.flat >= need) return best;
      }
    }
    if (best && best.flat >= need) break;
  }
  return best ?? { start: { ...from }, dir: dirAt(heading), flat: 0, y: sample(from.x, from.z).y };
}

/** The camera yaw that makes "forward" run along `dir` (camera forward is (-sin yaw, -cos yaw)). */
export const yawFor = (dir: V2): number => Math.atan2(-dir.x, -dir.z);

export interface CamCfg { distance: number; height: number; sway: number }

/** The camera sits ahead of the gull on the run line, looks back at it, and drifts a little side to side. */
export function outroCamera(gull: { x: number; y: number; z: number }, dir: V2, time: number, cfg: CamCfg, groundY = 0): { pos: { x: number; y: number; z: number }; look: { x: number; y: number; z: number } } {
  const side = Math.sin(time * 0.9) * cfg.sway;
  const px = -dir.z, pz = dir.x; // sideways
  return {
    pos: { x: gull.x + dir.x * cfg.distance + px * side, y: Math.max(gull.y, groundY) + cfg.height, z: gull.z + dir.z * cfg.distance + pz * side },
    look: { x: gull.x, y: gull.y + 0.15, z: gull.z },
  };
}

export type OutroPhase = 'idle' | 'land' | 'run' | 'hold' | 'done';

export interface OutroTimes { land: number; run: number; hold: number }

/** The clock of the victory run. Land until the gull is on the ground (at least a moment), run, hold, done. */
export class Outro {
  phase: OutroPhase = 'idle';
  t = 0;
  plan: RunPlan | null = null;
  runFor = 0;

  constructor(private readonly times: () => OutroTimes) {}

  get active(): boolean {
    return this.phase !== 'idle' && this.phase !== 'done';
  }

  start(plan: RunPlan, speed: number): void {
    this.plan = plan;
    const room = Math.max(0, plan.flat - 3);
    this.runFor = Math.min(this.times().run, room / Math.max(0.1, speed));
    this.phase = 'land';
    this.t = 0;
  }

  /** Skip straight to the end (any key press). */
  skip(): void {
    if (this.active) this.phase = 'done';
  }

  /** Advance. `grounded`: the gull is standing on the ground. Returns true on the tick the whole thing ends. */
  tick(dt: number, grounded: boolean): boolean {
    if (!this.active) return false;
    this.t += dt;
    const T = this.times();
    if (this.phase === 'land' && ((grounded && this.t >= Math.min(0.5, T.land)) || this.t > T.land + 2.5)) {
      this.phase = this.runFor > 0.3 ? 'run' : 'hold';
      this.t = 0;
    } else if (this.phase === 'run' && this.t >= this.runFor) {
      this.phase = 'hold';
      this.t = 0;
    } else if (this.phase === 'hold' && this.t >= T.hold) {
      this.phase = 'done';
      return true;
    }
    return this.phase === 'done';
  }
}

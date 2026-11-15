/**
 * Ambient street life: pedestrians and cyclists who just go about their day (no senses, no needs, no effect on quests).
 * Pure movement rules so they are testable; the models live in `world/streetLife.ts`.
 */
import type { Rng } from '../core/rng';

export interface Walker {
  id: number;
  kind: 'walk' | 'bike';
  x: number;
  z: number;
  /** Facing; forward = (-sin h, -cos h) as everywhere in the game. */
  heading: number;
  tx: number;
  tz: number;
  /** Seconds still to wait before setting off. */
  wait: number;
  speed: number;
  /** Walk-cycle phase (people) or wheel angle (bikes). */
  phase: number;
  moving: boolean;
}

export interface WalkCtx {
  walkable: (x: number, z: number) => boolean;
  rng: Rng;
}

const headingTo = (dx: number, dz: number): number => Math.atan2(-dx, -dz);
const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Is the straight line free of water and walls? (sampled every 1.5 m) */
export function lineWalkable(walkable: (x: number, z: number) => boolean, x1: number, z1: number, x2: number, z2: number): boolean {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.ceil(len / 1.5));
  for (let i = 1; i <= n; i++) if (!walkable(x1 + ((x2 - x1) * i) / n, z1 + ((z2 - z1) * i) / n)) return false;
  return true;
}

/** Choose somewhere new to go (a random direction, `minD`..`maxD` metres, over free ground). False if nothing was found. */
export function pickTarget(w: Walker, ctx: WalkCtx, minD: number, maxD: number, tries = 14): boolean {
  for (let i = 0; i < tries; i++) {
    const a = ctx.rng.range(0, Math.PI * 2), d = ctx.rng.range(minD, maxD);
    const tx = w.x + Math.cos(a) * d, tz = w.z + Math.sin(a) * d;
    if (ctx.walkable(tx, tz) && lineWalkable(ctx.walkable, w.x, w.z, tx, tz)) {
      w.tx = tx;
      w.tz = tz;
      return true;
    }
  }
  return false;
}

export function newWalker(id: number, kind: Walker['kind'], x: number, z: number, rng: Rng): Walker {
  return { id, kind, x, z, heading: rng.range(-Math.PI, Math.PI), tx: x, tz: z, wait: rng.range(0, 3), speed: kind === 'bike' ? rng.range(3.6, 5.2) : rng.range(1.0, 1.55), phase: rng.range(0, 6), moving: false };
}

/** One step: wait, choose a target, turn towards it and walk; arriving makes people pause a moment and cyclists carry straight on. */
export function stepWalker(w: Walker, dt: number, ctx: WalkCtx): void {
  if (w.wait > 0) {
    w.wait -= dt;
    w.moving = false;
    return;
  }
  const dx = w.tx - w.x, dz = w.tz - w.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.6) {
    // arrived (or never had a target): people stop for a breath, cyclists immediately pick a long run
    w.wait = w.kind === 'walk' ? ctx.rng.range(0.5, 4) : 0;
    if (!pickTarget(w, ctx, w.kind === 'bike' ? 45 : 10, w.kind === 'bike' ? 130 : 38)) w.wait = Math.max(w.wait, 1.5); // boxed in: try again soon
    w.moving = false;
    return;
  }
  const want = headingTo(dx, dz);
  const turn = angleDiff(want, w.heading);
  const maxTurn = (w.kind === 'bike' ? 2.2 : 3.4) * dt;
  w.heading += Math.max(-maxTurn, Math.min(maxTurn, turn));
  if (Math.abs(turn) > 1.2) {
    w.moving = false; // turn on the spot first
    return;
  }
  const step = Math.min(dist, w.speed * dt);
  const nx = w.x - Math.sin(w.heading) * step, nz = w.z - Math.cos(w.heading) * step;
  if (!ctx.walkable(nx, nz)) {
    pickTarget(w, ctx, 8, 30); // something is in the way: go somewhere else
    w.moving = false;
    return;
  }
  w.x = nx;
  w.z = nz;
  w.moving = true;
  w.phase += step * (w.kind === 'bike' ? 1 / 0.34 : 2.2);
}

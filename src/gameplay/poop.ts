import { tuning } from '../core/tuning';
import { windAt } from '../gull/wind';
import type { World } from '../world/collision';

export interface PoopState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface PoopHit {
  x: number;
  y: number;
  z: number;
  /** Axis-aligned surface normal (decal orientation). */
  nx: number;
  ny: number;
  nz: number;
  /** Index into the `props` list given to stepPoop, when a prop was hit. */
  prop: number | null;
}

export interface HitSphere {
  x: number;
  y: number;
  z: number;
  r: number;
}

/** Start state: inherits part of the gull's velocity. */
export function spawnPoop(from: { x: number; y: number; z: number }, vel: { x: number; y: number; z: number }): PoopState {
  const k = tuning.poop.inherit.value;
  return { x: from.x, y: from.y - 0.3, z: from.z, vx: vel.x * k, vy: vel.y * k, vz: vel.z * k };
}

/**
 * Advance a poop by dt: gravity, plus sideways speed relaxing toward the wind (so wind drifts it).
 * Returns the hit if it touched the world or a prop during the move.
 */
export function stepPoop(p: PoopState, dt: number, time: number, world: World, props: readonly HitSphere[] = []): PoopHit | null {
  const t = tuning.poop;
  const w = windAt(time);
  p.vy -= t.gravity.value * dt;
  const k = Math.min(1, t.drag.value * dt);
  p.vx += (w.x * t.windEffect.value - p.vx) * k;
  p.vz += (w.z * t.windEffect.value - p.vz) * k;

  // march along the move in <= 0.25 m steps so thin walls and small props are not skipped
  const dx = p.vx * dt, dy = p.vy * dt, dz = p.vz * dt;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.25));
  let px = p.x, py = p.y, pz = p.z;
  for (let i = 1; i <= n; i++) {
    const nx = p.x + (dx * i) / n, ny = p.y + (dy * i) / n, nz = p.z + (dz * i) / n;
    for (let j = 0; j < props.length; j++) {
      const s = props[j];
      if (Math.hypot(nx - s.x, ny - s.y, nz - s.z) <= s.r + 0.12) {
        p.x = nx; p.y = ny; p.z = nz;
        return { x: nx, y: ny, z: nz, nx: 0, ny: 1, nz: 0, prop: j };
      }
    }
    if (world.solidAt(nx, ny, nz)) {
      p.x = px; p.y = py; p.z = pz;
      return surfaceHit(world, px, py, pz, nx, ny, nz);
    }
    px = nx; py = ny; pz = nz;
  }
  p.x = px; p.y = py; p.z = pz;
  return null;
}

/** Where a poop dropped now would land (for the aim reticle). Same physics as the real thing. */
export function predictPoop(
  from: { x: number; y: number; z: number },
  vel: { x: number; y: number; z: number },
  time: number,
  world: World,
  props: readonly HitSphere[] = [],
): PoopHit | null {
  const p = spawnPoop(from, vel);
  const dt = 1 / 30;
  for (let i = 0; i < 150; i++) {
    const hit = stepPoop(p, dt, time + i * dt, world, props);
    if (hit) return hit;
  }
  return null;
}

/** Surface hit between the last free point (px..) and the first solid point (nx..): axis-aligned normal by probing. */
function surfaceHit(world: World, px: number, py: number, pz: number, nx: number, ny: number, nz: number): PoopHit {
  if (ny <= 0) return { x: nx, y: 0, z: nz, nx: 0, ny: 1, nz: 0, prop: null };
  const d = [nx - px, ny - py, nz - pz];
  const probe = 0.35;
  let best = -1;
  let bestScore = -1;
  let bestSign = 1;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) continue;
    const sign = d[a] > 0 ? -1 : 1; // the free side is opposite to our travel along this axis
    const q = [nx, ny, nz];
    q[a] += sign * probe;
    if (!world.solidAt(q[0], q[1], q[2]) && Math.abs(d[a]) > bestScore) {
      best = a;
      bestScore = Math.abs(d[a]);
      bestSign = sign;
    }
  }
  const n = [0, 0, 0];
  if (best >= 0) n[best] = bestSign;
  else n[1] = 1;
  return { x: px, y: py, z: pz, nx: n[0], ny: n[1], nz: n[2], prop: null };
}

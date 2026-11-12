import { tuning } from '../core/tuning';

export interface Target {
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Seconds until active again; 0 = active. */
  cooldown: number;
}

export function updateTargets(targets: Target[], dt: number): void {
  for (const t of targets) t.cooldown = Math.max(0, t.cooldown - dt);
}

/** Active targets touched by a diving gull (sphere radius r at p). Marks them as hit. */
export function diveHits(targets: Target[], p: { x: number; y: number; z: number }, r: number): Target[] {
  const hits: Target[] = [];
  for (const t of targets) {
    if (t.cooldown > 0) continue;
    const reach = t.radius + r + tuning.dive.hitForgiveness.value;
    if (Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) <= reach) {
      t.cooldown = tuning.course.targetRespawn.value;
      hits.push(t);
    }
  }
  return hits;
}

/** Direction of a dive line for a heading (0 = -Z) and downward angle. */
export function diveDir(heading: number, angle: number): { x: number; y: number; z: number } {
  return { x: -Math.sin(heading) * Math.cos(angle), y: -Math.sin(angle), z: -Math.cos(heading) * Math.cos(angle) };
}

/** Active target closest to the dive line from p, inside the assist cone and range. */
export function bestAimTarget(
  targets: readonly Target[],
  p: { x: number; y: number; z: number },
  heading: number,
  angle: number,
): Target | null {
  const d = tuning.dive;
  const cone = (d.assistConeDeg.value * Math.PI) / 180;
  const dir = diveDir(heading, angle);
  let best: Target | null = null;
  let bestAng = cone;
  for (const t of targets) {
    if (t.cooldown > 0) continue;
    const vx = t.x - p.x;
    const vy = t.y - p.y;
    const vz = t.z - p.z;
    const dist = Math.hypot(vx, vy, vz);
    if (dist < 1 || dist > d.assistRange.value) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, (dir.x * vx + dir.y * vy + dir.z * vz) / dist)));
    if (ang < bestAng) {
      bestAng = ang;
      best = t;
    }
  }
  return best;
}

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

/**
 * Smoothing for things we only hear about now and then (the other player's gull, people and props on a guest's screen).
 * Between updates the target keeps moving at its last known speed; the shown pose eases towards it. Pure.
 */
export interface Pose {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
}

const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Move `cur` towards `target` over one step; `target` itself carries on at its velocity. `rate` is how fast it catches up (1/s). */
export function followRemote(cur: Pose, target: Pose, dt: number, rate: number): void {
  target.x += target.vx * dt;
  target.y += target.vy * dt;
  target.z += target.vz * dt;
  const k = 1 - Math.exp(-rate * dt);
  cur.x += (target.x - cur.x) * k;
  cur.y += (target.y - cur.y) * k;
  cur.z += (target.z - cur.z) * k;
  cur.vx = target.vx;
  cur.vy = target.vy;
  cur.vz = target.vz;
  cur.heading += angleDiff(target.heading, cur.heading) * k;
}

/** Ease a single number (or an angle) towards a target. */
export const easeTo = (cur: number, target: number, dt: number, rate: number): number => cur + (target - cur) * (1 - Math.exp(-rate * dt));
export const easeAngle = (cur: number, target: number, dt: number, rate: number): number => cur + angleDiff(target, cur) * (1 - Math.exp(-rate * dt));

import { tuning } from '../core/tuning';

export interface Motion {
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number; // radians, 0 = facing -Z
}

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * One fixed step of M0 ground movement. Pure logic.
 * `ax`/`ay` are right/forward axes; `camYaw` rotates them into world space.
 */
export function stepMotion(m: Motion, ax: number, ay: number, camYaw: number, dt: number): void {
  const g = tuning.gull;
  const len = Math.hypot(ax, ay);
  if (len > 0) {
    const nx = ax / Math.max(1, len);
    const ny = ay / Math.max(1, len);
    // camera looks toward -Z at yaw 0; forward = (-sin yaw, -cos yaw)
    const c = Math.cos(camYaw);
    const s = Math.sin(camYaw);
    const wx = nx * c - ny * s;
    const wz = -nx * s - ny * c;
    m.vx += wx * g.acceleration.value * dt;
    m.vz += wz * g.acceleration.value * dt;
  } else {
    const sp = Math.hypot(m.vx, m.vz);
    const drop = Math.min(sp, g.friction.value * dt);
    if (sp > 0) {
      m.vx -= (m.vx / sp) * drop;
      m.vz -= (m.vz / sp) * drop;
    }
  }
  const sp = Math.hypot(m.vx, m.vz);
  if (sp > g.maxSpeed.value) {
    m.vx *= g.maxSpeed.value / sp;
    m.vz *= g.maxSpeed.value / sp;
  }
  if (sp > 0.2) {
    const target = Math.atan2(-m.vx, -m.vz);
    const diff = angleDiff(target, m.heading);
    const maxTurn = g.turnRate.value * dt;
    m.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
  }
  m.x += m.vx * dt;
  m.z += m.vz * dt;
}

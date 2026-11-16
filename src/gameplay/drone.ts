import { tuning } from '../core/tuning';

/**
 * The gull-hunting drone (the city's last deterrent): it hovers after the gull, dives at it, and its battery runs down.
 * A dive right at it (a bonk) drains the battery faster. When the battery is empty it lands: steal the battery to stop it for good.
 * Pure logic.
 */
export type DroneMode = 'hunt' | 'windup' | 'recover' | 'down';

export interface Drone {
  x: number;
  y: number;
  z: number;
  mode: DroneMode;
  /** Seconds of battery left. */
  battery: number;
  t: number;
  cd: number;
  aimX: number;
  aimY: number;
  aimZ: number;
}

export type DroneEvent =
  | { type: 'hit'; dx: number; dz: number }
  | { type: 'dodged' }
  | { type: 'bonk' }
  | { type: 'landed'; x: number; z: number };

export interface DroneGull {
  x: number;
  y: number;
  z: number;
  diving: boolean;
}

export const newDrone = (x: number, z: number): Drone => ({ x, y: 8, z, mode: 'hunt', battery: tuning.drone.battery.value, t: 0, cd: 1.5, aimX: x, aimY: 8, aimZ: z });

const dist3 = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function stepDrone(d: Drone, g: DroneGull, dt: number): DroneEvent[] {
  const ev: DroneEvent[] = [];
  const t = tuning.drone;
  d.t += dt;
  d.cd = Math.max(0, d.cd - dt);
  if (d.mode === 'down') return ev;
  d.battery -= dt;
  if (d.battery <= 0) {
    d.mode = 'down';
    d.y = 0.4;
    ev.push({ type: 'landed', x: d.x, z: d.z });
    return ev;
  }
  // a diving gull that reaches the drone bonks it: the battery drains faster
  if (g.diving && dist3(d, g) < t.bonkRange.value && d.mode !== 'recover') {
    d.battery = Math.max(0, d.battery - t.bonkDrain.value);
    d.mode = 'recover';
    d.t = 0;
    ev.push({ type: 'bonk' });
    return ev;
  }
  const flyTo = (x: number, y: number, z: number, speed: number) => {
    const dx = x - d.x, dy = y - d.y, dz = z - d.z;
    const l = Math.hypot(dx, dy, dz);
    if (l < 1e-3) return;
    const s = Math.min(l, speed * dt);
    d.x += (dx / l) * s;
    d.y += (dy / l) * s;
    d.z += (dz / l) * s;
  };
  switch (d.mode) {
    case 'hunt': {
      // hover a little above the gull and close in
      const hover = Math.min(10, Math.max(2.4, g.y + t.height.value));
      if (Math.hypot(g.x - d.x, g.z - d.z) > 2.2) flyTo(g.x, hover, g.z, t.speed.value);
      else flyTo(d.x, hover, d.z, t.speed.value);
      if (d.cd <= 0 && dist3(d, g) < t.attackRange.value) {
        d.mode = 'windup';
        d.t = 0;
        d.aimX = g.x;
        d.aimY = g.y;
        d.aimZ = g.z;
      }
      break;
    }
    case 'windup': {
      // hang still while the aim is locked (the gull can dodge), then dive at it
      if (d.t >= t.windup.value) {
        flyTo(d.aimX, d.aimY, d.aimZ, t.speed.value * 3);
        if (dist3(d, { x: d.aimX, y: d.aimY, z: d.aimZ }) < 0.6 || d.t >= t.windup.value + 0.6) {
          const away = Math.hypot(g.x - d.x, g.z - d.z) || 1;
          if (dist3(d, g) < t.hitRange.value) ev.push({ type: 'hit', dx: (g.x - d.x) / away, dz: (g.z - d.z) / away });
          else ev.push({ type: 'dodged' });
          d.mode = 'recover';
          d.t = 0;
          d.cd = t.cooldown.value;
        }
      }
      break;
    }
    case 'recover':
      flyTo(d.x, Math.min(10, d.y + 2), d.z, t.speed.value * 0.6); // pulls back up
      if (d.t >= 0.8) {
        d.mode = 'hunt';
        d.t = 0;
      }
      break;
  }
  return ev;
}

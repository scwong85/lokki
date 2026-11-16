import { tuning } from '../core/tuning';

/**
 * Kalle, the rival gull (Act 3): he flies to the nearest free snack, carries it to his perch and eats it. First to a set number of
 * snacks wins the duel. A diving gull close to him while he carries makes him drop it. Pure logic; the model is in world/kalle.ts.
 */
export type KalleMode = 'perch' | 'seek' | 'carry' | 'flee';

export interface Kalle {
  x: number;
  y: number;
  z: number;
  heading: number;
  mode: KalleMode;
  target: number | null;
  carrying: number | null;
  score: number;
  t: number;
}

export interface Snack {
  id: number;
  x: number;
  y: number;
  z: number;
}

export type KalleEvent = { type: 'grab'; id: number } | { type: 'deliver'; id: number } | { type: 'dropped'; id: number };

export const newKalle = (perch: { x: number; z: number }): Kalle => ({ x: perch.x, y: 0.6, z: perch.z, heading: 0, mode: 'perch', target: null, carrying: null, score: 0, t: 0 });

const headingTo = (dx: number, dz: number) => Math.atan2(-dx, -dz);

/** `snacks`: free snacks right now. `gulls`: the players. */
export function stepKalle(k: Kalle, snacks: readonly Snack[], gulls: readonly { x: number; y: number; z: number; diving: boolean }[], perch: { x: number; z: number }, dt: number): KalleEvent[] {
  const ev: KalleEvent[] = [];
  const t = tuning.kalle;
  k.t += dt;
  const flyTo = (x: number, y: number, z: number, speed: number) => {
    const dx = x - k.x, dy = y - k.y, dz = z - k.z;
    const l = Math.hypot(dx, dy, dz);
    if (l < 1e-3) return 0;
    const s = Math.min(l, speed * dt);
    k.x += (dx / l) * s;
    k.y += (dy / l) * s;
    k.z += (dz / l) * s;
    if (Math.hypot(dx, dz) > 0.3) k.heading = headingTo(dx, dz);
    return l;
  };
  // a diving gull close to a carrying Kalle makes him drop it and flee
  if (k.mode === 'carry' && k.carrying !== null && gulls.some((g) => g.diving && Math.hypot(g.x - k.x, g.y - k.y, g.z - k.z) < t.scareRange.value)) {
    ev.push({ type: 'dropped', id: k.carrying });
    k.carrying = null;
    k.mode = 'flee';
    k.t = 0;
    return ev;
  }
  switch (k.mode) {
    case 'perch':
      flyTo(perch.x, 0.6, perch.z, t.speed.value);
      if (k.t >= t.thinkTime.value) {
        let best: Snack | null = null;
        let bd = t.range.value;
        for (const s of snacks) {
          const d = Math.hypot(s.x - k.x, s.z - k.z);
          if (d < bd) {
            bd = d;
            best = s;
          }
        }
        if (best) {
          k.target = best.id;
          k.mode = 'seek';
          k.t = 0;
        } else k.t = t.thinkTime.value * 0.5; // nothing to steal: look again soon
      }
      break;
    case 'seek': {
      const s = snacks.find((x) => x.id === k.target);
      if (!s) {
        k.target = null;
        k.mode = 'perch'; // someone else got it
        k.t = 0;
        break;
      }
      const d = flyTo(s.x, Math.max(s.y + 0.4, Math.min(5, k.y)), s.z, t.speed.value);
      if (Math.hypot(s.x - k.x, s.z - k.z) < 0.9 && Math.abs(s.y - k.y) < 1.4) {
        k.carrying = s.id;
        k.target = null;
        k.mode = 'carry';
        k.t = 0;
        ev.push({ type: 'grab', id: s.id });
      } else if (d < 0.01) k.mode = 'perch';
      break;
    }
    case 'carry':
      flyTo(perch.x, 3, perch.z, t.speed.value);
      if (Math.hypot(perch.x - k.x, perch.z - k.z) < 1.4) {
        ev.push({ type: 'deliver', id: k.carrying! });
        k.score++;
        k.carrying = null;
        k.mode = 'perch';
        k.t = 0;
      }
      break;
    case 'flee':
      flyTo(k.x + Math.sin(k.heading) * 3, 7, k.z + Math.cos(k.heading) * 3, t.speed.value);
      if (k.t >= 2) {
        k.mode = 'perch';
        k.t = 0;
      }
      break;
  }
  return ev;
}

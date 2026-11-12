export interface GrabCandidate {
  id: number;
  x: number;
  y: number;
  z: number;
  mass: number;
}

export interface GrabResult {
  id: number;
  tooHeavy: boolean;
}

/**
 * Pick what the gull's beak would grab: nearest candidate within `range` of the beak point and inside a cone
 * around the facing direction. Candidates heavier than `carryMax` are reported as `tooHeavy`
 * (only if nothing liftable is in reach).
 */
export function pickGrabTarget(
  beak: { x: number; y: number; z: number },
  heading: number,
  candidates: readonly GrabCandidate[],
  range: number,
  coneDeg: number,
  carryMax: number,
): GrabResult | null {
  const fx = -Math.sin(heading);
  const fz = -Math.cos(heading);
  const minCos = Math.cos((coneDeg * Math.PI) / 360); // coneDeg is the full cone angle
  let best: GrabResult | null = null;
  let bestD = Infinity;
  let heavy: GrabResult | null = null;
  let heavyD = Infinity;
  for (const c of candidates) {
    const dx = c.x - beak.x, dy = c.y - beak.y, dz = c.z - beak.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > range) continue;
    const hd = Math.hypot(dx, dz);
    if (hd > 0.3 && (dx * fx + dz * fz) / hd < minCos) continue; // behind/beside the beak
    if (c.mass > carryMax) {
      if (d < heavyD) {
        heavyD = d;
        heavy = { id: c.id, tooHeavy: true };
      }
    } else if (d < bestD) {
      bestD = d;
      best = { id: c.id, tooHeavy: false };
    }
  }
  return best ?? heavy;
}

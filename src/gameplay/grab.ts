export interface GrabCandidate {
  id: number;
  x: number;
  y: number;
  z: number;
  mass: number;
  /** Bounding radius: the beak only needs to reach the edge. */
  r?: number;
}

export interface GrabResult {
  id: number;
  tooHeavy: boolean;
}

/**
 * Pick what the gull's beak would grab. A candidate is in reach if the beak (or the body) is within `range` of the
 * edge of the prop. Things within `closeRange` are grabbed whichever way the gull faces; farther ones must be inside
 * a cone around the facing direction. Candidates heavier than `carryMax` are reported as `tooHeavy`
 * (only if nothing liftable is in reach).
 */
export function pickGrabTarget(
  beak: { x: number; y: number; z: number },
  heading: number,
  candidates: readonly GrabCandidate[],
  range: number,
  coneDeg: number,
  carryMax: number,
  closeRange = 0,
  body?: { x: number; y: number; z: number },
): GrabResult | null {
  const fx = -Math.sin(heading);
  const fz = -Math.cos(heading);
  const minCos = Math.cos((coneDeg * Math.PI) / 360); // coneDeg is the full cone angle
  let best: GrabResult | null = null;
  let bestD = Infinity;
  let heavy: GrabResult | null = null;
  let heavyD = Infinity;
  for (const c of candidates) {
    const r = c.r ?? 0;
    const dBeak = Math.max(0, Math.hypot(c.x - beak.x, c.y - beak.y, c.z - beak.z) - r);
    const dBody = body ? Math.max(0, Math.hypot(c.x - body.x, c.y - body.y, c.z - body.z) - r - 0.5) : Infinity;
    const d = Math.min(dBeak, dBody);
    if (d > range) continue;
    if (d > closeRange) {
      const dx = c.x - beak.x, dz = c.z - beak.z;
      const hd = Math.hypot(dx, dz);
      if (hd > 0.3 && (dx * fx + dz * fz) / hd < minCos) continue; // behind/beside the beak
    }
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

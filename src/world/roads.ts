import { area, offsetRing } from './roofs';

/** What to draw on top of the street areas to make them read as roads: dark asphalt with a pavement and kerb at the edges, and a dashed centre line. */
export interface RoadPlan {
  /** Rings of asphalt (outer ring first, then any holes). */
  asphalt: number[][][];
  /** Kerb bands: a thin light ring just outside each asphalt edge (outer ring, then the asphalt ring as its hole). */
  kerb: number[][][];
  /** Dashes of the centre line, each a 4-corner ring. */
  dashes: number[][];
}

/** Short side of a street area, estimated as if it were a rectangle (area and perimeter are enough). */
export function streetWidth(ring: number[]): number {
  const n = ring.length / 2;
  let per = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    per += Math.hypot(ring[j * 2] - ring[i * 2], ring[j * 2 + 1] - ring[i * 2 + 1]);
  }
  const q = per / 4;
  const disc = q * q - Math.abs(area(ring));
  return disc > 0 ? q - Math.sqrt(disc) : q;
}

const KERB = 0.32;

/** Asphalt inset from the street edge; tries smaller pavements when a corner will not offset cleanly. Null: leave the street as it is. */
function insetStreet(rings: number[][], width: number): number[][] | null {
  const d0 = width >= 6 ? Math.min(2.6, Math.max(1.1, width * 0.2)) : 0.8;
  for (const d of [d0, d0 * 0.7, 1.0, 0.7]) {
    const outer = offsetRing(rings[0], d);
    if (!outer) continue;
    const out: number[][] = [outer];
    let ok = true;
    for (let k = 1; k < rings.length; k++) {
      const hole = offsetRing(rings[k], -d);
      if (!hole) {
        ok = false;
        break;
      }
      out.push(hole);
    }
    if (ok) return out;
  }
  return null;
}

/** Squares (tori) and quays (laituri) are paved plazas, not roads: they keep the cobbles. */
export const isPlaza = (name: string | undefined): boolean => !!name && /tori$|laituri/i.test(name.trim());

export function planRoads(streets: readonly { name?: string; rings: number[][] }[]): RoadPlan {
  const plan: RoadPlan = { asphalt: [], kerb: [], dashes: [] };
  for (const s of streets) {
    if (isPlaza(s.name)) continue;
    const w = streetWidth(s.rings[0]);
    if (w < 3 || w > 34) continue; // slivers, and areas too wide to be a street, stay paved
    const asphalt = insetStreet(s.rings, w);
    if (!asphalt) continue;
    plan.asphalt.push(asphalt);
    const band = offsetRing(asphalt[0], -KERB);
    if (band) plan.kerb.push([band, asphalt[0]]);
    // a straight road (a four-cornered strip) gets a dashed centre line along its long axis
    const r = s.rings[0];
    if (s.rings.length === 1 && r.length === 8) {
      const e0 = [r[2] - r[0], r[3] - r[1]], e1 = [r[4] - r[2], r[5] - r[3]];
      const l0 = Math.hypot(e0[0], e0[1]), l1 = Math.hypot(e1[0], e1[1]);
      const [ux, uz, L, W] = l0 >= l1 ? [e0[0] / l0, e0[1] / l0, l0, l1] : [e1[0] / l1, e1[1] / l1, l1, l0];
      if (W >= 9 && L >= 24) {
        const cx = (r[0] + r[2] + r[4] + r[6]) / 4, cz = (r[1] + r[3] + r[5] + r[7]) / 4;
        const nx = -uz * 0.1, nz = ux * 0.1;
        for (let t = -L / 2 + 5; t + 3 <= L / 2 - 5; t += 6.5) {
          const ax = cx + ux * t, az = cz + uz * t, bx = cx + ux * (t + 3), bz = cz + uz * (t + 3);
          plan.dashes.push([ax - nx, az - nz, bx - nx, bz - nz, bx + nx, bz + nz, ax + nx, az + nz]);
        }
      }
    }
  }
  return plan;
}

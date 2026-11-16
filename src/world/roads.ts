import { pointInRings } from './collision';
import { area, offsetRing } from './roofs';

/** What to draw on top of the street areas to make them read as roads: dark asphalt with a pavement and kerb at the edges, and a dashed centre line. */
export interface RoadPlan {
  /** Rings of asphalt (outer ring first, then any holes). */
  asphalt: number[][][];
  /** Kerb bands: a thin light ring just outside each asphalt edge (outer ring, then the asphalt ring as its hole). */
  kerb: number[][][];
  /** Dashes of the centre line, each a 4-corner ring. */
  dashes: number[][];
  /** Zebra crossing bars, each a 4-corner ring. */
  zebra: number[][];
  /** Manhole covers, each a small ring. */
  manholes: number[][];
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
  const plan: RoadPlan = { asphalt: [], kerb: [], dashes: [], zebra: [], manholes: [] };
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
        // zebra crossings a few metres in from each end of a long straight street: bars along the street, side by side across it
        if (L >= 44) {
          const nxu = -uz, nzu = ux;
          const half = Math.max(1, W / 2 - 3.6);
          for (const end of [-1, 1]) {
            const t0 = end * (L / 2 - 8);
            for (let o = -half; o <= half + 0.01; o += 1.0) {
              const px = cx + ux * t0 + nxu * o, pz = cz + uz * t0 + nzu * o;
              const hx = ux * 1.7, hz = uz * 1.7, wx = nxu * 0.27, wz = nzu * 0.27;
              plan.zebra.push([px - hx - wx, pz - hz - wz, px + hx - wx, pz + hz - wz, px + hx + wx, pz + hz + wz, px - hx + wx, pz - hz + wz]);
            }
          }
        }
        const nx = -uz * 0.1, nz = ux * 0.1;
        for (let t = -L / 2 + 5; t + 3 <= L / 2 - 5; t += 6.5) {
          const ax = cx + ux * t, az = cz + uz * t, bx = cx + ux * (t + 3), bz = cz + uz * (t + 3);
          plan.dashes.push([ax - nx, az - nz, bx - nx, bz - nz, bx + nx, bz + nz, ax + nx, az + nz]);
        }
      }
    }
    // manhole covers: a few on the asphalt, off the centre line
    const a0 = Math.abs(area(asphalt[0]));
    let seed = (Math.round(asphalt[0][0] * 7) * 73856093) ^ (Math.round(asphalt[0][1] * 7) * 19349663);
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0) / 2 ** 32;
    const xs = asphalt[0].filter((_, i) => i % 2 === 0), zs = asphalt[0].filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const want = Math.min(4, Math.floor(a0 / 1800) + 1);
    for (let k = 0, tries = 0; k < want && tries < 30; tries++) {
      const x = minX + rnd() * (maxX - minX), z = minZ + rnd() * (maxZ - minZ);
      if (!pointInRings(asphalt, x, z)) continue;
      // keep clear of the kerb (a metre) by testing the four sides
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => pointInRings(asphalt, x + dx * 1.2, z + dz * 1.2))) continue;
      plan.manholes.push(Array.from({ length: 8 }, (_, j) => [x + Math.cos((j / 8) * Math.PI * 2) * 0.48, z + Math.sin((j / 8) * Math.PI * 2) * 0.48]).flat());
      k++;
    }
  }
  return plan;
}

/** The Senate Square tram line (Aleksanterinkatu): the track the tram runs on, visible even when no tram level is playing. */
export const TRAM_LINE = { z: -276, x0: -215, x1: -100 };

export interface TrackPlan {
  /** The dark bed the rails sit in. */
  bed: number[];
  rails: number[][];
  sleepers: number[][];
}

/** Two steel rails on a paved bed with sleepers, for a straight east-west line. */
export function planTrack(line: { z: number; x0: number; x1: number }): TrackPlan {
  const { z, x0, x1 } = line;
  const bw = 1.9;
  const quad = (xa: number, xb: number, za: number, zb: number) => [xa, za, xb, za, xb, zb, xa, zb];
  const sleepers: number[][] = [];
  for (let x = x0 + 1; x < x1 - 0.5; x += 1.1) sleepers.push(quad(x - 0.13, x + 0.13, z - 1.25, z + 1.25));
  return { bed: quad(x0, x1, z - bw, z + bw), rails: [-0.72, 0.72].map((o) => quad(x0, x1, z + o - 0.07, z + o + 0.07)), sleepers };
}

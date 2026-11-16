import { pointInRings } from './collision';

/** Signed area of a flat [x,z,x,z,...] ring. */
export const area = (r: number[]): number => {
  let a = 0;
  const n = r.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += r[i * 2] * r[j * 2 + 1] - r[j * 2] * r[i * 2 + 1];
  }
  return a / 2;
};

/**
 * Move every edge of a ring `dist` metres towards its own interior (negative: outwards), keeping the corners mitred.
 * Returns null when the result would be a bad shape: a sharp corner, a tiny edge, or the area going the wrong way.
 */
export function offsetRing(ring: number[], dist: number): number[] | null {
  const n = ring.length / 2;
  if (n < 3) return null;
  const A = area(ring);
  if (Math.abs(A) < 1e-6) return null;
  const s = A > 0 ? 1 : -1; // which side is "inside" (left of the edge for a positive area)
  const normals: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = ring[j * 2] - ring[i * 2], dz = ring[j * 2 + 1] - ring[i * 2 + 1];
    const l = Math.hypot(dx, dz);
    if (l < 1e-6) return null;
    normals.push([(-dz / l) * s, (dx / l) * s]);
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const [ax, az] = normals[(i + n - 1) % n];
    const [bx, bz] = normals[i];
    const k = 1 + ax * bx + az * bz;
    if (k < 0.35) return null; // a very sharp or reflex-doubled corner: do not try
    out.push(ring[i * 2] + ((ax + bx) / k) * dist, ring[i * 2 + 1] + ((az + bz) / k) * dist);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ex = out[j * 2] - out[i * 2], ez = out[j * 2 + 1] - out[i * 2 + 1];
    if (Math.hypot(ex, ez) < 0.4) return null;
    // every edge must still run the same way as before (a collapsed ring turns inside out)
    if (ex * (ring[j * 2] - ring[i * 2]) + ez * (ring[j * 2 + 1] - ring[i * 2 + 1]) <= 0) return null;
  }
  const B = area(out);
  if (B * A <= 0) return null; // flipped
  if (dist > 0 && Math.abs(B) >= Math.abs(A)) return null;
  if (dist < 0 && Math.abs(B) <= Math.abs(A)) return null;
  return out;
}

export interface Mansard {
  /** How far the roof rises above the wall top. */
  rise: number;
  /** The flat top: the shrunk outer ring first, then the grown courtyard holes. */
  top: number[][];
  /** Outer edge and top edge of each skirt (same vertex count): [wall-top ring, top ring]. */
  pairs: [number[], number[]][];
}

/**
 * A low mansard roof for a block of any footprint: a sloped skirt `skirt` metres wide all the way round (courtyards included),
 * a flat top `rise` metres higher. Null (keep the flat roof) when the footprint is small, too complex, or any ring will not offset
 * cleanly. Pure: the drawing and the landing slab are made by the caller.
 */
export function planMansard(rings: number[][], skirt = 2.2, rise = 1.3): Mansard | null {
  const outer = rings[0];
  const a = Math.abs(area(outer));
  if (a < 110 || outer.length / 2 > 40) return null;
  const d = Math.min(skirt, 0.2 * Math.sqrt(a));
  const top0 = offsetRing(outer, d);
  if (!top0) return null;
  const top: number[][] = [top0];
  const pairs: [number[], number[]][] = [[outer, top0]];
  for (let k = 1; k < rings.length; k++) {
    const hole = offsetRing(rings[k], -d);
    if (!hole) return null;
    // the grown hole must stay inside the shrunk outer ring
    for (let i = 0; i < hole.length; i += 2) if (!pointInRings([top0], hole[i], hole[i + 1])) return null;
    top.push(hole);
    pairs.push([rings[k], hole]);
  }
  // the shrunk outer ring must stay inside the original
  for (let i = 0; i < top0.length; i += 2) if (!pointInRings([outer], top0[i], top0[i + 1])) return null;
  return { rise, top, pairs };
}

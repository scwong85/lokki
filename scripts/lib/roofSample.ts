/**
 * Sample a roof's colour from an orthophoto (M110). Pure: the picture is reached through a `PixelSource` (local metres in, an RGB triple or
 * null out), so the sampling can be tested with a synthetic image and the build script supplies the real photo.
 * A footprint is sampled on a grid, keeping only points that are inside it (courtyards excluded) and at least `inset` metres from every edge:
 * the aerial photo is not a true orthophoto, so near the edge the picture shows walls and the neighbour's shadow, not the roof.
 */
import { pointInRings } from './geo.ts';

export type RGB = [number, number, number];
export type PixelSource = (x: number, z: number) => RGB | null;

/** Distance from a point to a segment. */
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Distance from a point to the nearest edge of any ring. */
export function edgeDistance(rings: number[][], x: number, z: number): number {
  let best = Infinity;
  for (const r of rings) {
    const n = r.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) best = Math.min(best, segDist(x, z, r[j * 2], r[j * 2 + 1], r[i * 2], r[i * 2 + 1]));
  }
  return best;
}

/** The pixels of a footprint's interior (flat [x,z,...] rings, local metres). Falls back to a thinner inset for small buildings. */
export function roofPixels(rings: number[][], at: PixelSource, step = 0.7, insets: readonly number[] = [1.5, 0.8, 0.3]): RGB[] {
  const outer = rings[0];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < outer.length; i += 2) {
    minX = Math.min(minX, outer[i]);
    maxX = Math.max(maxX, outer[i]);
    minZ = Math.min(minZ, outer[i + 1]);
    maxZ = Math.max(maxZ, outer[i + 1]);
  }
  for (const inset of insets) {
    const out: RGB[] = [];
    for (let x = minX + step / 2; x < maxX; x += step) {
      for (let z = minZ + step / 2; z < maxZ; z += step) {
        if (!pointInRings(rings, x, z) || edgeDistance(rings, x, z) < inset) continue;
        const c = at(x, z);
        if (c) out.push(c);
      }
    }
    if (out.length >= 12) return out;
  }
  return [];
}

/** The per-channel median: robust against vents, solar panels and chimney shadows. */
export function medianColour(px: readonly RGB[]): RGB | null {
  if (!px.length) return null;
  const med = (k: 0 | 1 | 2): number => {
    const v = px.map((p) => p[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  return [med(0), med(1), med(2)];
}

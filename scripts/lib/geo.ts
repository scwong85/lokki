/** Pure geometry helpers for the map data pipeline (no I/O, fully unit-tested). */
export type Pt = [number, number];
export type Ring = Pt[];
export interface Bounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/** EPSG:3879 (ETRS-GK25, used by the City of Helsinki open data). */
export const EPSG_3879 = '+proj=tmerc +lat_0=0 +lon_0=25 +k=1 +x_0=25500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

export interface Origin {
  E: number;
  N: number;
}

/** Projected (E,N) metres -> game-local metres. 1 unit = 1 m, north = -Z, east = +X. */
export function toLocal(E: number, N: number, o: Origin): Pt {
  return [round(E - o.E, 2), round(-(N - o.N), 2)];
}

export const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Signed area (positive = counter-clockwise in x/z with x right, z up; sign convention only matters for consistency). */
export function signedArea(r: Ring): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[(i + 1) % r.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

/** Drop the closing duplicate point of a GeoJSON ring. */
export function openRing(r: Ring): Ring {
  const n = r.length;
  return n > 1 && r[0][0] === r[n - 1][0] && r[0][1] === r[n - 1][1] ? r.slice(0, n - 1) : r.slice();
}

/** Douglas–Peucker simplification of a closed ring, keeping at least 3 points. */
export function simplifyRing(ring: Ring, tol: number): Ring {
  if (ring.length <= 4) return ring;
  // split the ring at its two farthest-apart-ish points (first and the farthest from it) so DP works on two open chains
  let far = 0;
  let fd = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2;
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  const a = dp(ring.slice(0, far + 1), tol);
  const b = dp([...ring.slice(far), ring[0]], tol);
  const out = [...a.slice(0, -1), ...b.slice(0, -1)];
  return out.length >= 3 ? out : ring;
}

function dp(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const [ax, az] = pts[0];
  const [bx, bz] = pts[pts.length - 1];
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1e-9;
  let idx = -1;
  let md = tol;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / len;
    if (d > md) {
      md = d;
      idx = i;
    }
  }
  if (idx < 0) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}

/** Sutherland–Hodgman clip of a ring against an axis-aligned rectangle. */
export function clipRing(ring: Ring, b: Bounds): Ring {
  const edges: [(p: Pt) => boolean, (p: Pt, q: Pt) => Pt][] = [
    [(p) => p[0] >= b.minX, (p, q) => at(p, q, (b.minX - p[0]) / (q[0] - p[0]), 'x', b.minX)],
    [(p) => p[0] <= b.maxX, (p, q) => at(p, q, (b.maxX - p[0]) / (q[0] - p[0]), 'x', b.maxX)],
    [(p) => p[1] >= b.minZ, (p, q) => at(p, q, (b.minZ - p[1]) / (q[1] - p[1]), 'z', b.minZ)],
    [(p) => p[1] <= b.maxZ, (p, q) => at(p, q, (b.maxZ - p[1]) / (q[1] - p[1]), 'z', b.maxZ)],
  ];
  let out = ring;
  for (const [inside, hit] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(hit(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(hit(prev, cur));
    }
    if (out.length === 0) return [];
  }
  return out;
}

function at(p: Pt, q: Pt, t: number, axis: 'x' | 'z', v: number): Pt {
  return axis === 'x' ? [v, p[1] + (q[1] - p[1]) * t] : [p[0] + (q[0] - p[0]) * t, v];
}

/** Push ring vertices that lie on the bounds outwards so a clipped area appears to continue past the map edge. */
export function extendBoundary(ring: Ring, b: Bounds, dist: number, eps = 1e-6): Ring {
  return ring.map(([x, z]) => {
    let nx = x;
    let nz = z;
    if (Math.abs(x - b.minX) < eps) nx = b.minX - dist;
    if (Math.abs(x - b.maxX) < eps) nx = b.maxX + dist;
    if (Math.abs(z - b.minZ) < eps) nz = b.minZ - dist;
    if (Math.abs(z - b.maxZ) < eps) nz = b.maxZ + dist;
    return [nx, nz] as Pt;
  });
}

/** Building height in metres from the number of floors (LoD1-style extrusion height). */
export function heightFromFloors(floors: number | null | undefined): number {
  const f = floors && floors > 0 ? floors : 1;
  return round(Math.min(60, Math.max(3, f * 3.2 + 0.8)), 1);
}

/** Small deterministic hash for stable per-building colours. */
export function hashId(id: number | string): number {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function ringCentroid(r: Ring): Pt {
  let x = 0;
  let z = 0;
  for (const p of r) {
    x += p[0];
    z += p[1];
  }
  return [x / r.length, z / r.length];
}

/** Even-odd point-in-polygon over flat [x,z,...] rings (outer + holes). */
export function pointInRings(rings: number[][], x: number, z: number): boolean {
  let inside = false;
  for (const r of rings) {
    const n = r.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = r[i * 2], zi = r[i * 2 + 1], xj = r[j * 2], zj = r[j * 2 + 1];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
  }
  return inside;
}

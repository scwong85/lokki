/**
 * Pure building-detail rules: facade colours, window bays and floors, rectangle detection and pitched roofs
 * (render triangles + stepped collision slabs). No three.js here so it is unit-testable.
 */

export type V3 = [number, number, number];

/** Seeded Helsinki-ish pastel facades and roof colours. */
export const FACADES = [0xffe9c2, 0xffcfb0, 0xbfe8d4, 0xd9c9f0, 0xf6d98f, 0xf7c6c7, 0xc6dcf2, 0xfff6e6];
export const PITCHED_ROOFS = [0xd98c6f, 0x8fc4ad, 0x9aa1b3, 0xb9705c, 0xd98c6f];
/** Flat (tin / felt) roofs: Helsinki paints them, so they stay colourful from the air. */
export const FLAT_ROOFS = [0xe39a7e, 0xc7b5e0, 0xe8b39a, 0xa9cdbb, 0xdcd6cc, 0xb7c3d6, 0xd98c6f];

export function hash(n: number, k = 0): number {
  let x = (Math.imul(n | 0, 2654435761) + Math.imul(k + 1, 40503)) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  return (x ^ (x >>> 13)) >>> 0;
}

export const FLOOR_H = 3.2;
export const GROUND_H = 3.6;
export const BAY_W = 5.2;

/** Whole window bays on a wall of this length (0 = too short for windows). `bayW` varies per building. */
export function bays(len: number, bayW = BAY_W): number {
  return len < 2.2 ? 0 : Math.max(1, Math.round(len / bayW));
}

/** Window styles in the facade atlas (row order in `windowAtlas`): classic, tall arched, wide ribbon, small pair, shuttered, banded. */
export const WINDOW_STYLES = 6;

export interface WindowPlan {
  /** Bay width in metres: some buildings have close, narrow windows, others wide spacing. */
  bayW: number;
  /** Style (0..WINDOW_STYLES-1) for each upper floor, bottom to top. */
  floors: number[];
  /** Which wall (ring edge) indices are left blank. */
  blank: (i: number) => boolean;
}

/**
 * How one building's windows look: its own bay width and a main style, with some floors in an accent style (often the
 * top one, as on old Helsinki blocks) and a few blank walls (never the longest one). Seeded by building id. Pure.
 */
export function windowPlan(id: number, floors: number, longestWall: number): WindowPlan {
  const bayW = 3.4 + (hash(id, 21) % 8) * 0.55; // 3.4 .. 7.25 m
  const main = hash(id, 22) % 5; // 0..4: the plain "banded" style (5) is only used as an accent
  const accent = (main + 1 + (hash(id, 23) % 4)) % WINDOW_STYLES;
  const topAccent = hash(id, 24) % 100 < 38;
  const midAccent = hash(id, 25) % 100 < 18;
  const list: number[] = [];
  for (let f = 0; f < floors; f++) {
    const top = f === floors - 1 && floors > 1;
    const mid = f === 1 && floors > 3;
    list.push((top && topAccent) || (mid && midAccent) ? accent : main);
  }
  return { bayW, floors: list, blank: (i) => i !== longestWall && hash(id, 40 + i) % 100 < 22 };
}

/** Split a wall of height h into the ground floor (shopfronts) and the upper floors (windows). */
export function storeys(h: number): { ground: number; upperFloors: number } {
  if (h < GROUND_H + 1.2) return { ground: h, upperFloors: 0 };
  return { ground: GROUND_H, upperFloors: Math.max(1, Math.round((h - GROUND_H) / FLOOR_H)) };
}

export interface RectInfo {
  /** Corners in ring order, so that edge 0-1 is a long side. */
  c: [number, number][];
  long: number;
  short: number;
}

/** Is this ring (flat x,z pairs) a near-rectangle? Returns its corners with a long side first. */
export function rectInfo(ring: number[], tolDeg = 12): RectInfo | null {
  const pts: [number, number][] = [];
  for (let i = 0; i < ring.length; i += 2) pts.push([ring[i], ring[i + 1]]);
  if (pts.length > 4 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  if (pts.length !== 4) return null;
  const cos = Math.cos(((90 - tolDeg) * Math.PI) / 180);
  for (let i = 0; i < 4; i++) {
    const a = pts[(i + 3) % 4], b = pts[i], c = pts[(i + 1) % 4];
    const ux = a[0] - b[0], uz = a[1] - b[1], vx = c[0] - b[0], vz = c[1] - b[1];
    const d = (ux * vx + uz * vz) / (Math.hypot(ux, uz) * Math.hypot(vx, vz));
    if (Math.abs(d) > cos) return null;
  }
  const l01 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
  const l12 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  const c = l01 >= l12 ? pts : [pts[1], pts[2], pts[3], pts[0]];
  return { c, long: Math.max(l01, l12), short: Math.min(l01, l12) };
}

export interface Roof {
  /** Sloped faces (roof colour). */
  slopes: [V3, V3, V3][];
  /** Gable-end triangles (wall colour). */
  gables: [V3, V3, V3][];
  /** Stepped collision slabs approximating the roof volume; the top one is a perch (the ridge). */
  slabs: { ring: number[]; y0: number; y1: number; perch: boolean }[];
  ridge: [V3, V3];
}

/** Should this building get a pitched roof? (simple, not too big; seeded so the city mixes both kinds). */
export function wantsPitched(r: RectInfo | null, id: number, h: number): boolean {
  if (!r) return false;
  if (r.short > 22 || r.long * r.short > 1100 || h > 30) return false;
  return hash(id, 7) % 10 < 7;
}

/**
 * Gable roof (ridge along the long side) or hip roof (for squarish footprints).
 * Faces wind so their normals point outwards whatever the ring direction.
 */
export function pitchedRoof(r: RectInfo, base: number, rise: number, hip: boolean): Roof {
  const [a, b, c, d] = r.c;
  const mid = (p: [number, number], q: [number, number]): [number, number] => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  // ridge runs between the middles of the short sides b-c and d-a
  let r1 = mid(d, a), r2 = mid(b, c);
  if (hip) {
    const inset = Math.min(r.short / 2, r.long / 2 - 0.01);
    const ux = (r2[0] - r1[0]) / r.long, uz = (r2[1] - r1[1]) / r.long;
    r1 = [r1[0] + ux * inset, r1[1] + uz * inset];
    r2 = [r2[0] - ux * inset, r2[1] - uz * inset];
  }
  const top = base + rise;
  const A: V3 = [a[0], base, a[1]], B: V3 = [b[0], base, b[1]], C: V3 = [c[0], base, c[1]], D: V3 = [d[0], base, d[1]];
  const R1: V3 = [r1[0], top, r1[1]], R2: V3 = [r2[0], top, r2[1]];
  const cx = (a[0] + b[0] + c[0] + d[0]) / 4, cz = (a[1] + b[1] + c[1] + d[1]) / 4;
  const out = (t: [V3, V3, V3]): [V3, V3, V3] => {
    // flip so the face normal points away from the building centre (or up)
    const [p, q, s] = t;
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = s[0] - p[0], vy = s[1] - p[1], vz = s[2] - p[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (p[0] + q[0] + s[0]) / 3 - cx, my = (p[1] + q[1] + s[1]) / 3 - (base - 1), mz = (p[2] + q[2] + s[2]) / 3 - cz;
    return nx * mx + ny * my + nz * mz >= 0 ? t : [p, s, q];
  };
  const slopes: [V3, V3, V3][] = [out([A, B, R2]), out([A, R2, R1]), out([C, D, R1]), out([C, R1, R2])];
  const ends: [V3, V3, V3][] = [out([B, C, R2]), out([D, A, R1])];
  // collision: three slabs narrowing toward the ridge
  const slabs: Roof['slabs'] = [];
  for (let i = 0; i < 3; i++) {
    const k = 1 - i / 3; // width fraction across the short side
    const y0 = base + (rise * i) / 3, y1 = base + (rise * (i + 1)) / 3;
    const shrink = (p: [number, number], ridgeP: [number, number]): [number, number] => [ridgeP[0] + (p[0] - ridgeP[0]) * k, ridgeP[1] + (p[1] - ridgeP[1]) * k];
    const m1 = mid(d, a), m2 = mid(b, c);
    const pa = shrink(a, m1), pb = shrink(b, m2), pc = shrink(c, m2), pd = shrink(d, m1);
    slabs.push({ ring: [pa[0], pa[1], pb[0], pb[1], pc[0], pc[1], pd[0], pd[1]], y0, y1, perch: i === 2 });
  }
  return hip ? { slopes: [...slopes, ...ends], gables: [], slabs, ridge: [R1, R2] } : { slopes, gables: ends, slabs, ridge: [R1, R2] };
}

/** Roof rise for a footprint's short side. */
export const roofRise = (short: number): number => Math.min(5, Math.max(1.6, short * 0.38));

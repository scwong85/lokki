import type { Prism } from './collision';
import type { Target } from '../gameplay/targets';

/** A prism with its wall/roof colours, so landmarks render through the same path as buildings. */
export interface PrismDef extends Prism {
  wall: number;
  roof: number;
}

export interface LandmarkSrc {
  id: string;
  type: string;
  x: number;
  z: number;
  rotationDeg?: number;
  height?: number;
  cols?: number;
  rows?: number;
  dx?: number;
  dz?: number;
  line?: number[];
  count?: number;
}

export interface LandmarkOut {
  prisms: PrismDef[];
  targets: Target[];
}

/** Regular polygon ring (flat x,z). */
export function ngon(cx: number, cz: number, r: number, n = 8, rot = Math.PI / n): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    out.push(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
  }
  return out;
}

/** Rotate local offset (dx,dz) by angle a around the origin. */
const rot = (dx: number, dz: number, a: number): [number, number] => [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)];

/** Rectangle w (x) by d (z) centred at (cx,cz), rotated by a. */
export function rect(cx: number, cz: number, w: number, d: number, a = 0): number[] {
  const out: number[] = [];
  for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as [number, number][]) {
    const [rx, rz] = rot(px, pz, a);
    out.push(cx + rx, cz + rz);
  }
  return out;
}

const prism = (ring: number[], y0: number, y1: number, wall: number, roof: number, kind: PrismDef['kind'] = 'prop'): PrismDef => ({
  rings: [ring], y0, y1, kind, wall, roof,
});
const target = (x: number, y: number, z: number): Target => ({ x, y, z, radius: 0.6, cooldown: 0 });

const WHITE = 0xfdfaf2;
const GREEN = 0xa8d8c0;
const GOLD = 0xf3d37a;
const ORANGE = 0xffa95c;

function cathedral(l: LandmarkSrc): LandmarkOut {
  const H = l.height ?? 22;
  const { x, z } = l;
  const prisms = [
    prism(ngon(x, z, 9), H, H + 5, WHITE, WHITE),
    prism(ngon(x, z, 7.2), H + 5, H + 8.5, GREEN, GREEN),
    prism(ngon(x, z, 5.4), H + 8.5, H + 12, GREEN, GREEN),
    prism(ngon(x, z, 2.6), H + 12, H + 15.5, GREEN, GREEN),
    prism(ngon(x, z, 1.1), H + 15.5, H + 19, GOLD, GOLD, 'perch'),
  ];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) prisms.push(prism(ngon(x + sx * 14, z + sz * 14, 3.6), H, H + 6, GREEN, GREEN, 'perch'));
  return { prisms, targets: [target(x, H + 19.8, z)] };
}

function statue(l: LandmarkSrc): LandmarkOut {
  const { x, z } = l;
  return {
    prisms: [
      prism(ngon(x, z, 4.5, 12), 0, 0.5, 0xe8e2d6, 0x9fd8ea),
      prism(ngon(x, z, 1.3), 0.5, 3, 0xe8e2d6, 0xe8e2d6),
      prism(ngon(x, z, 0.55), 3, 5.2, 0x8fbfa8, 0x8fbfa8, 'perch'),
    ],
    targets: [],
  };
}

function tents(l: LandmarkSrc): LandmarkOut {
  const cols = l.cols ?? 12, rows = l.rows ?? 3, dx = l.dx ?? 8, dz = l.dz ?? 14;
  const a = ((l.rotationDeg ?? 0) * Math.PI) / 180;
  const prisms: PrismDef[] = [];
  const targets: Target[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [ox, oz] = rot((c - (cols - 1) / 2) * dx, (r - (rows - 1) / 2) * dz, a);
      const cx = l.x + ox, cz = l.z + oz;
      prisms.push(prism(rect(cx, cz, 2.6, 1.4, a), 0, 1.0, 0xfff1d6, 0xffd1b3));
      prisms.push(prism(rect(cx, cz, 3.8, 3.8, a), 2.3, 2.7, ORANGE, 0xff8a3d));
    }
    if (r < rows - 1) {
      for (let c = 2; c < cols; c += 4) {
        const [ox, oz] = rot((c - (cols - 1) / 2) * dx, (r - (rows - 1) / 2) * dz + dz / 2, a);
        targets.push(target(l.x + ox, 0.9, l.z + oz));
      }
    }
  }
  return { prisms, targets };
}

function ferry(l: LandmarkSrc): LandmarkOut {
  const a = ((l.rotationDeg ?? 0) * Math.PI) / 180;
  const p = (px: number, pz: number): [number, number] => {
    const [rx, rz] = rot(px, pz, a);
    return [l.x + rx, l.z + rz];
  };
  const hull: number[] = [];
  for (const [px, pz] of [[-19, -4.5], [13, -4.5], [19, 0], [13, 4.5], [-19, 4.5]]) hull.push(...p(px, pz));
  const [cx, cz] = p(-2, 0);
  const [ux, uz] = p(-5, 0);
  const [fx, fz] = p(-8, 0);
  const [tx, tz] = p(-1, 0);
  return {
    prisms: [
      prism(hull, 0, 3.2, 0x9ab4d6, 0xf5f0e8),
      prism(rect(cx, cz, 24, 6.6, a), 3.2, 6.6, 0xfaf7f0, 0xe6c9d8),
      prism(rect(ux, uz, 14, 5.2, a), 6.6, 9, 0xcdeee0, 0xe39a7e),
      prism(ngon(fx, fz, 1.3), 9, 12.5, 0xe39a7e, 0xc9715a, 'perch'),
    ],
    targets: [target(tx, 9.8, tz)],
  };
}

function lamps(l: LandmarkSrc): LandmarkOut {
  const [x1, z1, x2, z2] = l.line ?? [0, 0, 0, 0];
  const n = l.count ?? 4;
  const prisms: PrismDef[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    prisms.push(prism(ngon(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, 0.18, 4), 0, 4.5, 0x8a8fa0, 0xf3d37a, 'perch'));
  }
  return { prisms, targets: [] };
}

const BUILDERS: Record<string, (l: LandmarkSrc) => LandmarkOut> = { cathedral, statue, tents, ferry, lamps };

export function buildLandmarks(list: readonly LandmarkSrc[]): LandmarkOut {
  const out: LandmarkOut = { prisms: [], targets: [] };
  for (const l of list) {
    const b = BUILDERS[l.type];
    if (!b) {
      console.warn(`unknown landmark type: ${l.type}`);
      continue;
    }
    const r = b(l);
    out.prisms.push(...r.prisms);
    out.targets.push(...r.targets);
  }
  return out;
}

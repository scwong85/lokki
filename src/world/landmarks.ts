import type { Prism } from './collision';
import type { Target } from '../gameplay/targets';
import type { PropSpawn } from '../gameplay/props';
import { restY } from '../data/props';

/** A prism with its wall/roof colours, so landmarks render through the same path as buildings. */
export interface PrismDef extends Prism {
  wall: number;
  roof: number;
  /** Collision only: drawn by a separate model (e.g. the striped tent canopies). */
  hidden?: boolean;
}

/** Instanced decorations a landmark asks for (drawn in city.ts). */
export interface Decor {
  kind: 'tent';
  x: number;
  z: number;
  a: number;
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

export interface Mat {
  rings: number[][];
  color: number;
}

export interface LandmarkOut {
  prisms: PrismDef[];
  targets: Target[];
  props?: PropSpawn[];
  mats?: Mat[];
  decor?: Decor[];
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
      // a wide plinth (a perch you can actually land on) with the figure on top
      prism(ngon(x, z, 1.9, 10), 0.5, 3, 0xe8e2d6, 0xe8e2d6, 'perch'),
      prism(ngon(x, z, 0.9), 3, 5.2, 0x8fbfa8, 0x8fbfa8, 'perch'), // wide enough to land on (M12 playtest)
    ],
    targets: [],
    // the student cap lies on the plinth beside the figure (cap heist)
    props: [{ type: 'cap', x: x + 1.1, y: restY('cap', 3.0), z, tag: 'statueCap' }],
  };
}

/** A clock on a pole where the blind date meets. */
function clock(l: LandmarkSrc): LandmarkOut {
  const { x, z } = l;
  return {
    prisms: [
      prism(ngon(x, z, 0.2, 6), 0, 5.0, 0x8a8fa0, 0x8a8fa0),
      prism(ngon(x, z, 0.75, 14), 5.0, 6.0, 0xfdfaf2, 0xfdfaf2),
      prism(ngon(x, z, 0.4, 6), 6.0, 6.4, GOLD, GOLD, 'perch'),
    ],
    targets: [],
  };
}

/** A lost teddy bear far away from the child who owns it (good-bird quest). */
function toy(l: LandmarkSrc): LandmarkOut {
  return { prisms: [], targets: [], props: [{ type: 'toy', x: l.x, y: restY('toy'), z: l.z }] };
}

function tents(l: LandmarkSrc): LandmarkOut {
  const cols = l.cols ?? 12, rows = l.rows ?? 3, dx = l.dx ?? 8, dz = l.dz ?? 14;
  const a = ((l.rotationDeg ?? 0) * Math.PI) / 180;
  const prisms: PrismDef[] = [];
  const targets: Target[] = [];
  const decor: Decor[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [ox, oz] = rot((c - (cols - 1) / 2) * dx, (r - (rows - 1) / 2) * dz, a);
      const cx = l.x + ox, cz = l.z + oz;
      prisms.push(prism(rect(cx, cz, 2.6, 1.4, a), 0, 1.0, 0xfff1d6, 0xffd1b3));
      prisms.push({ ...prism(rect(cx, cz, 3.8, 3.8, a), 2.3, 2.7, ORANGE, 0xff8a3d), hidden: true });
      prisms.push({ ...prism(rect(cx, cz, 1.6, 1.6, a), 2.7, 3.2, ORANGE, 0xff8a3d, 'perch'), hidden: true });
      decor.push({ kind: 'tent', x: cx, z: cz, a });
    }
    if (r < rows - 1) {
      for (let c = 2; c < cols; c += 4) {
        const [ox, oz] = rot((c - (cols - 1) / 2) * dx, (r - (rows - 1) / 2) * dz + dz / 2, a);
        targets.push(target(l.x + ox, 0.9, l.z + oz));
      }
    }
  }
  // a pastry on a counter of the south row (finale): column 5, last row
  const props: PropSpawn[] = [];
  if (cols > 5 && rows > 2) {
    const [ox, oz] = rot((5 - (cols - 1) / 2) * dx, (rows - 1 - (rows - 1) / 2) * dz, a);
    props.push({ type: 'bun', x: l.x + ox, y: restY('bun', 1.0), z: l.z + oz, tag: 'stallBun' });
  }
  return { prisms, targets, props, decor };
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

/**
 * Things for sale and for stealing, lying on the stall counters (the stalls are laid out as in `tents`):
 * salmiakki on the north row, buns and fish on the middle row, hats and bottles here and there.
 */
function goods(l: LandmarkSrc): LandmarkOut {
  const cols = l.cols ?? 9, rows = l.rows ?? 3, dx = l.dx ?? 8, dz = l.dz ?? 14;
  const a = ((l.rotationDeg ?? 0) * Math.PI) / 180;
  const props: PropSpawn[] = [];
  const put = (type: PropSpawn['type'], c: number, r: number, off = 0) => {
    const [ox, oz] = rot((c - (cols - 1) / 2) * dx, (r - (rows - 1) / 2) * dz, a);
    props.push({ type, x: l.x + ox + off, y: restY(type, 1.0), z: l.z + oz });
  };
  // row 0 = north, 1 = middle, 2 = south (the vendors stand behind the south row)
  put('salmiakki', 2, 0, -0.4); put('salmiakki', 2, 0, 0.4); // the candy stall
  put('salmiakki', 6, 0);
  for (const c of [1, 3, 5, 7]) put('bun', c, 1); // the bakery counters
  for (const c of [0, 4, 8]) put('fish', c, 1);
  put('tophat', 4, 0);
  put('cap', 2, 1);
  put('bottle', 3, 0); put('bottle', 5, 0); put('bottle', 7, 2);
  return { prisms: [], targets: [], props };
}

/** Litter bins dotted around the square. `line` is a flat list of x,z pairs. */
function bins(l: LandmarkSrc): LandmarkOut {
  const pts = l.line ?? [];
  const props: PropSpawn[] = [];
  for (let i = 0; i + 1 < pts.length; i += 2) props.push({ type: 'bin', x: pts[i], y: restY('bin'), z: pts[i + 1] });
  return { prisms: [], targets: [], props };
}

/** A café corner: a tall stack of chairs that wants to fall, and a few crates. */
function cafe(l: LandmarkSrc): LandmarkOut {
  const { x, z } = l;
  const props: PropSpawn[] = [];
  for (let i = 0; i < 4; i++) props.push({ type: 'chair', x: x + (i % 2) * 0.06, y: restY('chair', i * 0.9), z, rotY: i * 0.3 });
  props.push({ type: 'crate', x: x + 2.2, y: restY('crate'), z });
  props.push({ type: 'crate', x: x + 3.0, y: restY('crate'), z });
  props.push({ type: 'crate', x: x + 2.6, y: restY('crate', 0.7), z });
  return { prisms: [], targets: [], props };
}

const BUILDERS: Record<string, (l: LandmarkSrc) => LandmarkOut> = { cathedral, statue, tents, ferry, lamps, clock, toy, goods, bins, cafe };

export function buildLandmarks(list: readonly LandmarkSrc[]): Required<LandmarkOut> {
  const out: Required<LandmarkOut> = { prisms: [], targets: [], props: [], mats: [], decor: [] };
  for (const l of list) {
    if (l.type === 'restyle') continue; // handled by the building pass (city.ts)
    const b = BUILDERS[l.type];
    if (!b) {
      console.warn(`unknown landmark type: ${l.type}`);
      continue;
    }
    const r = b(l);
    out.prisms.push(...r.prisms);
    out.targets.push(...r.targets);
    out.props.push(...(r.props ?? []));
    out.mats.push(...(r.mats ?? []));
    out.decor.push(...(r.decor ?? []));
  }
  return out;
}

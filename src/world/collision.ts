/** Static world collision: axis-aligned boxes, extruded polygon prisms (building footprints) and the ground plane. Pure logic. */
export type Kind = 'building' | 'perch' | 'prop';

export interface Box {
  min: [number, number, number];
  max: [number, number, number];
  /** 'perch' tops count as perches when landed on. */
  kind: Kind;
  color: number;
}

/** Extruded polygon: outer ring + optional holes (flat [x,z,x,z,...] arrays), solid between y0 and y1. */
export interface Prism {
  rings: number[][];
  y0: number;
  y1: number;
  kind: Kind;
  /** AABB in xz, filled by World. */
  bb?: [number, number, number, number];
}

export interface Contact {
  nx: number;
  ny: number;
  nz: number;
  /** null = ground plane; 'bound' = invisible map edge. */
  kind: Kind | 'bound' | null;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ---------- 2D helpers ----------
/** Even-odd point-in-polygon across all rings (holes work naturally). */
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

/** Closest point on any ring edge to (x,z). */
export function closestOnRings(rings: number[][], x: number, z: number): { x: number; z: number; d2: number } {
  let best = { x: 0, z: 0, d2: Infinity };
  for (const r of rings) {
    const n = r.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ax = r[j * 2], az = r[j * 2 + 1], bx = r[i * 2], bz = r[i * 2 + 1];
      const dx = bx - ax, dz = bz - az;
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
      const cx = ax + dx * t, cz = az + dz * t;
      const d2 = (x - cx) ** 2 + (z - cz) ** 2;
      if (d2 < best.d2) best = { x: cx, z: cz, d2 };
    }
  }
  return best;
}

function ringsBB(rings: number[][]): [number, number, number, number] {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  const r = rings[0];
  for (let i = 0; i < r.length; i += 2) {
    a = Math.min(a, r[i]); c = Math.max(c, r[i]);
    b = Math.min(b, r[i + 1]); d = Math.max(d, r[i + 1]);
  }
  return [a, b, c, d];
}

type Item = { box: Box } | { prism: Prism };

export class World {
  readonly boxes: Box[];
  readonly prisms: Prism[];
  /** Moving boxes (a tram roof): mutate min/max each tick; not in the spatial grid, so always tested. */
  readonly movers: Box[] = [];
  /** A level's furniture (a buffet table, a jukebox): set per level, not in the grid, always tested like the movers. */
  readonly furniture: Box[] = [];
  /** Tells ground from water (set by the city): "land here" never picks the sea (M122). */
  isLand: ((x: number, z: number) => boolean) | null = null;
  private grid = new Map<number, Item[]>();
  private readonly cell: number;
  private stamp = 0;
  private seen = new Map<Item, number>();

  /** `half`: optional invisible walls at +-half in x and z. */
  constructor(boxes: Box[] = [], prisms: Prism[] = [], readonly half: number | null = null, cell = 32) {
    this.boxes = boxes;
    this.prisms = prisms;
    this.cell = cell;
    for (const b of boxes) this.insert({ box: b }, b.min[0], b.min[2], b.max[0], b.max[2]);
    for (const p of prisms) {
      p.bb = ringsBB(p.rings);
      this.insert({ prism: p }, p.bb[0], p.bb[1], p.bb[2], p.bb[3]);
    }
  }

  private key(cx: number, cz: number) {
    return (cx + 4096) * 8192 + (cz + 4096);
  }

  private insert(item: Item, x0: number, z0: number, x1: number, z1: number): void {
    const c = this.cell;
    for (let cx = Math.floor(x0 / c); cx <= Math.floor(x1 / c); cx++)
      for (let cz = Math.floor(z0 / c); cz <= Math.floor(z1 / c); cz++) {
        const k = this.key(cx, cz);
        let l = this.grid.get(k);
        if (!l) this.grid.set(k, (l = []));
        l.push(item);
      }
  }

  /** Items whose cells overlap the xz rectangle (each returned once). */
  private query(x0: number, z0: number, x1: number, z1: number): Item[] {
    const c = this.cell;
    const out: Item[] = [];
    const st = ++this.stamp;
    for (let cx = Math.floor(x0 / c); cx <= Math.floor(x1 / c); cx++)
      for (let cz = Math.floor(z0 / c); cz <= Math.floor(z1 / c); cz++) {
        const l = this.grid.get(this.key(cx, cz));
        if (!l) continue;
        for (const it of l) {
          if (this.seen.get(it) === st) continue;
          this.seen.set(it, st);
          out.push(it);
        }
      }
    return out;
  }

  /** Push sphere (centre p, radius r) out of everything. Mutates p; returns contacts. */
  collide(p: Vec3, r: number): Contact[] {
    const contacts: Contact[] = [];
    for (let pass = 0; pass < 3; pass++) {
      let any = false;
      for (const m of this.movers) {
        const c = collideBox(m, p, r);
        if (c) {
          contacts.push(c);
          any = true;
        }
      }
      for (const m of this.furniture) {
        const c = collideBox(m, p, r);
        if (c) {
          contacts.push(c);
          any = true;
        }
      }
      for (const it of this.query(p.x - r, p.z - r, p.x + r, p.z + r)) {
        const c = 'box' in it ? collideBox(it.box, p, r) : collidePrism(it.prism, p, r);
        if (c) {
          contacts.push(c);
          any = true;
        }
      }
      if (this.half !== null) {
        const h = this.half - r;
        if (p.x < -h) { p.x = -h; contacts.push({ nx: 1, ny: 0, nz: 0, kind: 'bound' }); any = true; }
        if (p.x > h) { p.x = h; contacts.push({ nx: -1, ny: 0, nz: 0, kind: 'bound' }); any = true; }
        if (p.z < -h) { p.z = -h; contacts.push({ nx: 0, ny: 0, nz: 1, kind: 'bound' }); any = true; }
        if (p.z > h) { p.z = h; contacts.push({ nx: 0, ny: 0, nz: -1, kind: 'bound' }); any = true; }
      }
      if (p.y - r < 0) {
        p.y = r;
        contacts.push({ nx: 0, ny: 1, nz: 0, kind: null });
        any = true;
      }
      if (!any) break;
    }
    return contacts;
  }

  /** Height of the highest surface at/under (x,z) not above yFrom. Ground = 0. */
  surfaceBelow(x: number, z: number, yFrom: number, margin = 0.3): { y: number; kind: Kind | null } {
    let best = 0;
    let kind: Kind | null = null;
    for (const b of [...this.movers, ...this.furniture]) {
      if (x < b.min[0] - margin || x > b.max[0] + margin || z < b.min[2] - margin || z > b.max[2] + margin) continue;
      if (b.max[1] <= yFrom + 0.01 && b.max[1] > best) {
        best = b.max[1];
        kind = b.kind;
      }
    }
    for (const it of this.query(x - margin, z - margin, x + margin, z + margin)) {
      if ('box' in it) {
        const b = it.box;
        if (x < b.min[0] - margin || x > b.max[0] + margin || z < b.min[2] - margin || z > b.max[2] + margin) continue;
        if (b.max[1] <= yFrom + 0.01 && b.max[1] > best) {
          best = b.max[1];
          kind = b.kind;
        }
      } else {
        const pr = it.prism;
        const top = pr.y1;
        if (top > yFrom + 0.01 || top <= best) continue;
        if (pointInRings(pr.rings, x, z) || closestOnRings(pr.rings, x, z).d2 < margin * margin) {
          best = top;
          kind = pr.kind;
        }
      }
    }
    return { y: best, kind };
  }

  /**
   * The nearest perch top a gull at (x, yFeet, z) could be steered onto: within `range` metres sideways and at most
   * `height` metres below the gull's feet. Returns a spot just inside the edge (or right below, if already above it).
   */
  perchNear(x: number, yFeet: number, z: number, range: number, height: number): { x: number; y: number; z: number; d: number } | null {
    let best: { x: number; y: number; z: number; d: number } | null = null;
    for (const it of this.query(x - range, z - range, x + range, z + range)) {
      if (!('prism' in it) || it.prism.kind !== 'perch') continue;
      const pr = it.prism;
      const top = pr.y1;
      if (top > yFeet + 0.05 || yFeet - top > height) continue;
      let tx = x, tz = z, d = 0;
      if (!pointInRings(pr.rings, x, z)) {
        const c = closestOnRings(pr.rings, x, z);
        d = Math.sqrt(c.d2);
        if (d > range) continue;
        // aim a little inside the edge, toward the middle of the top
        const bb = pr.bb ?? ringsBB(pr.rings);
        const mx = (bb[0] + bb[2]) / 2, mz = (bb[1] + bb[3]) / 2;
        const ix = mx - c.x, iz = mz - c.z, il = Math.hypot(ix, iz) || 1;
        const inset = Math.min(0.45, il);
        tx = c.x + (ix / il) * inset;
        tz = c.z + (iz / il) * inset;
      }
      if (!best || d < best.d) best = { x: tx, y: top, z: tz, d };
    }
    return best;
  }

  /** Is the point inside any solid (or below the ground)? Used for dive aim preview. */
  solidAt(x: number, y: number, z: number): boolean {
    if (y <= 0) return true;
    for (const it of this.query(x, z, x, z)) {
      if ('box' in it) {
        const b = it.box;
        if (x >= b.min[0] && x <= b.max[0] && y >= b.min[1] && y <= b.max[1] && z >= b.min[2] && z <= b.max[2]) return true;
      } else if (y >= it.prism.y0 && y <= it.prism.y1 && pointInRings(it.prism.rings, x, z)) return true;
    }
    return false;
  }
}

function collideBox(b: Box, p: Vec3, r: number): Contact | null {
  const cx = Math.max(b.min[0], Math.min(p.x, b.max[0]));
  const cy = Math.max(b.min[1], Math.min(p.y, b.max[1]));
  const cz = Math.max(b.min[2], Math.min(p.z, b.max[2]));
  const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz;
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 >= r * r) return null;
  let nx: number, ny: number, nz: number, push: number;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    nx = dx / d; ny = dy / d; nz = dz / d;
    push = r - d;
  } else {
    // centre inside the box: leave through the nearest face
    const faces: [number, number, number, number][] = [
      [p.x - b.min[0], -1, 0, 0], [b.max[0] - p.x, 1, 0, 0],
      [p.y - b.min[1], 0, -1, 0], [b.max[1] - p.y, 0, 1, 0],
      [p.z - b.min[2], 0, 0, -1], [b.max[2] - p.z, 0, 0, 1],
    ];
    faces.sort((a, c) => a[0] - c[0]);
    [push, nx, ny, nz] = faces[0];
    push += r;
  }
  p.x += nx * push; p.y += ny * push; p.z += nz * push;
  return { nx, ny, nz, kind: b.kind };
}

function collidePrism(pr: Prism, p: Vec3, r: number): Contact | null {
  const bb = pr.bb!;
  if (p.x < bb[0] - r || p.x > bb[2] + r || p.z < bb[1] - r || p.z > bb[3] + r) return null;
  if (p.y + r <= pr.y0 || p.y - r >= pr.y1) return null;
  const inside = pointInRings(pr.rings, p.x, p.z);
  const q = closestOnRings(pr.rings, p.x, p.z);
  const cy = Math.max(pr.y0, Math.min(p.y, pr.y1));

  if (!inside) {
    const dx = p.x - q.x, dy = p.y - cy, dz = p.z - q.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r) return null;
    const d = Math.sqrt(d2);
    let nx: number, ny: number, nz: number;
    if (d > 1e-6) { nx = dx / d; ny = dy / d; nz = dz / d; } else { nx = 0; ny = 1; nz = 0; }
    const push = r - d;
    p.x += nx * push; p.y += ny * push; p.z += nz * push;
    return { nx, ny, nz, kind: pr.kind };
  }
  // centre is inside the footprint
  if (p.y >= pr.y1) {
    p.y = pr.y1 + r;
    return { nx: 0, ny: 1, nz: 0, kind: pr.kind };
  }
  if (p.y <= pr.y0) {
    p.y = pr.y0 - r;
    return { nx: 0, ny: -1, nz: 0, kind: pr.kind };
  }
  // inside the solid: leave by the shortest way (up, down or out through the nearest wall)
  const up = pr.y1 - p.y + r;
  const down = p.y - pr.y0 + r;
  const wall = Math.sqrt(q.d2) + r;
  if (wall < up && wall < down) {
    // normal = from the polygon edge towards the sphere; centre is inside so it points inward -> flip to leave outwards
    let nx = q.x - p.x, nz = q.z - p.z;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l; nz /= l;
    p.x += nx * wall; p.z += nz * wall;
    return { nx, ny: 0, nz, kind: pr.kind };
  }
  if (up <= down) {
    p.y = pr.y1 + r;
    return { nx: 0, ny: 1, nz: 0, kind: pr.kind };
  }
  p.y = pr.y0 - r;
  return { nx: 0, ny: -1, nz: 0, kind: pr.kind };
}

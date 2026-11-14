import * as THREE from 'three';
import earcut from 'earcut';
import { World, pointInRings, type Box, type Prism } from './collision';
import { buildLandmarks, ngon, type LandmarkSrc, type PrismDef } from './landmarks';
import { createTargetMeshes } from './targetMeshes';
import type { Target } from '../gameplay/targets';
import type { PropSpawn } from '../gameplay/props';
import cityJson from '../../data/generated/kauppatori.json';
import { FACADES, FLAT_ROOFS, PITCHED_ROOFS, bays, hash, pitchedRoof, rectInfo, roofRise, storeys, wantsPitched, type V3 } from './facade';
import { shopTexture, windowTexture } from '../render/facadeTextures';
import { tuning } from '../core/tuning';
import { planDressing } from './dressingPlan';
import { buildDressing } from './dressing';
import { Water } from '../render/water';
import { buildTents } from './tents';
import { asphaltTexture, grassTexture, pavingTexture } from '../render/groundTextures';

interface CityData {
  half: number;
  buildings: { id: number; h: number; c: number; rings: number[][]; style?: string }[];
  land: { rings: number[][] }[];
  streets: { rings: number[][] }[];
  parks: { rings: number[][] }[];
  landmarks: LandmarkSrc[];
}
const data = cityJson as unknown as CityData;

const CHUNK = 160;

const LAND = 0xefe4cf;
const STREET = 0xd8d3e3;
const PARK = 0xbfe3b0;

export interface City {
  world: World;
  group: THREE.Group;
  targets: Target[];
  targetMeshes: THREE.Object3D[];
  start: { x: number; z: number };
  propSpawns: PropSpawn[];
  /** Land (as opposed to the sea), buildings or not. */
  isLand: (x: number, z: number) => boolean;
  /** Is this spot dry land that a tourist can stand on (not water, not inside a building or stall counter)? */
  walkable: (x: number, z: number) => boolean;
  /** Triangle soup of every building/landmark for static physics colliders. */
  physicsMesh: { vertices: Float32Array; indices: Uint32Array };
  water: Water;
  stats: { buildings: number; prisms: number; chunks: number };
}

const PLAIN: [number, number] = [0.02, 0.02]; // a white texel: faces without windows

class Buf {
  pos: number[] = [];
  col: number[] = [];
  uv: number[] = [];
  tri(a: number[], b: number[], c: number[], color: THREE.Color, ua = PLAIN, ub = PLAIN, uc = PLAIN, cb = color, cc = color): void {
    this.pos.push(...a, ...b, ...c);
    for (const k of [color, cb, cc]) this.col.push(k.r, k.g, k.b);
    this.uv.push(...ua, ...ub, ...uc);
  }
  get empty(): boolean {
    return this.pos.length === 0;
  }
  mesh(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals(); // non-indexed => flat shading
    g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  }
}

const ringArea = (r: number[]): number => {
  let a = 0;
  const n = r.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += r[i * 2] * r[j * 2 + 1] - r[j * 2] * r[i * 2 + 1];
  }
  return a / 2;
};

/** Earcut over outer ring + holes -> list of [ax,az,bx,bz,cx,cz] triangles. */
function triangulate(rings: number[][]): number[][] {
  const coords: number[] = [];
  const holes: number[] = [];
  rings.forEach((r, i) => {
    if (i > 0) holes.push(coords.length / 2);
    coords.push(...r);
  });
  const idx = earcut(coords, holes.length ? holes : undefined, 2);
  const out: number[][] = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 2, b = idx[i + 1] * 2, c = idx[i + 2] * 2;
    out.push([coords[a], coords[a + 1], coords[b], coords[b + 1], coords[c], coords[c + 1]]);
  }
  return out;
}

/** Extrude a prism into walls + roof (faces point outwards / up). */
function extrude(buf: Buf, p: PrismDef | { rings: number[][]; y0: number; y1: number; wall: number; roof: number }): void {
  const wall = new THREE.Color(p.wall);
  const roof = new THREE.Color(p.roof);
  p.rings.forEach((r, ri) => {
    const n = r.length / 2;
    const sign = (ringArea(r) > 0 ? 1 : -1) * (ri === 0 ? 1 : -1);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = r[i * 2], z1 = r[i * 2 + 1], x2 = r[j * 2], z2 = r[j * 2 + 1];
      const A = [x1, p.y0, z1], B = [x2, p.y0, z2], C = [x2, p.y1, z2], D = [x1, p.y1, z1];
      if (sign > 0) {
        buf.tri(A, C, B, wall);
        buf.tri(A, D, C, wall);
      } else {
        buf.tri(A, B, C, wall);
        buf.tri(A, C, D, wall);
      }
    }
  });
  for (const [ax, az, bx, bz, cx, cz] of triangulate(p.rings)) {
    const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az) > 0;
    const a = [ax, p.y1, az], b = [bx, p.y1, bz], c = [cx, p.y1, cz];
    if (up) buf.tri(a, b, c, roof);
    else buf.tri(a, c, b, roof);
  }
}

/** Flat polygon layer (land, streets, parks) at height y; `map` tiles every `tileM` metres in world space. */
function flatLayer(polys: { rings: number[][] }[], y: number, color: number, layer: number, map?: THREE.Texture, tileM = 4): THREE.Mesh {
  const buf = new Buf();
  const c = new THREE.Color(color);
  const uv = (x: number, z: number): [number, number] => [x / tileM, z / tileM];
  for (const poly of polys) {
    for (const [ax, az, bx, bz, cx, cz] of triangulate(poly.rings)) {
      const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az) > 0;
      if (up) buf.tri([ax, y, az], [bx, y, bz], [cx, y, cz], c, uv(ax, az), uv(bx, bz), uv(cx, cz));
      else buf.tri([ax, y, az], [cx, y, cz], [bx, y, bz], c, uv(ax, az), uv(cx, cz), uv(bx, bz));
    }
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: map ?? null, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer });
  const m = buf.mesh(mat);
  m.receiveShadow = true;
  return m;
}

/** Landmark styles applied to registry buildings (set by `restyle` entries in data/landmarks.json). */
const STYLE_WALLS: Record<string, number> = { uspenski: 0xc4705a };
const STYLE_ROOFS: Record<string, number> = { uspenski: 0x8fc4ad };

/** Wall quad with window/shop UVs (u = bays across, v = floors up) and darker feet (baked ambient occlusion). */
function wallQuad(buf: Buf, x1: number, z1: number, x2: number, z2: number, y0: number, y1: number, out: boolean, color: THREE.Color, foot: THREE.Color, u: number, v: number): void {
  const A = [x1, y0, z1], B = [x2, y0, z2], C = [x2, y1, z2], D = [x1, y1, z1];
  const uA: [number, number] = u ? [0, 0] : PLAIN, uB: [number, number] = u ? [u, 0] : PLAIN, uC: [number, number] = u ? [u, v] : PLAIN, uD: [number, number] = u ? [0, v] : PLAIN;
  if (out) {
    buf.tri(A, C, B, foot, uA, uC, uB, color, foot);
    buf.tri(A, D, C, foot, uA, uD, uC, color, color);
  } else {
    buf.tri(A, B, C, foot, uA, uB, uC, foot, color);
    buf.tri(A, C, D, foot, uA, uC, uD, color, color);
  }
}

/** Simple box (x/z rectangle) for roof clutter and chimneys; also returned as a collision prism. */
function box(buf: Buf, cx: number, cz: number, w: number, d: number, y0: number, y1: number, color: number): PrismDef {
  const ring = [cx - w / 2, cz - d / 2, cx + w / 2, cz - d / 2, cx + w / 2, cz + d / 2, cx - w / 2, cz + d / 2];
  const p: PrismDef = { rings: [ring], y0, y1, kind: 'building', wall: color, roof: color };
  extrude(buf, p);
  return p;
}

/** Uspenski-style onion dome: a brick drum, a swelling gold bulb, a spike. Returns its collision prisms. */
function onion(buf: Buf, cx: number, cz: number, base: number, k: number): PrismDef[] {
  const out: PrismDef[] = [];
  const layer = (r: number, y0: number, y1: number, c: number, kind: PrismDef['kind'] = 'building') => {
    const p: PrismDef = { rings: [ngon(cx, cz, r * k, 10)], y0: base + y0 * k, y1: base + y1 * k, kind, wall: c, roof: c };
    extrude(buf, p);
    out.push(p);
  };
  const BRICK = 0xc4705a, GOLD = 0xf3d37a;
  layer(2.2, 0, 3.2, BRICK);
  layer(2.5, 3.2, 3.6, 0xfdfaf2);
  layer(2.7, 3.6, 4.6, GOLD);
  layer(2.4, 4.6, 5.4, GOLD);
  layer(1.7, 5.4, 6.0, GOLD);
  layer(0.9, 6.0, 6.6, GOLD);
  layer(0.25, 6.6, 8.2, GOLD, 'perch');
  return out;
}

/** One registry building: walls with windows and shopfronts, a cornice, a pitched or flat roof, roof clutter. Returns its collision prisms. */
function building(upper: Buf, ground: Buf, b: CityData['buildings'][number]): PrismDef[] {
  const style = b.style;
  const wallHex = style ? STYLE_WALLS[style] ?? 0xfdfaf2 : b.c === 4 ? 0xfdfaf2 : FACADES[hash(b.id) % FACADES.length];
  const wall = new THREE.Color(wallHex);
  const foot = wall.clone().multiplyScalar(1 - tuning.render.ao.value);
  const trim = wall.clone().lerp(new THREE.Color(0xffffff), 0.45);
  const h = b.h;
  const st = storeys(h);
  const r = b.rings.length === 1 ? rectInfo(b.rings[0]) : null;
  const pitched = !style && wantsPitched(r, b.id, h);
  const prisms: PrismDef[] = [{ rings: b.rings, y0: 0, y1: h, kind: 'building', wall: wallHex, roof: wallHex }];

  b.rings.forEach((ring, ri) => {
    const n = ring.length / 2;
    const sign = (ringArea(ring) > 0 ? 1 : -1) * (ri === 0 ? 1 : -1);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = ring[i * 2], z1 = ring[i * 2 + 1], x2 = ring[j * 2], z2 = ring[j * 2 + 1];
      const nb = bays(Math.hypot(x2 - x1, z2 - z1));
      wallQuad(ground, x1, z1, x2, z2, 0, st.ground, sign > 0, wall, foot, nb, 1);
      if (st.upperFloors) wallQuad(upper, x1, z1, x2, z2, st.ground, h, sign > 0, wall, wall, nb, st.upperFloors);
      // cornice: a lighter ledge that sticks out at the top of taller flat-roofed buildings
      if (ri === 0 && !pitched && h >= 6) {
        const len = Math.hypot(x2 - x1, z2 - z1) || 1;
        let nx = (z2 - z1) / len, nz = -(x2 - x1) / len;
        if (sign < 0) {
          nx = -nx;
          nz = -nz;
        }
        const o = 0.22, t = 0.35;
        const ox1 = x1 + nx * o, oz1 = z1 + nz * o, ox2 = x2 + nx * o, oz2 = z2 + nz * o;
        wallQuad(upper, ox1, oz1, ox2, oz2, h - t, h, sign > 0, trim, trim, 0, 0);
        // top and underside of the ledge
        const T1 = [x1, h, z1], T2 = [x2, h, z2], O1 = [ox1, h, oz1], O2 = [ox2, h, oz2];
        const U1 = [x1, h - t, z1], U2 = [x2, h - t, z2], P1 = [ox1, h - t, oz1], P2 = [ox2, h - t, oz2];
        if (sign > 0) {
          upper.tri(T1, O2, O1, trim);
          upper.tri(T1, T2, O2, trim);
          upper.tri(U1, P1, P2, trim);
          upper.tri(U1, P2, U2, trim);
        } else {
          upper.tri(T1, O1, O2, trim);
          upper.tri(T1, O2, T2, trim);
          upper.tri(U1, P2, P1, trim);
          upper.tri(U1, U2, P2, trim);
        }
        // parapet: a low wall around the roof edge (outer face, cap, inner face)
        const ph = 0.55, pw = 0.3;
        const ix1 = x1 - nx * pw, iz1 = z1 - nz * pw, ix2 = x2 - nx * pw, iz2 = z2 - nz * pw;
        wallQuad(upper, x1, z1, x2, z2, h, h + ph, sign > 0, wall, wall, 0, 0);
        wallQuad(upper, ix1, iz1, ix2, iz2, h, h + ph, sign < 0, foot, wall, 0, 0);
        const C1 = [x1, h + ph, z1], C2 = [x2, h + ph, z2], I1 = [ix1, h + ph, iz1], I2 = [ix2, h + ph, iz2];
        if (sign > 0) {
          upper.tri(C1, C2, I2, trim);
          upper.tri(C1, I2, I1, trim);
        } else {
          upper.tri(C1, I2, C2, trim);
          upper.tri(C1, I1, I2, trim);
        }
      }
    }
  });

  if (style === 'uspenski') {
    // a big central onion dome and smaller ones around it (where the footprint allows)
    const outer = b.rings[0];
    let cx = 0, cz = 0;
    for (let i = 0; i < outer.length; i += 2) {
      cx += outer[i];
      cz += outer[i + 1];
    }
    cx /= outer.length / 2;
    cz /= outer.length / 2;
    prisms.push(...onion(upper, cx, cz, h, 1.7));
    for (const [dx, dz] of [[-9, -9], [9, -9], [9, 9], [-9, 9]]) {
      if (pointInRings(b.rings, cx + dx, cz + dz)) prisms.push(...onion(upper, cx + dx, cz + dz, h, 0.9));
    }
  }
  if (pitched && r) {
    const rise = roofRise(r.short);
    const hip = r.long / r.short < 1.3;
    const roofHex = style ? STYLE_ROOFS[style] ?? PITCHED_ROOFS[0] : PITCHED_ROOFS[hash(b.id, 3) % PITCHED_ROOFS.length];
    const roofC = new THREE.Color(roofHex);
    const roof = pitchedRoof(r, h, rise, hip);
    for (const [p, q, t] of roof.slopes) upper.tri(p, q, t, roofC);
    for (const [p, q, t] of roof.gables) upper.tri(p, q, t, wall);
    for (const sl of roof.slabs) prisms.push({ rings: [sl.ring], y0: sl.y0, y1: sl.y1, kind: sl.perch ? 'perch' : 'building', wall: roofHex, roof: roofHex });
    // dormers along both long sides of a gable roof
    if (!hip && r.long > 7 && rise > 2) {
      const [a, bb, , d] = r.c;
      const ux = (bb[0] - a[0]) / r.long, uz = (bb[1] - a[1]) / r.long;
      const n = Math.floor((r.long - 2) / 5);
      for (const [p0, inward] of [[a, [(d[0] - a[0]) / r.short, (d[1] - a[1]) / r.short]], [d, [(a[0] - d[0]) / r.short, (a[1] - d[1]) / r.short]]] as [[number, number], [number, number]][]) {
        for (let i = 0; i < n; i++) {
          const t = (r.long - (n - 1) * 5) / 2 + i * 5;
          const cx = p0[0] + ux * t + inward[0] * 1.6, cz = p0[1] + uz * t + inward[1] * 1.6;
          const ring = [
            cx - ux * 0.7 - inward[0] * 0.6, cz - uz * 0.7 - inward[1] * 0.6,
            cx + ux * 0.7 - inward[0] * 0.6, cz + uz * 0.7 - inward[1] * 0.6,
            cx + ux * 0.7 + inward[0] * 0.6, cz + uz * 0.7 + inward[1] * 0.6,
            cx - ux * 0.7 + inward[0] * 0.6, cz - uz * 0.7 + inward[1] * 0.6,
          ];
          const top = h + rise * (1.6 / (r.short / 2)) + 0.5;
          extrude(upper, { rings: [ring], y0: h, y1: top, wall: wallHex, roof: roofHex });
          // the dormer window, a dark pane on its outward face
          const fx = cx - inward[0] * 0.62, fz = cz - inward[1] * 0.62;
          const g = new THREE.Color(0x6c829b);
          const A = [fx - ux * 0.4, top - 1.05, fz - uz * 0.4], B = [fx + ux * 0.4, top - 1.05, fz + uz * 0.4], C = [fx + ux * 0.4, top - 0.25, fz + uz * 0.4], D = [fx - ux * 0.4, top - 0.25, fz - uz * 0.4];
          upper.tri(A, B, C, g);
          upper.tri(A, C, D, g);
          upper.tri(A, C, B, g);
          upper.tri(A, D, C, g);
        }
      }
    }
    if (hash(b.id, 5) % 2 === 0) {
      // a chimney poking out of the roof near the ridge
      const [R1, R2] = roof.ridge as [V3, V3];
      const k = 0.3;
      const cx = R1[0] + (R2[0] - R1[0]) * k, cz = R1[2] + (R2[2] - R1[2]) * k;
      prisms.push(box(upper, cx, cz, 0.8, 0.8, h + rise * 0.4, h + rise + 0.7, 0xb8735e));
    }
  } else {
    // flat roof
    const roofC = new THREE.Color(style ? STYLE_ROOFS[style] ?? FLAT_ROOFS[0] : FLAT_ROOFS[hash(b.id, 11) % FLAT_ROOFS.length]);
    for (const [ax, az, bx, bz, cx, cz] of triangulate(b.rings)) {
      const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az) > 0;
      const A = [ax, h, az], B = [bx, h, bz], C = [cx, h, cz];
      if (up) upper.tri(A, B, C, roofC);
      else upper.tri(A, C, B, roofC);
    }
    // roof clutter: stairwell boxes and vents on bigger flat roofs
    const outer = b.rings[0];
    let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
    for (let i = 0; i < outer.length; i += 2) {
      minx = Math.min(minx, outer[i]);
      maxx = Math.max(maxx, outer[i]);
      minz = Math.min(minz, outer[i + 1]);
      maxz = Math.max(maxz, outer[i + 1]);
    }
    const count = h >= 6 && Math.abs(ringArea(outer)) > 80 ? 1 + (hash(b.id, 9) % 3) : 0;
    for (let i = 0; i < count; i++) {
      const fx = (hash(b.id, 20 + i) % 1000) / 1000, fz = (hash(b.id, 40 + i) % 1000) / 1000;
      const w = 1.4 + (hash(b.id, 60 + i) % 100) / 60, d = 1.4 + (hash(b.id, 80 + i) % 100) / 60;
      const cx = minx + (0.2 + fx * 0.6) * (maxx - minx), cz = minz + (0.2 + fz * 0.6) * (maxz - minz);
      const inside = [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([sx, sz]) => pointInRings(b.rings, cx + (sx * w) / 2 + sx * 0.5, cz + (sz * d) / 2 + sz * 0.5));
      if (inside) prisms.push(box(upper, cx, cz, w, d, h, h + 1 + (hash(b.id, 99 + i) % 10) / 8, 0xc9c4bd));
    }
    if (h >= 6) {
      const at = (k: number, pad: number): [number, number] | null => {
        const fx = (hash(b.id, 200 + k) % 1000) / 1000, fz = (hash(b.id, 300 + k) % 1000) / 1000;
        const x = minx + (0.1 + fx * 0.8) * (maxx - minx), z = minz + (0.1 + fz * 0.8) * (maxz - minz);
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([sx, sz]) => pointInRings(b.rings, x + sx * pad, z + sz * pad)) ? [x, z] : null;
      };
      // chimney stacks (brick, with a cap)
      for (let i = 0; i < 1 + (hash(b.id, 13) % 3); i++) {
        const p = at(i, 1);
        if (!p) continue;
        const top = h + 1.4 + (hash(b.id, 400 + i) % 10) / 10;
        prisms.push(box(upper, p[0], p[1], 0.7, 1.1, h, top, 0xc27d66));
        box(upper, p[0], p[1], 0.9, 1.3, top, top + 0.15, 0x8f8a86);
      }
      // skylights (dark glass panes lying on the roof)
      for (let i = 0; i < hash(b.id, 17) % 3; i++) {
        const p = at(10 + i, 1.4);
        if (!p) continue;
        const g = new THREE.Color(0x6c829b);
        const y = h + 0.06;
        upper.tri([p[0] - 0.9, y, p[1] - 0.6], [p[0] - 0.9, y, p[1] + 0.6], [p[0] + 0.9, y, p[1] + 0.6], g);
        upper.tri([p[0] - 0.9, y, p[1] - 0.6], [p[0] + 0.9, y, p[1] + 0.6], [p[0] + 0.9, y, p[1] - 0.6], g);
      }
      // a TV antenna now and then
      if (hash(b.id, 19) % 3 === 0) {
        const p = at(20, 0.5);
        if (p) {
          box(upper, p[0], p[1], 0.07, 0.07, h, h + 2.6, 0x6d717a);
          box(upper, p[0], p[1], 1.2, 0.05, h + 2.2, h + 2.26, 0x6d717a);
          box(upper, p[0], p[1], 0.8, 0.05, h + 2.45, h + 2.5, 0x6d717a);
        }
      }
    }
  }
  return prisms;
}

export function buildCity(): City {
  const group = new THREE.Group();

  // water everywhere, land/streets/parks on top
  const isLand = (x: number, z: number) => data.land.some((l) => pointInRings(l.rings, x, z));
  const water = new Water(data.land, isLand);
  group.add(water.group);
  group.add(flatLayer(data.land, 0.02, LAND, 1, pavingTexture(), 3), flatLayer(data.streets, 0.03, STREET, 2, asphaltTexture(), 6), flatLayer(data.parks, 0.04, PARK, 3, grassTexture(), 5));

  // landmarks keep the plain prism look; registry buildings get facades, roofs and roof clutter
  const lm = buildLandmarks(data.landmarks);
  for (const m of lm.mats) group.add(flatLayer([{ rings: m.rings }], 0.05, m.color, 4));
  const defs: PrismDef[] = [...lm.prisms];

  // chunked, merged meshes (two draw calls per ~160 m cell: upper floors + ground floors) so frustum culling works
  const chunks = new Map<string, { upper: Buf; ground: Buf }>();
  const chunkFor = (ring: number[]) => {
    let cx = 0, cz = 0;
    for (let i = 0; i < ring.length; i += 2) {
      cx += ring[i];
      cz += ring[i + 1];
    }
    cx /= ring.length / 2;
    cz /= ring.length / 2;
    const key = `${Math.floor(cx / CHUNK)},${Math.floor(cz / CHUNK)}`;
    let c = chunks.get(key);
    if (!c) chunks.set(key, (c = { upper: new Buf(), ground: new Buf() }));
    return c;
  };
  for (const d of lm.prisms) if (!d.hidden) extrude(chunkFor(d.rings[0]).upper, d);
  const tents = buildTents(lm.decor);
  if (tents) group.add(tents);
  for (const b of data.buildings) {
    const c = chunkFor(b.rings[0]);
    defs.push(...building(c.upper, c.ground, b));
  }
  const upperMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: windowTexture() });
  const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: shopTexture() });
  const phys: number[] = [];
  for (const { upper, ground } of chunks.values()) {
    for (const [buf, m] of [[upper, upperMat], [ground, groundMat]] as const) {
      if (buf.empty) continue;
      const mesh = buf.mesh(m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      for (const v of buf.pos) phys.push(v);
    }
  }
  const physicsMesh = { vertices: new Float32Array(phys), indices: Uint32Array.from({ length: phys.length / 3 }, (_, i) => i) };

  // set dressing (trees, benches, bollards, bikes, café umbrellas, boats); trees are perches
  const probe = new World([], defs, data.half);
  const keepClear = data.landmarks
    .filter((l) => Number.isFinite(l.x) && Number.isFinite(l.z))
    .map((l) => ({ x: l.x, z: l.z, r: l.type === 'tents' || l.type === 'goods' ? 50 : l.type === 'ferry' ? 35 : 12 }));
  keepClear.push(...lm.props.map((p) => ({ x: p.x, z: p.z, r: 2.5 })));
  const dressing = buildDressing(planDressing({ parks: data.parks, land: data.land, streets: data.streets, isLand, solid: (x, z) => probe.solidAt(x, 0.9, z), keepClear }));
  group.add(dressing.group);
  defs.push(...dressing.prisms);

  const prisms: Prism[] = defs;
  const boxes: Box[] = [];
  const world = new World(boxes, prisms, data.half);

  const targets = lm.targets;
  const targetMeshes = createTargetMeshes(targets, group);
  return { world, group, targets, targetMeshes, start: { x: 0, z: -12 }, propSpawns: lm.props, water, isLand, walkable: (x, z) => isLand(x, z) && !world.solidAt(x, 0.9, z), physicsMesh, stats: { buildings: data.buildings.length, prisms: defs.length, chunks: chunks.size } };
}

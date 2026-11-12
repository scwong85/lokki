import * as THREE from 'three';
import earcut from 'earcut';
import { palette } from '../render/palette';
import { World, type Box, type Prism } from './collision';
import { buildLandmarks, type LandmarkSrc, type PrismDef } from './landmarks';
import { createTargetMeshes } from './targetMeshes';
import type { Target } from '../gameplay/targets';
import type { PropSpawn } from '../gameplay/props';
import cityJson from '../../data/generated/kauppatori.json';

interface CityData {
  half: number;
  buildings: { id: number; h: number; c: number; rings: number[][] }[];
  land: { rings: number[][] }[];
  streets: { rings: number[][] }[];
  parks: { rings: number[][] }[];
  landmarks: LandmarkSrc[];
}
const data = cityJson as unknown as CityData;

/** Wall colours by building colour index, and matching roof colours. */
const WALLS = [palette.cream, palette.peach, palette.mint, palette.lilac, 0xfdfaf2];
const ROOFS = [palette.terracotta, 0xc7b5e0, 0xe8b39a, 0xa9cdbb, 0xdcdcdc];
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
  /** Triangle soup of every building/landmark for static physics colliders. */
  physicsMesh: { vertices: Float32Array; indices: Uint32Array };
  stats: { buildings: number; prisms: number; chunks: number };
}

class Buf {
  pos: number[] = [];
  col: number[] = [];
  tri(a: number[], b: number[], c: number[], color: THREE.Color): void {
    this.pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) this.col.push(color.r, color.g, color.b);
  }
  mesh(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
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

/** Flat polygon layer (land, streets, parks) at height y. */
function flatLayer(polys: { rings: number[][] }[], y: number, color: number, layer: number): THREE.Mesh {
  const buf = new Buf();
  const c = new THREE.Color(color);
  for (const poly of polys) {
    for (const [ax, az, bx, bz, cx, cz] of triangulate(poly.rings)) {
      const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az) > 0;
      if (up) buf.tri([ax, y, az], [bx, y, bz], [cx, y, cz], c);
      else buf.tri([ax, y, az], [cx, y, cz], [bx, y, bz], c);
    }
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer });
  return buf.mesh(mat);
}

export function buildCity(): City {
  const group = new THREE.Group();

  // water everywhere, land/streets/parks on top
  const water = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshLambertMaterial({ color: palette.water, flatShading: true }));
  water.rotation.x = -Math.PI / 2;
  group.add(water);
  group.add(flatLayer(data.land, 0.02, LAND, 1), flatLayer(data.streets, 0.03, STREET, 2), flatLayer(data.parks, 0.04, PARK, 3));

  // landmarks + buildings share one prism pipeline
  const lm = buildLandmarks(data.landmarks);
  for (const m of lm.mats) group.add(flatLayer([{ rings: m.rings }], 0.05, m.color, 4));
  const defs: PrismDef[] = data.buildings.map((b) => ({
    rings: b.rings, y0: 0, y1: b.h, kind: 'building', wall: WALLS[b.c] ?? WALLS[0], roof: ROOFS[b.c] ?? ROOFS[0],
  }));
  defs.push(...lm.prisms);

  // chunked, merged meshes (one draw call per ~160 m cell) so frustum culling works
  const chunks = new Map<string, Buf>();
  for (const d of defs) {
    const r = d.rings[0];
    let cx = 0, cz = 0;
    for (let i = 0; i < r.length; i += 2) {
      cx += r[i];
      cz += r[i + 1];
    }
    cx /= r.length / 2;
    cz /= r.length / 2;
    const key = `${Math.floor(cx / CHUNK)},${Math.floor(cz / CHUNK)}`;
    let buf = chunks.get(key);
    if (!buf) chunks.set(key, (buf = new Buf()));
    extrude(buf, d);
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const phys: number[] = [];
  for (const buf of chunks.values()) {
    group.add(buf.mesh(mat));
    for (const v of buf.pos) phys.push(v);
  }
  const physicsMesh = { vertices: new Float32Array(phys), indices: Uint32Array.from({ length: phys.length / 3 }, (_, i) => i) };

  const prisms: Prism[] = defs;
  const boxes: Box[] = [];
  const world = new World(boxes, prisms, data.half);

  const targets = lm.targets;
  const targetMeshes = createTargetMeshes(targets, group);
  return { world, group, targets, targetMeshes, start: { x: 0, z: -12 }, propSpawns: lm.props, physicsMesh, stats: { buildings: data.buildings.length, prisms: defs.length, chunks: chunks.size } };
}

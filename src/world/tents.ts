import * as THREE from 'three';
import type { Decor } from './landmarks';

const ORANGE = new THREE.Color(0xff8a3d);
const CREAM = new THREE.Color(0xfff1d6);
const POLE = new THREE.Color(0xf2efe9);
const DARK = new THREE.Color(0xe0702b);

/**
 * Market tent: four white poles, a striped pyramid canopy, a scalloped valance and a little pennant on top.
 * One geometry, drawn for every tent with a single instanced mesh.
 */
export function tentGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const tri = (a: number[], b: number[], c: number[], k: THREE.Color) => {
    pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) col.push(k.r, k.g, k.b);
  };
  const quad = (a: number[], b: number[], c: number[], d: number[], k: THREE.Color) => {
    tri(a, b, c, k);
    tri(a, c, d, k);
  };
  const H = 1.95, base = 2.35, apex = 3.35, STRIPES = 4;
  const corners = [[-H, -H], [H, -H], [H, H], [-H, H]];
  // canopy: each side a fan of stripes from the apex
  for (let s = 0; s < 4; s++) {
    const [x1, z1] = corners[s], [x2, z2] = corners[(s + 1) % 4];
    for (let i = 0; i < STRIPES; i++) {
      const t0 = i / STRIPES, t1 = (i + 1) / STRIPES;
      const p0 = [x1 + (x2 - x1) * t0, base, z1 + (z2 - z1) * t0], p1 = [x1 + (x2 - x1) * t1, base, z1 + (z2 - z1) * t1];
      tri([0, apex, 0], p1, p0, i % 2 ? CREAM : ORANGE);
      tri([0, apex, 0], p0, p1, i % 2 ? CREAM : ORANGE); // underside
    }
    // valance: scallops hanging from the canopy edge
    const n = 6;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
      const a = [x1 + (x2 - x1) * t0, base, z1 + (z2 - z1) * t0], b = [x1 + (x2 - x1) * t1, base, z1 + (z2 - z1) * t1];
      const m = [x1 + (x2 - x1) * tm, base - 0.32, z1 + (z2 - z1) * tm];
      const k = i % 2 ? DARK : ORANGE;
      tri(a, m, b, k);
      tri(a, b, m, k);
    }
  }
  // poles
  for (const [x, z] of corners) {
    const r = 0.05, px = x * 0.97, pz = z * 0.97;
    quad([px - r, 0, pz], [px + r, 0, pz], [px + r, base, pz], [px - r, base, pz], POLE);
    quad([px, 0, pz - r], [px, 0, pz + r], [px, base, pz + r], [px, base, pz - r], POLE);
    quad([px + r, 0, pz], [px - r, 0, pz], [px - r, base, pz], [px + r, base, pz], POLE);
    quad([px, 0, pz + r], [px, 0, pz - r], [px, base, pz - r], [px, base, pz + r], POLE);
  }
  // pennant
  quad([0, apex, -0.02], [0, apex, 0.02], [0, apex + 0.6, 0.02], [0, apex + 0.6, -0.02], POLE);
  tri([0, apex + 0.6, 0], [0, apex + 0.35, 0], [0.45, apex + 0.48, 0], ORANGE);
  tri([0, apex + 0.6, 0], [0.45, apex + 0.48, 0], [0, apex + 0.35, 0], ORANGE);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function buildTents(list: readonly Decor[]): THREE.InstancedMesh | null {
  const tents = list.filter((d) => d.kind === 'tent');
  if (!tents.length) return null;
  const mesh = new THREE.InstancedMesh(tentGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), tents.length);
  const m = new THREE.Matrix4();
  tents.forEach((t, i) => mesh.setMatrixAt(i, m.makeRotationY(-t.a).setPosition(t.x, 0, t.z)));
  mesh.computeBoundingSphere();
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'tents';
  return mesh;
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** One far block of the horizon ring. */
export interface BackdropBlock {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** Pale tint variation (0..1). */
  tint: number;
}

/**
 * The city does not end at the edge of the playable square: plain, hazy blocks continue beyond it, on land only, so the view
 * from the air fades into a skyline instead of bare ground. Seeded and pure.
 */
export function planBackdrop(isLand: (x: number, z: number) => boolean, half: number, count = 170, seed = 5): BackdropBlock[] {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const out: BackdropBlock[] = [];
  for (let tries = 0; tries < count * 12 && out.length < count; tries++) {
    const a = rnd() * Math.PI * 2;
    const r = half + 20 + rnd() * 330;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.max(Math.abs(x), Math.abs(z)) < half + 12) continue; // keep the playable square clear
    if (!isLand(x, z)) continue;
    const far = (r - half) / 330;
    out.push({ x, z, w: 14 + rnd() * 24, d: 14 + rnd() * 24, h: 10 + rnd() * 20 + far * 14, tint: rnd() });
  }
  return out;
}

const TINTS = [0xd9d2e6, 0xe6dccf, 0xd6dde8, 0xe3d6d6];

/** One mesh, one draw call, no collision. */
export function buildBackdrop(blocks: readonly BackdropBlock[]): THREE.Mesh | null {
  if (!blocks.length) return null;
  const geos: THREE.BufferGeometry[] = [];
  const c = new THREE.Color();
  for (const b of blocks) {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d).toNonIndexed();
    g.deleteAttribute('uv');
    g.translate(b.x, b.h / 2, b.z);
    c.setHex(TINTS[Math.floor(b.tint * TINTS.length) % TINTS.length]);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) {
      col[i] = c.r;
      col[i + 1] = c.g;
      col[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos, false)!, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.name = 'backdrop';
  return mesh;
}

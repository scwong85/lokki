import * as THREE from 'three';
import { mergeColored } from '../render/mergeMesh';
import { ngon, type PrismDef } from './landmarks';
import type { DressType, Placement } from './dressingPlan';

const m = (c: number) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const part = (g: THREE.BufferGeometry, c: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(g, m(c));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
};

/** Low-poly models, one merged geometry each (white parts take the per-instance tint). */
function model(type: DressType): THREE.Mesh {
  const g = new THREE.Group();
  switch (type) {
    case 'tree':
      g.add(part(new THREE.CylinderGeometry(0.14, 0.2, 2.8, 6), 0x9c7b5f, 0, 1.4, 0));
      g.add(part(new THREE.IcosahedronGeometry(1.9, 0), 0x9fd18f, 0, 3.7, 0));
      g.add(part(new THREE.IcosahedronGeometry(1.25, 0), 0xb7e2a2, 0.6, 4.7, 0.3));
      break;
    case 'bench':
      g.add(part(new THREE.BoxGeometry(1.6, 0.08, 0.45), 0xc99b72, 0, 0.45, 0));
      g.add(part(new THREE.BoxGeometry(1.6, 0.4, 0.06), 0xc99b72, 0, 0.75, -0.21, -0.15));
      for (const x of [-0.65, 0.65]) g.add(part(new THREE.BoxGeometry(0.07, 0.45, 0.42), 0x5a6070, x, 0.22, 0));
      break;
    case 'bollard':
      g.add(part(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 7), 0x4a4f5c, 0, 0.35, 0));
      g.add(part(new THREE.SphereGeometry(0.18, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0x4a4f5c, 0, 0.7, 0));
      break;
    case 'bike':
      for (const z of [-0.5, 0.5]) g.add(part(new THREE.TorusGeometry(0.32, 0.035, 4, 12), 0x3a3f4a, 0, 0.34, z, 0, Math.PI / 2));
      g.add(part(new THREE.BoxGeometry(0.05, 0.05, 0.95), 0xffffff, 0, 0.62, 0));
      g.add(part(new THREE.BoxGeometry(0.05, 0.45, 0.05), 0xffffff, 0, 0.45, -0.15, 0.35));
      g.add(part(new THREE.BoxGeometry(0.05, 0.45, 0.05), 0xffffff, 0, 0.6, 0.42, -0.3));
      g.add(part(new THREE.BoxGeometry(0.5, 0.04, 0.04), 0x3a3f4a, 0, 0.86, 0.48));
      g.add(part(new THREE.BoxGeometry(0.12, 0.05, 0.22), 0x3a3f4a, 0, 0.84, -0.2));
      break;
    case 'umbrella':
      g.add(part(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 5), 0xece6dc, 0, 1.15, 0));
      g.add(part(new THREE.ConeGeometry(1.5, 0.55, 8), 0xffffff, 0, 2.35, 0));
      g.add(part(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 10), 0xece6dc, 0, 0.75, 0));
      g.add(part(new THREE.CylinderGeometry(0.05, 0.08, 0.75, 5), 0x5a6070, 0, 0.37, 0));
      break;
    case 'boat':
      g.add(part(new THREE.BoxGeometry(1.7, 0.6, 4.2), 0xffffff, 0, 0.25, 0));
      g.add(part(new THREE.ConeGeometry(0.85, 1.3, 4, 1), 0xffffff, 0, 0.25, 2.7, Math.PI / 2, Math.PI / 4));
      g.add(part(new THREE.BoxGeometry(1.75, 0.12, 4.3), 0xece6dc, 0, 0.6, 0));
      g.add(part(new THREE.BoxGeometry(1.1, 0.7, 1.4), 0xf5f0e6, 0, 0.95, -0.6));
      g.add(part(new THREE.CylinderGeometry(0.04, 0.04, 3, 4), 0x9aa1b3, 0, 2.2, 0.4));
      break;
  }
  return mergeColored(g);
}

const TINTS: Partial<Record<DressType, number[]>> = {
  bike: [0x6ab7ff, 0xff9ec4, 0xffd36e, 0x9fd18f, 0xc7b5e0],
  umbrella: [0xff9ec4, 0xffd36e, 0x9bd8ff, 0xffffff, 0xb5e8b0],
  boat: [0xffffff, 0x9bd8ff, 0xffc9a8, 0xd9c9f0],
  tree: [0xffffff, 0xe8f5d8, 0xd8ecc0],
};

/** One instanced mesh per item type (6 draw calls for all the dressing). Trees also return perch prisms for their canopies. */
export function buildDressing(list: readonly Placement[]): { group: THREE.Group; prisms: PrismDef[] } {
  const group = new THREE.Group();
  const prisms: PrismDef[] = [];
  const byType = new Map<DressType, Placement[]>();
  for (const p of list) {
    const l = byType.get(p.type) ?? [];
    l.push(p);
    byType.set(p.type, l);
  }
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  for (const [type, items] of byType) {
    const base = model(type);
    const inst = new THREE.InstancedMesh(base.geometry, base.material, items.length);
    const tints = TINTS[type];
    items.forEach((p, i) => {
      const y = type === 'boat' ? 0.05 : 0;
      mtx.compose(new THREE.Vector3(p.x, y, p.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot), new THREE.Vector3(p.s, p.s, p.s));
      inst.setMatrixAt(i, mtx);
      inst.setColorAt(i, col.setHex(tints ? tints[i % tints.length] : 0xffffff));
      if (type === 'tree') prisms.push({ rings: [ngon(p.x, p.z, 1.7 * p.s, 8)], y0: 2.6 * p.s, y1: 5.3 * p.s, kind: 'perch', wall: 0, roof: 0 });
    });
    inst.computeBoundingSphere();
    inst.castShadow = type === 'tree' || type === 'umbrella' || type === 'boat';
    inst.receiveShadow = true;
    inst.name = `dressing-${type}`;
    group.add(inst);
  }
  return { group, prisms };
}

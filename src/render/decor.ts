import * as THREE from 'three';

/** Scenery that makes a puzzle readable at a glance: a buffet table, a picnic blanket with a basket. Plain meshes (and a solid top for the table). */
export type DecorKind = 'table' | 'blanket';
export interface DecorDef {
  kind: DecorKind;
  x: number;
  z: number;
  /** Rotation about the vertical axis (rad). */
  rot?: number;
}

const m = (color: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color });

function checker(a: string, b: string, n = 6): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const s = 128 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? a : b;
    g.fillRect(i * s, j * s, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Size of the solid top of the table (half extents) and its height, for the physics world. */
export const TABLE_TOP = { hx: 2.1, hy: 0.05, hz: 0.7, y: 0.85 };

export function buildDecor(d: DecorDef): THREE.Group {
  const g = new THREE.Group();
  if (d.kind === 'table') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE_TOP.hx * 2, TABLE_TOP.hy * 2, TABLE_TOP.hz * 2), m(0xffffff));
    top.position.y = TABLE_TOP.y;
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(TABLE_TOP.hx * 2 + 0.1, 0.6, TABLE_TOP.hz * 2 + 0.1), m(0xfff1d6)); // a cloth hanging down the sides
    cloth.position.y = TABLE_TOP.y - 0.33;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(TABLE_TOP.hx * 2 + 0.12, 0.08, TABLE_TOP.hz * 2 + 0.12), m(0xe05a8b));
    stripe.position.y = TABLE_TOP.y - 0.5;
    g.add(top, cloth, stripe);
    // a plate and a cake stand's worth of trimmings, so it reads as a buffet
    for (const x of [-1.5, -0.8, 0.8, 1.5]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), m(0xffffff));
      plate.position.set(x, TABLE_TOP.y + 0.07, 0.25);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m(x < 0 ? 0xd9a066 : 0xe86a8a));
      bun.position.set(x, TABLE_TOP.y + 0.15, 0.25);
      g.add(plate, bun);
    }
  } else {
    // a thin slab (not a plane), raised clear of the paving so it never z-fights with the ground
    const top = new THREE.MeshLambertMaterial({ map: checker('#d9402f', '#fff7ea') });
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 3.2), [m(0xd9402f), m(0xd9402f), top, m(0xd9402f), m(0xd9402f), m(0xd9402f)]);
    cloth.position.y = 0.07;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.45), m(0xb97b3b));
    basket.position.set(1.4, 0.3, -0.6);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 12, Math.PI), m(0x8a5a26));
    handle.position.set(1.4, 0.5, -0.6);
    // a little flag so it can be seen from far above
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), m(0xffffff));
    pole.position.set(-1.9, 1.1, 1.3);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.03), m(0xe05a8b));
    flag.position.set(-1.5, 1.95, 1.3);
    g.add(cloth, basket, handle, pole, flag);
  }
  g.position.set(d.x, 0, d.z);
  g.rotation.y = d.rot ?? 0;
  return g;
}

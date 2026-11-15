import * as THREE from 'three';
import type { PropType } from '../data/props';
import { mergeColored } from '../render/mergeMesh';

const mats = new Map<number, THREE.MeshLambertMaterial>();
const mat = (c: number) => {
  let m = mats.get(c);
  if (!m) mats.set(c, (m = new THREE.MeshLambertMaterial({ color: c, flatShading: true })));
  return m;
};
const mesh = (g: THREE.BufferGeometry, c: number, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(g, mat(c));
  m.position.set(x, y, z);
  return m;
};

/** Primitive-built prop visuals, centred on the physics body centre. */
export function createPropMesh(type: PropType): THREE.Group {
  const parts = new THREE.Group();
  buildParts(type, parts);
  // one draw call per prop; the Group stays so splat blobs can be attached
  const g = new THREE.Group();
  g.add(mergeColored(parts));
  return g;
}

function buildParts(type: PropType, g: THREE.Group): void {
  switch (type) {
    case 'icecream': {
      const cone = mesh(new THREE.ConeGeometry(0.13, 0.3, 8), 0xf2c28b, 0, -0.1, 0);
      cone.rotation.x = Math.PI;
      g.add(cone, mesh(new THREE.SphereGeometry(0.15, 10, 8), 0xff8fab, 0, 0.1, 0));
      break;
    }
    case 'fish': {
      const body = mesh(new THREE.SphereGeometry(1, 10, 6), 0xe8b46a);
      body.scale.set(0.3, 0.06, 0.12);
      const tail = mesh(new THREE.ConeGeometry(0.1, 0.16, 4), 0xd49a4c, 0.34, 0, 0);
      tail.rotation.z = Math.PI / 2;
      tail.scale.z = 0.4;
      g.add(body, tail);
      break;
    }
    case 'bun':
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12), 0xd9a066));
      g.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 5, 12), 0xa8703c, 0, 0.07, 0)).children[1].rotation.x = Math.PI / 2;
      break;
    case 'cap': {
      g.add(mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.05, 14), 0xffffff, 0, 0.05, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 14), 0x3a3f4a, 0, -0.02, 0));
      g.add(mesh(new THREE.BoxGeometry(0.2, 0.015, 0.13), 0x3a3f4a, 0, -0.02, -0.22));
      break;
    }
    case 'tophat':
      g.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 14), 0x4a4a6a, 0, -0.15, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.3, 14), 0x4a4a6a, 0, 0, 0));
      break;
    case 'bottle':
      g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8), 0x9bd8b0, 0, -0.04, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.12, 8), 0x9bd8b0, 0, 0.15, 0));
      break;
    case 'soup':
      g.add(mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.14, 12), 0xf5efe6));
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12), 0xf2a35e, 0, 0.065, 0));
      g.add(mesh(new THREE.SphereGeometry(0.035, 6, 5), 0x7bbf6a, 0.04, 0.09, 0.02));
      break;
    case 'herring':
      {
        const body = mesh(new THREE.SphereGeometry(0.2, 8, 6), 0xaebfcc);
        body.scale.set(1.3, 0.22, 0.5);
        g.add(body);
      }
      g.add(mesh(new THREE.ConeGeometry(0.1, 0.18, 4), 0x93a6b6, -0.28, 0, 0).rotateZ(Math.PI / 2));
      g.add(mesh(new THREE.SphereGeometry(0.025, 5, 4), 0x22232b, 0.2, 0.03, 0.05));
      break;
    case 'sign': {
      // a brass sign on a short post: a disk board with a shiny rim (the Clean Freak's pride and joy)
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8), 0x8a7a66));
      g.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 14), 0xf3d37a, 0, 0.35, 0).rotateX(Math.PI / 2));
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 14), 0xfff0b3, 0, 0.35, 0.01).rotateX(Math.PI / 2));
      break;
    }
    case 'buoy':
      g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 10), 0xffffff, 0, -0.1, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 10), 0xe9564b, 0, -0.04, 0));
      g.add(mesh(new THREE.ConeGeometry(0.3, 0.4, 10), 0xe9564b, 0, 0.25, 0));
      g.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), 0xffd36e, 0, 0.5, 0));
      break;
    case 'bin':
      g.add(mesh(new THREE.CylinderGeometry(0.45, 0.4, 1.0, 12), 0x9fd8c0));
      g.add(mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 12), 0x6fb99d, 0, 0.5, 0));
      break;
    case 'crate':
      g.add(mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), 0xe0b98a));
      g.add(mesh(new THREE.BoxGeometry(0.84, 0.1, 0.84), 0xc99a68, 0, 0.2, 0));
      g.add(mesh(new THREE.BoxGeometry(0.84, 0.1, 0.84), 0xc99a68, 0, -0.2, 0));
      break;
    case 'candy': {
      g.add(mesh(new THREE.BoxGeometry(0.2, 0.24, 0.1), 0xff9ec7));
      g.add(mesh(new THREE.BoxGeometry(0.205, 0.05, 0.105), 0xffffff, 0, 0.02, 0));
      g.add(mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), 0xff6fa8, 0, 0.14, 0));
      break;
    }
    case 'salmiakki': {
      g.add(mesh(new THREE.BoxGeometry(0.2, 0.24, 0.1), 0x2d2f3a));
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.105), 0xffffff, 0, 0.0, 0)).children[1].rotation.z = Math.PI / 4;
      g.add(mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), 0x15161c, 0, 0.14, 0));
      break;
    }
    case 'map': {
      g.add(mesh(new THREE.BoxGeometry(0.36, 0.03, 0.26), 0xfff1d6));
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.035, 0.1), 0x8fd3e8, -0.08, 0, 0.03));
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.036, 0.05), 0xe5484d, 0.1, 0, -0.04));
      break;
    }
    case 'toy': {
      const bear = new THREE.Group(); // a chunky teddy, twice the size of the other small props so it can be spotted
      bear.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), 0xc58b5a, 0, -0.03, 0)); // body
      bear.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), 0xc58b5a, 0, 0.16, 0)); // head
      bear.add(mesh(new THREE.SphereGeometry(0.05, 6, 5), 0xc58b5a, -0.09, 0.26, 0));
      bear.add(mesh(new THREE.SphereGeometry(0.05, 6, 5), 0xc58b5a, 0.09, 0.26, 0));
      bear.add(mesh(new THREE.SphereGeometry(0.05, 6, 5), 0xf2d3a8, 0, 0.14, -0.1)); // snout
      bear.add(mesh(new THREE.BoxGeometry(0.2, 0.05, 0.03), 0xe5484d, 0, 0.07, -0.1)); // bow tie
      bear.scale.setScalar(1.8);
      bear.position.y = -0.1;
      g.add(bear);
      // a red balloon on a string so the teddy shows from far away
      g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.0, 4), 0xffffff, 0.05, 0.55, 0));
      g.add(mesh(new THREE.SphereGeometry(0.28, 10, 8), 0xff4d6d, 0.05, 1.2, 0));
      break;
    }
    case 'flowers': {
      g.add(mesh(new THREE.ConeGeometry(0.1, 0.22, 8), 0xfff1d6, 0, -0.1, 0)); // paper cone
      for (const [x, z, c] of [[0, 0, 0xff6fa8], [-0.07, 0.03, 0xffd23f], [0.07, 0.03, 0xff9ec7], [0, -0.07, 0xc9a7f0]] as [number, number, number][]) g.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), c, x, 0.1, z));
      break;
    }
    case 'chair':
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), 0xc9b8e8, 0, 0, 0));
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.45, 0.05), 0xc9b8e8, 0, 0.25, 0.22));
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), 0xa896cc, x, -0.23, z));
      break;
  }
}

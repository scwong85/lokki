import * as THREE from 'three';
import { palette } from '../render/palette';
import type { Box } from './collision';
import type { Target } from '../gameplay/targets';
import { createTargetMeshes } from './targetMeshes';

const box = (
  min: [number, number, number],
  max: [number, number, number],
  kind: Box['kind'],
  color: number,
): Box => ({ min, max, kind, color });

const ORANGE = 0xffb27a;

/** Greybox flight course around the origin (courtyard). Everything in metres. */
export function buildCourse() {
  const boxes: Box[] = [
    // buildings around the courtyard (flat roofs are landable)
    box([-20, 0, -38], [20, 20, -26], 'building', palette.cream), // north block
    box([-38, 0, -20], [-26, 14, 20], 'building', palette.peach), // west block
    box([-20, 0, 26], [-8, 26, 38], 'building', palette.lilac), // south tower
    box([8, 0, 26], [22, 9, 38], 'building', palette.mint), // south low block
    // perches: chimneys, ledges, lamp posts
    box([-12.3, 20, -32.3], [-11.7, 23, -31.7], 'perch', palette.terracotta),
    box([8, 20, -32.3], [8.6, 22.5, -31.7], 'perch', palette.terracotta),
    box([-26, 8.6, -6], [-24.8, 9, 2], 'perch', palette.terracotta), // ledge on west block
    box([-26, 10.6, 6], [-24.8, 11, 14], 'perch', palette.terracotta),
    box([-6, 13.6, -26], [6, 14, -24.8], 'perch', palette.terracotta), // ledge on north block
    box([10, 0, -10.2], [10.4, 5, -9.8], 'perch', palette.terracotta), // lamp posts
    box([-10, 0, 8], [-9.6, 4, 8.4], 'perch', palette.terracotta),
  ];

  // The "market": two rows of orange stalls (counter + awning).
  for (const z of [-8, 8]) {
    for (const x of [36, 44, 52, 60]) {
      boxes.push(box([x - 2, 0, z - 1.5], [x + 2, 1.2, z + 1.5], 'prop', ORANGE));
      boxes.push(box([x - 2.3, 2.6, z - 1.8], [x + 2.3, 2.9, z + 1.8], 'prop', ORANGE));
    }
  }

  const targets: Target[] = [
    // ice-cream cones in the market aisle and on counters
    ...[40, 48, 56, 64].map((x) => ({ x, y: 0.9, z: 0, radius: 0.6, cooldown: 0 })),
    { x: 44, y: 1.7, z: -8, radius: 0.5, cooldown: 0 },
    { x: 52, y: 1.7, z: 8, radius: 0.5, cooldown: 0 },
    // rooftops
    { x: 0, y: 20.8, z: -32, radius: 0.6, cooldown: 0 },
    { x: -14, y: 26.8, z: 32, radius: 0.6, cooldown: 0 },
    { x: 15, y: 9.8, z: 32, radius: 0.6, cooldown: 0 },
    // courtyard
    { x: 0, y: 0.9, z: 14, radius: 0.6, cooldown: 0 },
  ];
  return { boxes, targets, start: { x: 0, z: 0 } };
}

export interface CourseVisuals {
  group: THREE.Group;
  targetMeshes: THREE.Object3D[];
}

export function buildCourseVisuals(boxes: readonly Box[], targets: readonly Target[]): CourseVisuals {
  const group = new THREE.Group();
  const mats = new Map<number, THREE.MeshLambertMaterial>();
  const mat = (c: number) => {
    let m = mats.get(c);
    if (!m) mats.set(c, (m = new THREE.MeshLambertMaterial({ color: c, flatShading: true })));
    return m;
  };
  for (const b of boxes) {
    const sx = b.max[0] - b.min[0];
    const sy = b.max[1] - b.min[1];
    const sz = b.max[2] - b.min[2];
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(b.color));
    m.position.set(b.min[0] + sx / 2, b.min[1] + sy / 2, b.min[2] + sz / 2);
    group.add(m);
  }

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 600),
    new THREE.MeshLambertMaterial({ color: palette.water, flatShading: true }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(230, 0.05, 0);
  group.add(water);

  const targetMeshes = createTargetMeshes(targets, group);
  return { group, targetMeshes };
}

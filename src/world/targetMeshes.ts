import * as THREE from 'three';
import type { Target } from '../gameplay/targets';

const scoopMat = new THREE.MeshLambertMaterial({ color: 0xff8fab, flatShading: true });
const coneMat = new THREE.MeshLambertMaterial({ color: 0xf2c28b, flatShading: true });
const pillarMat = new THREE.MeshBasicMaterial({ color: 0xff8fab, transparent: true, opacity: 0.35 });

/** Ice-cream target meshes (with a faint light pillar so they can be spotted from the air). */
export function createTargetMeshes(targets: readonly Target[], parent: THREE.Object3D): THREE.Object3D[] {
  return targets.map((t) => {
    const g = new THREE.Group();
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(t.radius, 10, 8), scoopMat);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.radius * 0.7, t.radius * 1.6, 8), coneMat);
    cone.rotation.x = Math.PI;
    cone.position.y = -t.radius * 1.1;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8, 6), pillarMat);
    pillar.position.y = 4.5;
    g.add(scoop, cone, pillar);
    g.position.set(t.x, t.y, t.z);
    parent.add(g);
    return g;
  });
}

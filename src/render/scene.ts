import * as THREE from 'three';
import { palette } from './palette';
import { tuning } from '../core/tuning';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.fog); // the sky dome (render/sky.ts) draws over this
  scene.fog = new THREE.Fog(palette.fog, tuning.render.fogNear.value, tuning.render.fogFar.value);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xf3e6dc, tuning.render.hemi.value);
  hemi.name = 'hemi';
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(palette.sun, tuning.render.sun.value);
  sun.name = 'sun';
  sun.position.set(30, 50, 20);
  scene.add(sun);

  return scene;
}

/** Big flat plane at y=0 (used by the greybox course; the city brings its own water and land). */
export function addGroundPlane(scene: THREE.Scene, color: number): void {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshLambertMaterial({ color, flatShading: true }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
}

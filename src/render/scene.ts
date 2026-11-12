import * as THREE from 'three';
import { palette } from './palette';
import { tuning } from '../core/tuning';

function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#' + palette.skyTop.toString(16).padStart(6, '0'));
  grad.addColorStop(1, '#' + palette.skyHorizon.toString(16).padStart(6, '0'));
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(palette.fog, tuning.render.fogNear.value, tuning.render.fogFar.value);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xf3e6dc, 2.2));
  const sun = new THREE.DirectionalLight(palette.sun, 1.2);
  sun.position.set(30, 50, 20);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshLambertMaterial({ color: palette.ground, flatShading: true }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  return scene;
}

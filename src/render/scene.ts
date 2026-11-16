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

function nightTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1b2140');
  grad.addColorStop(0.7, '#4a4f7a');
  grad.addColorStop(1, '#c78a9a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Dusk or day: the sky, the fog and how bright the lights are. */
export function setNight(scene: THREE.Scene, on: boolean): void {
  const store = scene.userData as { day?: THREE.Texture; night?: THREE.Texture };
  store.day ??= scene.background as THREE.Texture;
  store.night ??= nightTexture();
  scene.background = on ? store.night : store.day;
  if (scene.fog) (scene.fog as THREE.Fog).color.setHex(on ? 0x4a4f7a : palette.fog);
  const k = on ? tuning.render.nightLight.value : 1;
  const hemi = scene.getObjectByName('hemi') as THREE.HemisphereLight | undefined;
  const sun = scene.getObjectByName('sun') as THREE.DirectionalLight | undefined;
  if (hemi) hemi.intensity = tuning.render.hemi.value * k;
  if (sun) {
    sun.intensity = tuning.render.sun.value * k;
    sun.color.setHex(on ? 0xffc9a0 : palette.sun);
  }
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = skyTexture();
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

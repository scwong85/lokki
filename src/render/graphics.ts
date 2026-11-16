import * as THREE from 'three';
import { tuning } from '../core/tuning';

export type GraphicsLevel = 'low' | 'high';

/** Snap a value to a grid (keeps the shadow map from shimmering while the camera moves). */
export const snap = (v: number, step: number): number => Math.round(v / step) * step;

/**
 * Lights and the quality preset. High: one soft shadow map that follows the player, full pixel ratio.
 * Low: no shadow map (the blob shadows remain), pixel ratio 1.
 */
export class Graphics {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  level: GraphicsLevel = 'high';
  /** Pixel ratio on the low preset (1 on desktop; phones get a little more so text and edges stay readable). */
  lowPixelRatio = 1;
  private sunDir = new THREE.Vector3(30, 50, 20).normalize();
  /** The sky (if any) says how bright the lights are and where the sun is. */
  sky: { light: number; sunDir: THREE.Vector3 } | null = null;

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene) {
    this.hemi = scene.getObjectByName('hemi') as THREE.HemisphereLight;
    this.sun = scene.getObjectByName('sun') as THREE.DirectionalLight;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const s = this.sun.shadow;
    s.mapSize.set(2048, 2048);
    s.bias = -0.0004;
    s.normalBias = 0.04;
    scene.add(this.sun.target);
  }

  apply(level: GraphicsLevel): void {
    this.level = level;
    const high = level === 'high';
    this.renderer.setPixelRatio(high ? Math.min(devicePixelRatio, 2) : this.lowPixelRatio);
    this.renderer.shadowMap.enabled = high;
    this.sun.castShadow = high;
    // materials compile differently with / without shadows
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true;
    });
  }

  /** Per frame: light levels from tuning, and the shadow box centred on the player. */
  update(focus: THREE.Vector3): void {
    const r = tuning.render;
    this.renderer.toneMappingExposure = r.exposure.value;
    const k = this.sky?.light ?? 1;
    this.hemi.intensity = r.hemi.value * k;
    this.sun.intensity = r.sun.value * k;
    if (this.sky) this.sunDir.copy(this.sky.sunDir);
    if (!this.sun.castShadow) return;
    const ext = r.shadowArea.value;
    const cam = this.sun.shadow.camera;
    if (cam.right !== ext) {
      cam.left = -ext;
      cam.right = ext;
      cam.top = ext;
      cam.bottom = -ext;
      cam.near = 1;
      cam.far = 400;
      cam.updateProjectionMatrix();
    }
    const step = (ext * 2) / this.sun.shadow.mapSize.x;
    const tx = snap(focus.x, step), tz = snap(focus.z, step);
    this.sun.target.position.set(tx, 0, tz);
    this.sun.position.set(tx + this.sunDir.x * 150, this.sunDir.y * 150, tz + this.sunDir.z * 150);
  }
}

/** Mark meshes in a subtree as shadow casters / receivers. */
export function shadows(o: THREE.Object3D, cast: boolean, receive: boolean): void {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = cast;
      c.receiveShadow = receive;
    }
  });
}

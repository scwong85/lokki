import * as THREE from 'three';
import { tuning } from '../core/tuning';

/** Third-person chase camera with positional lag. Yaw/pitch driven by mouse. */
export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 0.25;
  private pos = new THREE.Vector3(0, 4, 8);
  private look = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(tuning.camera.fov.value, aspect, 0.1, 1000);
  }

  rotate(dx: number, dy: number): void {
    const s = tuning.camera.mouseSensitivity.value;
    this.yaw -= dx * s;
    this.pitch = Math.min(1.2, Math.max(-0.3, this.pitch + dy * s));
  }

  update(target: THREE.Vector3, frameDt: number): void {
    const t = tuning.camera;
    const d = t.distance.value;
    const desired = new THREE.Vector3(
      target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * d,
      target.y + t.height.value + Math.sin(this.pitch) * d,
      target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * d,
    );
    const k = 1 - Math.exp(-t.lag.value * frameDt);
    this.pos.lerp(desired, k);
    this.look.lerp(target, Math.min(1, k * 1.5));
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
    if (this.camera.fov !== t.fov.value) {
      this.camera.fov = t.fov.value;
      this.camera.updateProjectionMatrix();
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

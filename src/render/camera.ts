import * as THREE from 'three';
import { tuning } from '../core/tuning';
import { comfort } from '../core/comfort';

export interface CameraTargetInfo {
  vx: number;
  vy: number;
  vz: number;
  diving: boolean;
  turnRate: number;
}

/** Third-person chase camera: positional lag, look-ahead, dive-only FOV kick, damped roll. */
export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 0.25;
  private pos = new THREE.Vector3(0, 4, 8);
  private look = new THREE.Vector3();
  private fovKick = 0;
  private roll = 0;
  private shakeT = 0;
  private time = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(tuning.camera.fov.value, aspect, 0.3, 1500);
  }

  /** Kick the camera (0..1). Strength decays on its own; the options slider scales or disables it. */
  shake(strength: number): void {
    this.shakeT = Math.min(1, Math.max(this.shakeT, strength));
  }

  rotate(dx: number, dy: number): void {
    const s = tuning.camera.mouseSensitivity.value;
    this.yaw -= dx * s;
    this.pitch = Math.min(1.2, Math.max(-0.3, this.pitch + dy * s));
  }

  update(target: THREE.Vector3, frameDt: number, info: CameraTargetInfo): void {
    const t = tuning.camera;
    const d = t.distance.value;
    const desired = new THREE.Vector3(
      target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * d,
      target.y + t.height.value + Math.sin(this.pitch) * d,
      target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * d,
    );
    const k = 1 - Math.exp(-t.lag.value * frameDt);
    this.pos.lerp(desired, k);
    this.pos.y = Math.max(this.pos.y, t.minHeight.value);

    const ahead = new THREE.Vector3(info.vx, info.vy * 0.5, info.vz).multiplyScalar(t.lookAhead.value * comfort.mods.lookAhead);
    this.look.lerp(target.clone().add(ahead), Math.min(1, k * 1.5));

    this.fovKick += ((info.diving ? t.diveFovKick.value * comfort.mods.fovKick : 0) - this.fovKick) * (1 - Math.exp(-t.fovSmooth.value * frameDt));
    const rollTarget = Math.max(-0.35, Math.min(0.35, -info.turnRate * t.rollAmount.value * comfort.mods.roll));
    this.roll += (rollTarget - this.roll) * (1 - Math.exp(-t.rollSmooth.value * frameDt));

    this.time += frameDt;
    this.shakeT = Math.max(0, this.shakeT - frameDt * tuning.juice.shakeDecay.value * this.shakeT - frameDt * 0.05);
    const amp = this.shakeT * this.shakeT * tuning.juice.shake.value * tuning.juice.shakeAmount.value * comfort.mods.shake;
    this.camera.position.copy(this.pos);
    if (amp > 0.0005) this.camera.position.add(new THREE.Vector3(Math.sin(this.time * 61) * amp, Math.sin(this.time * 47 + 1) * amp, Math.sin(this.time * 53 + 2) * amp));
    this.camera.lookAt(this.look);
    this.camera.rotateZ(this.roll);
    const fov = t.fov.value + this.fovKick;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Take the camera over (a cutscene): ease towards `pos`/`look` (k = 1 jumps there); no roll, no shake. */
  cinematic(pos: { x: number; y: number; z: number }, look: { x: number; y: number; z: number }, k: number): void {
    this.pos.lerp(new THREE.Vector3(pos.x, pos.y, pos.z), k);
    this.look.lerp(new THREE.Vector3(look.x, look.y, look.z), k);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
    const fov = tuning.camera.fov.value;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

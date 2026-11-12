import * as THREE from 'three';
import { palette } from '../render/palette';
import { stepMotion, type Motion } from './movement';

/** M0 placeholder: capsule "gull". Real procedural model arrives in M2. */
export class Gull {
  readonly mesh: THREE.Group;
  private motion: Motion = { x: 0, z: 0, vx: 0, vz: 0, heading: 0 };
  private prev = { x: 0, z: 0, heading: 0 };
  readonly position = new THREE.Vector3(0, 0.8, 0);

  constructor() {
    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
      new THREE.MeshLambertMaterial({ color: palette.gull, flatShading: true }),
    );
    body.rotation.x = Math.PI / 2; // lie along Z
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.35, 6),
      new THREE.MeshLambertMaterial({ color: palette.gullBeak, flatShading: true }),
    );
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.1, -0.85);
    this.mesh.add(body, beak);
    this.position.y = 0.8;
    this.mesh.position.copy(this.position);
  }

  update(ax: number, ay: number, camYaw: number, dt: number): void {
    this.prev = { x: this.motion.x, z: this.motion.z, heading: this.motion.heading };
    stepMotion(this.motion, ax, ay, camYaw, dt);
  }

  /** Interpolate between last two sim states for smooth rendering. */
  applyInterpolation(alpha: number): void {
    const m = this.motion;
    this.position.set(
      this.prev.x + (m.x - this.prev.x) * alpha,
      0.8,
      this.prev.z + (m.z - this.prev.z) * alpha,
    );
    const dh = Math.atan2(Math.sin(m.heading - this.prev.heading), Math.cos(m.heading - this.prev.heading));
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.prev.heading + dh * alpha;
  }
}

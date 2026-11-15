import * as THREE from 'three';

/** The mark over a locked target: a pulsing ring and a diamond that always face the camera. */
export class LockMarker {
  readonly group = new THREE.Group();
  private ring: THREE.Mesh;
  private diamond: THREE.Mesh;

  constructor() {
    const mat = () => new THREE.MeshBasicMaterial({ color: 0xff9d2e, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 28), mat());
    this.diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat());
    this.diamond.position.y = 1.5;
    for (const m of [this.ring, this.diamond]) m.renderOrder = 13;
    this.group.add(this.ring, this.diamond);
    this.group.visible = false;
  }

  /** `at` is the target (null = nothing locked); `size` its radius; `camera` to face. */
  update(at: { x: number; y: number; z: number } | null, size: number, camera: THREE.Camera, time: number, distance: number): void {
    this.group.visible = at !== null;
    if (!at) return;
    this.group.position.set(at.x, at.y + 0.2, at.z);
    // keep it readable from far away: grows with distance
    const k = Math.max(1, distance / 18) * (1 + Math.sin(time * 7) * 0.06);
    this.group.scale.setScalar(Math.max(size * 1.6, 0.9) * k);
    this.ring.quaternion.copy(camera.quaternion);
    this.diamond.quaternion.copy(camera.quaternion);
    this.diamond.position.y = 1.5 + Math.sin(time * 4) * 0.12;
  }
}

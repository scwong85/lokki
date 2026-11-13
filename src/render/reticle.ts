import * as THREE from 'three';

/** Flat ring that marks where a poop would land. */
export class Reticle {
  readonly mesh: THREE.Mesh;

  constructor(private color = 0xb08968) {
    this.mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.7, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide }),
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = 11;
    this.mesh.visible = false;
  }

  update(at: { x: number; y: number; z: number } | null, blocked = false): void {
    this.mesh.visible = at !== null;
    if (at) this.mesh.position.set(at.x, at.y + 0.08, at.z);
    (this.mesh.material as THREE.MeshBasicMaterial).color.setHex(blocked ? 0xe5484d : this.color);
  }
}

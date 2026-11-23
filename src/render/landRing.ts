import * as THREE from 'three';

/** The "land here" ring (M122): on the spot a gull could land on (white), green while it is flying the arc onto it. */
export class LandRing {
  readonly group = new THREE.Group();
  private ring: THREE.Mesh;
  private pulse: THREE.Mesh;

  constructor() {
    const mk = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 28), mk());
    this.pulse = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 28), mk());
    for (const m of [this.ring, this.pulse]) {
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 10;
      this.group.add(m);
    }
    this.group.visible = false;
  }

  /** `spot`: where it would land (null hides the ring); `committed`: the arc is being flown. */
  update(spot: { x: number; y: number; z: number } | null, committed: boolean, time: number): void {
    this.group.visible = !!spot;
    if (!spot) return;
    this.group.position.set(spot.x, spot.y + 0.07, spot.z);
    const color = committed ? 0x7be08f : 0xffffff;
    const k = 1 + Math.sin(time * 6) * (committed ? 0.1 : 0.06);
    this.ring.scale.setScalar(k);
    this.pulse.scale.setScalar(committed ? 1.4 + Math.sin(time * 10) * 0.3 : 0.8);
    for (const m of [this.ring, this.pulse]) {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.setHex(color);
      mat.opacity = committed ? 0.95 : 0.65;
    }
  }
}

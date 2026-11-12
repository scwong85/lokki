import * as THREE from 'three';

/** Aim aid: a ring where the dive would land plus a line from the gull. Pink when a target is in the assist cone. */
export class DiveMarker {
  readonly group = new THREE.Group();
  private ring: THREE.Mesh;
  private line: THREE.Line;
  private linePos: THREE.BufferAttribute;

  constructor() {
    const mk = () =>
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 24), mk());
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 10;
    const geo = new THREE.BufferGeometry();
    this.linePos = new THREE.BufferAttribute(new Float32Array(6), 3);
    geo.setAttribute('position', this.linePos);
    this.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthTest: false }));
    this.line.frustumCulled = false;
    this.line.renderOrder = 10;
    this.group.add(this.ring, this.line);
    this.group.visible = false;
  }

  update(
    from: { x: number; y: number; z: number } | null,
    hit: { x: number; y: number; z: number } | null,
    locked: boolean,
    diving: boolean,
  ): void {
    this.group.visible = !!(from && hit);
    if (!from || !hit) return;
    this.ring.position.set(hit.x, hit.y + 0.06, hit.z);
    const color = locked ? 0xff5c8a : 0xffffff;
    (this.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = diving ? 0.95 : 0.6;
    (this.line.material as THREE.LineBasicMaterial).color.setHex(color);
    this.linePos.setXYZ(0, from.x, from.y, from.z);
    this.linePos.setXYZ(1, hit.x, hit.y, hit.z);
    this.linePos.needsUpdate = true;
  }
}

import * as THREE from 'three';
import { tuning } from '../core/tuning';

/** Ring-buffer pool of splat decals: the oldest one is recycled when the pool is full. */
export class DecalPool {
  readonly group = new THREE.Group();
  private pool: THREE.Mesh[] = [];
  private next = 0;
  private seed = 7;

  constructor(capacity = 300) {
    const geo = new THREE.CircleGeometry(0.5, 10);
    // irregular outline: jitter the rim vertices once
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 1; i < pos.count; i++) {
      const k = 0.7 + this.rnd() * 0.5;
      pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0xfbfaf4, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6, depthWrite: false });
    for (let i = 0; i < capacity; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      this.pool.push(m);
      this.group.add(m);
    }
  }

  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 2 ** 32;
  }

  /** Index of the slot the next decal will use (exposed for tests). */
  static slot(counter: number, active: number): number {
    return counter % Math.max(1, active);
  }

  add(p: { x: number; y: number; z: number }, n: { x: number; y: number; z: number }, size = tuning.poop.splatSize.value): void {
    const active = Math.min(this.pool.length, Math.round(tuning.poop.maxDecals.value));
    const m = this.pool[DecalPool.slot(this.next++, active)];
    const normal = new THREE.Vector3(n.x, n.y, n.z);
    m.position.set(p.x + n.x * 0.04, p.y + n.y * 0.04, p.z + n.z * 0.04);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    m.rotateZ(this.rnd() * Math.PI * 2);
    m.scale.setScalar(size * (0.7 + this.rnd() * 0.6));
    m.visible = true;
  }

  clear(): void {
    for (const m of this.pool) m.visible = false;
  }
}

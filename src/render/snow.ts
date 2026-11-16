import * as THREE from 'three';
import { tuning } from '../core/tuning';

/** A light snowfall around the camera (winter levels): a cloud of small white points that drift down and wrap around. */
export class Snow {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private n = 0;

  constructor() {
    const max = 600;
    this.pos = new Float32Array(max * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.85, depthWrite: false }));
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.seed();
  }

  private seed(): void {
    for (let i = 0; i < this.pos.length / 3; i++) {
      this.pos[i * 3] = (Math.random() - 0.5) * 70;
      this.pos[i * 3 + 1] = Math.random() * 30;
      this.pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
  }

  set on(v: boolean) {
    this.points.visible = v;
  }

  /** Move the flakes down (and sideways a little) and keep the cloud around `at`. */
  update(dt: number, at: { x: number; y: number; z: number }, time: number): void {
    if (!this.points.visible) return;
    this.n = Math.min(this.pos.length / 3, Math.round(tuning.winter.snowCount.value));
    this.points.geometry.setDrawRange(0, this.n);
    for (let i = 0; i < this.n; i++) {
      let x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
      y -= (1.6 + (i % 5) * 0.25) * dt;
      x += Math.sin(time * 0.7 + i) * 0.4 * dt;
      if (y < 0) y += 30;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
    }
    this.points.position.set(Math.round(at.x / 35) * 35, 0, Math.round(at.z / 35) * 35); // the cloud hops with the gull in big steps so flakes do not slide
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

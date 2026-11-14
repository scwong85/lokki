import * as THREE from 'three';
import { tuning } from '../core/tuning';
import { mergeColored } from './mergeMesh';

/** Position of decoy gull i of n, t seconds after the call: flies out from the caller, then circles the target. */
export function flockPosition(i: number, n: number, t: number, from: { x: number; y: number; z: number }, target: { x: number; z: number }): { x: number; y: number; z: number } {
  const phase = (i / n) * Math.PI * 2;
  const radius = 5 + (i % 2) * 2.5;
  const height = 7 + (i % 3) * 1.2;
  const ang = phase + t * 1.6;
  const circle = { x: target.x + Math.cos(ang) * radius, y: height, z: target.z + Math.sin(ang) * radius };
  const k = Math.min(1, t / 1.2); // fly out over the first 1.2 s
  const e = k * k * (3 - 2 * k);
  return { x: from.x + (circle.x - from.x) * e, y: from.y + (circle.y - from.y) * e, z: from.z + (circle.z - from.z) * e };
}

function birdMesh(): THREE.Mesh {
  const parts = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const grey = new THREE.MeshLambertMaterial({ color: 0xc4cfdb, flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), white);
  body.scale.set(0.7, 0.6, 1.3);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.45), grey);
  wingL.position.set(-0.6, 0.1, 0);
  const wingR = wingL.clone();
  wingR.position.x = 0.6;
  parts.add(body, wingL, wingR);
  return mergeColored(parts);
}

/** A few decoy gulls that fly to a spot ahead and make a racket there (one draw call each). */
export class FlockSystem {
  readonly group = new THREE.Group();
  private birds: THREE.Mesh[] = [];
  private t = -1;
  private nextNoise = 0;
  private ticks = 0;
  private drops: { x: number; y: number; z: number }[] = [];
  private from = { x: 0, y: 0, z: 0 };
  private target = { x: 0, z: 0 };

  constructor(parent: THREE.Object3D, max = 8) {
    for (let i = 0; i < max; i++) {
      const b = birdMesh();
      b.visible = false;
      this.group.add(b);
      this.birds.push(b);
    }
    parent.add(this.group);
  }

  get active(): boolean {
    return this.t >= 0;
  }

  start(from: { x: number; y: number; z: number }, target: { x: number; z: number }): void {
    this.from = { ...from };
    this.target = { ...target };
    this.t = 0;
    this.nextNoise = 1.0;
    this.ticks = 0;
    this.drops = [];
  }

  /** Where the decoy gulls let go of a dropping since the last call. */
  takeDrops(): { x: number; y: number; z: number }[] {
    const d = this.drops;
    this.drops = [];
    return d;
  }

  /** Advance; returns the places that are noisy this step (every ~0.7 s once the birds have arrived). */
  update(dt: number): { x: number; z: number }[] {
    if (this.t < 0) return [];
    this.t += dt;
    const n = Math.min(this.birds.length, Math.round(tuning.skills.flockCount.value));
    const life = 1.2 + tuning.skills.flockTime.value;
    this.birds.forEach((b, i) => {
      b.visible = i < n && this.t < life;
      if (!b.visible) return;
      const p = flockPosition(i, n, this.t, this.from, this.target);
      const q = flockPosition(i, n, this.t + 0.05, this.from, this.target);
      b.position.set(p.x, p.y, p.z);
      b.rotation.y = Math.atan2(-(q.x - p.x), -(q.z - p.z));
      b.rotation.z = Math.sin(this.t * 9 + i) * 0.35; // flapping sway
    });
    const out: { x: number; z: number }[] = [];
    if (this.t >= this.nextNoise && this.t < life) {
      out.push({ ...this.target });
      this.nextNoise += 0.7;
      this.ticks++;
      this.birds.forEach((b, i) => {
        if (b.visible && (this.ticks + i) % 2 === 0) this.drops.push({ x: b.position.x, y: b.position.y, z: b.position.z });
      });
    }
    if (this.t >= life) this.t = -1;
    return out;
  }

  clear(): void {
    this.t = -1;
    this.drops = [];
    for (const b of this.birds) b.visible = false;
  }
}

/** Expanding rings that show where a crow call or flock call is heard. */
export class PingFx {
  readonly group = new THREE.Group();
  private items: { mesh: THREE.Mesh; t: number }[] = [];

  constructor(parent: THREE.Object3D, max = 6) {
    for (let i = 0; i < max; i++) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false, side: THREE.DoubleSide }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 10;
      this.group.add(mesh);
      this.items.push({ mesh, t: -1 });
    }
    parent.add(this.group);
  }

  add(x: number, z: number): void {
    const it = this.items.find((i) => i.t < 0) ?? this.items[0];
    it.t = 0;
    it.mesh.position.set(x, 0.3, z);
    it.mesh.visible = true;
  }

  update(dt: number): void {
    for (const it of this.items) {
      if (it.t < 0) continue;
      it.t += dt;
      const k = it.t / 1.2;
      it.mesh.scale.setScalar(1 + k * 12);
      (it.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - k));
      if (k >= 1) {
        it.t = -1;
        it.mesh.visible = false;
      }
    }
  }
}

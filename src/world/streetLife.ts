import * as THREE from 'three';
import { createRng, type Rng } from '../core/rng';
import { tuning } from '../core/tuning';
import { newWalker, stepWalker, type Walker } from '../gameplay/streetLife';
import { mergeColored } from '../render/mergeMesh';
import { NpcModel } from './npcModel';

const COATS = [0x6ab7ff, 0xff9ec4, 0xffd36e, 0x9fd18f, 0xc7b5e0, 0xf29e7a, 0xeeeeee, 0x7fd1ae];
const BIKE_COLOURS = [0xff9ec4, 0x6ab7ff, 0xffd36e, 0x9fd18f];

const part = (g: THREE.BufferGeometry, c: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
};

/** A cyclist from primitives: bike with two spinning wheels, a leaning rider and a helmet. */
class Cyclist {
  readonly root = new THREE.Group();
  private wheels: THREE.Object3D[] = [];

  constructor(colour: number, coat: number) {
    const frame = new THREE.Group();
    frame.add(part(new THREE.BoxGeometry(0.05, 0.05, 0.95), colour, 0, 0.62, 0));
    frame.add(part(new THREE.BoxGeometry(0.05, 0.45, 0.05), colour, 0, 0.45, 0.15, -0.35));
    frame.add(part(new THREE.BoxGeometry(0.05, 0.5, 0.05), colour, 0, 0.62, -0.42, 0.3));
    frame.add(part(new THREE.BoxGeometry(0.5, 0.04, 0.04), 0x3a3f4a, 0, 0.9, -0.48));
    const rider = new THREE.Group();
    rider.add(part(new THREE.BoxGeometry(0.34, 0.5, 0.2), coat, 0, 1.2, 0.02, -0.55));
    rider.add(part(new THREE.SphereGeometry(0.13, 8, 6), 0xf2c9a8, 0, 1.58, -0.17));
    rider.add(part(new THREE.SphereGeometry(0.15, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0xff6b6b, 0, 1.6, -0.17));
    rider.add(part(new THREE.BoxGeometry(0.1, 0.5, 0.1), 0x3f4656, 0.11, 0.72, 0.1, 0.4));
    rider.add(part(new THREE.BoxGeometry(0.1, 0.5, 0.1), 0x3f4656, -0.11, 0.72, 0.1, 0.4));
    rider.add(part(new THREE.BoxGeometry(0.08, 0.5, 0.08), coat, 0.18, 1.2, -0.3, -1.2));
    rider.add(part(new THREE.BoxGeometry(0.08, 0.5, 0.08), coat, -0.18, 1.2, -0.3, -1.2));
    this.root.add(mergeColored(frame), mergeColored(rider));
    for (const z of [-0.5, 0.5]) {
      const w = new THREE.Group();
      w.position.set(0, 0.34, z);
      w.add(part(new THREE.TorusGeometry(0.32, 0.035, 4, 12), 0x3a3f4a, 0, 0, 0, 0, Math.PI / 2));
      w.add(part(new THREE.BoxGeometry(0.02, 0.6, 0.02), 0x9aa1b3));
      this.root.add(w);
      this.wheels.push(w);
    }
    this.root.traverse((c) => (c.castShadow = false));
  }

  apply(w: Walker): void {
    this.root.position.set(w.x, 0, w.z);
    this.root.rotation.y = w.heading + Math.PI; // the model faces +z, headings face -z
    for (const wheel of this.wheels) wheel.rotation.x = w.phase;
  }
}

/** Pedestrians and cyclists wandering the streets (the "streets feel empty" fix). Cosmetic: no senses, no gameplay. */
export class StreetLife {
  private walkers: Walker[] = [];
  private people = new Map<number, NpcModel>();
  private bikes = new Map<number, Cyclist>();
  private rng: Rng;
  private ctx: { walkable: (x: number, z: number) => boolean; rng: Rng };
  readonly group = new THREE.Group();

  constructor(parent: THREE.Object3D, walkable: (x: number, z: number) => boolean, keepClear: readonly { x: number; z: number; r: number }[], people: number, cyclists: number, seed = 4321) {
    this.rng = createRng(seed);
    this.ctx = { walkable, rng: this.rng };
    parent.add(this.group);
    const free = (x: number, z: number) => walkable(x, z) && keepClear.every((k) => Math.hypot(x - k.x, z - k.z) > k.r);
    const spawn = (kind: Walker['kind'], id: number): void => {
      for (let i = 0; i < 80; i++) {
        const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(25, 250);
        const x = Math.cos(a) * d, z = Math.sin(a) * d - 12;
        if (!free(x, z)) continue;
        this.walkers.push(newWalker(id, kind, x, z, this.rng));
        return;
      }
    };
    for (let i = 0; i < people; i++) spawn('walk', i);
    for (let i = 0; i < cyclists; i++) spawn('bike', 1000 + i);
    for (const w of this.walkers) {
      if (w.kind === 'walk') {
        const m = new NpcModel(this.rng.pick(COATS), w.id + 500);
        this.people.set(w.id, m);
        this.group.add(m.root);
      } else {
        const b = new Cyclist(this.rng.pick(BIKE_COLOURS), this.rng.pick(COATS));
        this.bikes.set(w.id, b);
        this.group.add(b.root);
      }
    }
  }

  get count(): number {
    return this.walkers.length;
  }

  /** Walk everyone near the gull (far ones just stand still: nobody sees them). */
  update(dt: number, near: { x: number; z: number }): void {
    const cull = tuning.street.cull.value;
    for (const w of this.walkers) if (Math.hypot(w.x - near.x, w.z - near.z) < cull) stepWalker(w, dt, this.ctx);
  }

  render(time: number, near: { x: number; z: number }): void {
    const cull = tuning.street.cull.value;
    for (const w of this.walkers) {
      const visible = Math.hypot(w.x - near.x, w.z - near.z) < cull * 1.1;
      const person = this.people.get(w.id), bike = this.bikes.get(w.id);
      if (person) {
        person.root.visible = visible;
        if (visible) person.applyView({ x: w.x, z: w.z, heading: w.heading, mode: w.moving ? 'walk' : 'idle', moving: w.moving, walkPhase: w.phase, t: 0, holding: false, distracted: false }, time);
      }
      if (bike) {
        bike.root.visible = visible;
        if (visible) bike.apply(w);
      }
    }
  }
}

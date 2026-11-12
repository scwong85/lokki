import * as THREE from 'three';
import { palette } from '../render/palette';
import type { Pose } from './pose';

const mat = (color: number) => new THREE.MeshLambertMaterial({ color, flatShading: true });

/** Chunky low-poly seagull built from primitives. Faces -Z. Driven by a Pose. */
export class GullModel {
  readonly root = new THREE.Group();
  private shoulders: THREE.Group[] = [];
  private elbows: THREE.Group[] = [];
  private legs: THREE.Group[] = [];
  private head = new THREE.Group();
  private lowerBeak = new THREE.Group();
  private cur = { flap: 0, fold: 1, sweep: 0.5, legTuck: 0, headRoll: 0, headPitch: 0, beakOpen: 0 };

  constructor() {
    const white = mat(palette.gull);
    const grey = mat(palette.gullGrey);
    const black = mat(palette.gullBlack);
    const orange = mat(palette.gullBeak);
    const legMat = mat(palette.gullLegs);

    // body + tail
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), white);
    body.scale.set(0.62, 0.58, 1.15);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.4), white);
    tail.position.set(0, 0.02, 0.72);
    tail.rotation.x = -0.15;
    this.root.add(body, tail);

    // head: sphere, eyes, upper + lower beak (lower pivots to open)
    this.head.position.set(0, 0.3, -0.62);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), white);
    this.head.add(skull);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mat(palette.gullEye));
      eye.position.set(side * 0.13, 0.04, -0.12);
      this.head.add(eye);
    }
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.34), orange);
    upper.position.set(0, -0.02, -0.34);
    const hook = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 5), mat(0xe8613c));
    hook.rotation.x = Math.PI;
    hook.position.set(0, -0.06, -0.49);
    this.lowerBeak.position.set(0, -0.05, -0.2); // pivot at the mouth corner
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.04, 0.28), orange);
    lower.position.set(0, 0, -0.14);
    this.lowerBeak.add(lower);
    this.head.add(upper, hook, this.lowerBeak);
    this.root.add(this.head);

    // wings: shoulder -> grey inner segment -> elbow -> black-tipped outer segment
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.28, 0.14, -0.1);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.55), grey);
      inner.position.x = side * 0.475;
      const elbow = new THREE.Group();
      elbow.position.x = side * 0.95;
      const outer = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.4), black);
      outer.position.set(side * 0.375, 0, 0.04);
      elbow.add(outer);
      shoulder.add(inner, elbow);
      this.root.add(shoulder);
      this.shoulders.push(shoulder);
      this.elbows.push(elbow);
    }

    // legs: thigh pivot under the body; tuck rotates them up and back
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.13, -0.22, 0.1);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 5), legMat);
      shin.position.y = -0.15;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.2), legMat);
      foot.position.set(0, -0.3, -0.05);
      leg.add(shin, foot);
      this.root.add(leg);
      this.legs.push(leg);
    }
  }

  /** Move the model toward a pose. Stroke-driven flaps apply immediately, the rest is smoothed. */
  apply(p: Pose, dt: number): void {
    const k = 1 - Math.exp(-14 * dt);
    const c = this.cur;
    c.flap = p.flapActive ? p.flap : c.flap + (p.flap - c.flap) * k;
    c.fold += (p.fold - c.fold) * k;
    c.sweep += (p.sweep - c.sweep) * k;
    c.legTuck += (p.legTuck - c.legTuck) * k;
    c.headRoll += (p.headRoll - c.headRoll) * k;
    c.headPitch += (p.headPitch - c.headPitch) * k;
    c.beakOpen += (p.beakOpen - c.beakOpen) * Math.min(1, k * 1.5);

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      this.shoulders[i].rotation.set(0, -side * c.sweep, side * c.flap, 'YXZ');
      // fold: outer segment bends back and down at the elbow
      this.elbows[i].rotation.set(0, -side * c.fold * 1.9, side * c.fold * -0.6, 'YXZ');
      const swing = Math.sin(p.walkPhase + (i === 0 ? 0 : Math.PI)) * p.legStride;
      this.legs[i].rotation.x = -1.3 * c.legTuck + swing;
    }
    this.head.rotation.set(c.headPitch, 0, c.headRoll);
    this.lowerBeak.rotation.x = c.beakOpen * 0.5;
    this.root.position.y = p.bob;
  }
}

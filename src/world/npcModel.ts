import * as THREE from 'three';
import type { Npc } from '../gameplay/npc';
import { npcPose } from '../gameplay/npcPose';
import { handPos } from '../gameplay/npc';

const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const SKIN = [0xf2c9a8, 0xd9a47c, 0xb98059, 0xf7d9bf];

/** Capsule-ish low-poly person, colour-coded by role (tourist = bright jacket). */
export class NpcModel {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private legs: THREE.Group[] = [];
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private indicator = new THREE.Group();
  private alarmMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  private exclaim = new THREE.Group();
  private question = new THREE.Group();

  constructor(color: number, seed: number) {
    const jacket = mat(color);
    const pants = mat(0x6d7a99);
    const skin = mat(SKIN[seed % SKIN.length]);
    this.root.add(this.body);

    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.13, 0.9, 0);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.22), pants);
      l.position.y = -0.45;
      leg.add(l);
      this.body.add(leg);
      this.legs.push(leg);
    }
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.75, 8), jacket);
    torso.position.y = 1.25;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
    head.position.y = 1.82;
    // sun hat: wide brim + crown, colour shifted from the jacket
    const hat = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 12), mat(0xfff1d6));
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 10), mat(0xfff1d6));
    crown.position.y = 0.09;
    hat.add(brim, crown);
    hat.position.y = 2.0;
    this.body.add(torso, head, hat);

    for (const [arm, side] of [[this.armL, -1], [this.armR, 1]] as [THREE.Group, number][]) {
      arm.position.set(side * 0.36, 1.5, 0);
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), jacket);
      a.position.y = -0.3;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), skin);
      hand.position.y = -0.62;
      arm.add(a, hand);
      this.body.add(arm);
    }

    // "!" indicator above the head
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), this.alarmMat);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), this.alarmMat);
    dot.position.y = -0.27;
    this.exclaim.add(bar, dot);
    // "?" glyph: hook (partial torus), stem and dot, in blue
    const qMat = new THREE.MeshBasicMaterial({ color: 0x6ab7ff });
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 14, Math.PI * 1.5), qMat);
    hook.position.y = 0.08;
    hook.rotation.z = -Math.PI * 0.25;
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.07), qMat);
    stem.position.set(0, -0.08, 0);
    const qdot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), qMat);
    qdot.position.y = -0.24;
    this.question.add(hook, stem, qdot);
    this.question.visible = false;
    this.indicator.add(this.exclaim, this.question);
    this.indicator.position.y = 2.65;
    this.indicator.visible = false;
    this.root.add(this.indicator);
  }

  apply(n: Npc, time: number): void {
    const pose = npcPose({ mode: n.mode, moving: n.moving, walkPhase: n.walkPhase, t: n.t, time, holding: n.holding !== null, distracted: n.distractT > 0 });
    this.root.position.set(n.x, pose.bob, n.z);
    this.root.rotation.y = n.heading;
    this.body.rotation.x = pose.lean;
    const sw = Math.sin(n.walkPhase);
    this.legs[0].rotation.x = sw * pose.legSwing;
    this.legs[1].rotation.x = -sw * pose.legSwing;
    // free (left) arm swings or goes up
    this.armL.rotation.set(-sw * pose.armSwing - pose.armRaise * 2.6, 0, 0.1);
    // right arm points at the ice cream in hand, or hangs / waves
    if (n.holding !== null) {
      const h = handPos(n);
      const lx = h.x - n.x, lz = h.z - n.z;
      const c = Math.cos(-n.heading), s = Math.sin(-n.heading);
      const local = new THREE.Vector3(lx * c + lz * s, h.y - 1.5, -lx * s + lz * c).sub(this.armR.position.clone().setY(0));
      local.y += 0; // shoulder is at y=0 after the subtraction above
      this.armR.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), local.clone().normalize());
    } else {
      this.armR.rotation.set(sw * pose.armSwing - pose.armRaise * 2.6, 0, -0.1);
    }
    this.indicator.visible = pose.indicator !== 'none';
    this.exclaim.visible = pose.indicator === 'notice' || pose.indicator === 'alarm';
    this.question.visible = pose.indicator === 'distracted';
    this.alarmMat.color.setHex(pose.indicator === 'alarm' ? 0xff6b6b : 0xffd166);
    this.indicator.position.y = 2.65 + Math.sin(time * 8) * 0.05;
  }
}

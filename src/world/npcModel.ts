import * as THREE from 'three';
import type { Npc, NpcMode } from '../gameplay/npc';
import { npcPose } from '../gameplay/npcPose';
import { handPos } from '../gameplay/npc';
import { mergeColored } from '../render/mergeMesh';

export interface NpcView {
  x: number;
  z: number;
  heading: number;
  mode: NpcMode;
  moving: boolean;
  walkPhase: number;
  t: number;
  holding: boolean;
  distracted: boolean;
  /** World point the right hand reaches for (ice cream, spray bottle). */
  hand?: { x: number; y: number; z: number };
}

export interface NpcModelOptions {
  hat?: 'sun' | 'cap';
  umbrella?: boolean;
  hatColor?: number;
}

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

  private umbrella: THREE.Group | null = null;

  constructor(color: number, seed: number, opts: NpcModelOptions = {}) {
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
    const hatColor = opts.hatColor ?? 0xfff1d6;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(opts.hat === 'cap' ? 0.24 : 0.36, opts.hat === 'cap' ? 0.24 : 0.36, 0.03, 12), mat(hatColor));
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 10), mat(hatColor));
    crown.position.y = 0.09;
    hat.add(brim, crown);
    hat.position.y = 2.0;
    const upper = new THREE.Group();
    upper.add(torso, head, hat);
    this.body.add(mergeColored(upper));

    for (const [arm, side] of [[this.armL, -1], [this.armR, 1]] as [THREE.Group, number][]) {
      arm.position.set(side * 0.36, 1.5, 0);
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), jacket);
      a.position.y = -0.3;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), skin);
      hand.position.y = -0.62;
      const parts = new THREE.Group();
      parts.add(a, hand);
      arm.add(mergeColored(parts));
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

    if (opts.umbrella) {
      const u = new THREE.Group();
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.4, 10), mat(0x7b6fd6));
      canopy.position.y = 2.55;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 5), mat(0x3a3f4a));
      pole.position.y = 2.1;
      const parts = new THREE.Group();
      parts.add(canopy, pole);
      u.add(mergeColored(parts));
      this.root.add(u);
      this.umbrella = u;
    }
  }

  /** Open umbrella over the head, or tipped aside (head exposed). */
  setUmbrella(up: boolean): void {
    if (!this.umbrella) return;
    this.umbrella.rotation.z = up ? 0 : 1.2;
    this.umbrella.position.set(up ? 0 : 0.5, up ? 0 : -0.5, 0);
  }

  apply(n: Npc, time: number): void {
    const h = n.holding !== null ? handPos(n) : undefined;
    this.applyView({ x: n.x, z: n.z, heading: n.heading, mode: n.mode, moving: n.moving, walkPhase: n.walkPhase, t: n.t, holding: n.holding !== null, distracted: n.distractT > 0, hand: h }, time);
  }

  applyView(n: NpcView, time: number): void {
    const pose = npcPose({ mode: n.mode, moving: n.moving, walkPhase: n.walkPhase, t: n.t, time, holding: n.holding, distracted: n.distracted });
    this.root.position.set(n.x, pose.bob, n.z);
    this.root.rotation.y = n.heading;
    this.body.rotation.x = pose.lean;
    const sw = Math.sin(n.walkPhase);
    this.legs[0].rotation.x = sw * pose.legSwing;
    this.legs[1].rotation.x = -sw * pose.legSwing;
    // free (left) arm swings or goes up
    this.armL.rotation.set(-sw * pose.armSwing - pose.armRaise * 2.6, 0, 0.1);
    // right arm points at what is in hand (ice cream, spray bottle), or hangs / waves
    if (n.hand) {
      const lx = n.hand.x - n.x, lz = n.hand.z - n.z;
      const c = Math.cos(-n.heading), s = Math.sin(-n.heading);
      const local = new THREE.Vector3(lx * c + lz * s, n.hand.y - 1.5, -lx * s + lz * c).sub(this.armR.position.clone().setY(0));
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

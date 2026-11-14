import * as THREE from 'three';
import type { Npc, NpcMode } from '../gameplay/npc';
import { npcPose } from '../gameplay/npcPose';
import { handPos } from '../gameplay/npc';
import { mergeColored } from '../render/mergeMesh';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { clipFor, outfitFor, type PersonClip } from '../gameplay/personAnim';
import { outfitTexture, type PeopleAssets } from './people';
import { tuning } from '../core/tuning';

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
  /** Trouser colour (else seeded). */
  pants?: number;
}

const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const SKIN = [0xf2c9a8, 0xd9a47c, 0xb98059, 0xf7d9bf];

/** Capsule-ish low-poly person, colour-coded by role (tourist = bright jacket). */
export class NpcModel {
  /** Set once at boot: the rigged person model. Without it people are simple capsules. */
  static assets: PeopleAssets | null = null;

  readonly root = new THREE.Group();
  private skinned: {
    mixer: THREE.AnimationMixer;
    actions: Record<PersonClip, THREE.AnimationAction>;
    current: PersonClip;
    armL: THREE.Bone;
    foreL: THREE.Bone;
    armR: THREE.Bone;
    foreR: THREE.Bone;
    headTop: THREE.Bone;
    hat: THREE.Object3D | null;
    lastTime: number;
  } | null = null;
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
    this.root.add(this.body);
    if (NpcModel.assets) this.buildSkinned(NpcModel.assets, color, seed, opts);
    else this.buildCapsule(color, seed, opts);
    this.buildExtras(opts);
  }

  private buildSkinned(a: PeopleAssets, color: number, seed: number, opts: NpcModelOptions): void {
    const inner = cloneSkinned(a.template) as THREE.Group;
    inner.scale.setScalar(a.scale);
    inner.rotation.y = tuning.people.facing.value;
    const map = outfitTexture(outfitFor(seed, color, opts.pants));
    const bones: Record<string, THREE.Bone> = {};
    inner.traverse((c) => {
      if ((c as THREE.Bone).isBone) bones[c.name] = c as THREE.Bone;
      if ((c as THREE.Mesh).isMesh) {
        const m = c as THREE.SkinnedMesh;
        m.material = new THREE.MeshLambertMaterial({ map, flatShading: true });
        m.frustumCulled = false; // skinned bounds do not follow the animation
      }
    });
    this.body.add(inner);
    const mixer = new THREE.AnimationMixer(inner);
    const actions = {} as Record<PersonClip, THREE.AnimationAction>;
    for (const k of Object.keys(a.clips) as PersonClip[]) actions[k] = mixer.clipAction(a.clips[k]);
    actions.idle.play();
    mixer.update((seed % 17) * 0.37); // people do not breathe in sync
    let hat: THREE.Object3D | null = null;
    const hatKind = opts.hat ?? (seed % 3 === 0 ? 'sun' : undefined); // some tourists wear a sun hat
    if (hatKind) {
      hat = this.hatMesh({ ...opts, hat: hatKind });
      this.root.add(hat);
    }
    this.skinned = { mixer, actions, current: 'idle', armL: bones.LeftArm, foreL: bones.LeftForeArm, armR: bones.RightArm, foreR: bones.RightForeArm, headTop: bones.HeadTop_End, hat, lastTime: -1 };
  }

  private hatMesh(opts: NpcModelOptions): THREE.Object3D {
    const hat = new THREE.Group();
    const hatColor = opts.hatColor ?? 0xfff1d6;
    const r = opts.hat === 'cap' ? 0.15 : 0.3;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.025, 12), mat(hatColor));
    brim.position.set(0, -0.06, opts.hat === 'cap' ? -0.06 : 0);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 10), mat(hatColor));
    crown.position.y = -0.01;
    hat.add(brim, crown);
    return mergeColored(hat);
  }

  private buildCapsule(color: number, seed: number, opts: NpcModelOptions): void {
    const jacket = mat(color);
    const pants = mat(0x6d7a99);
    const skin = mat(SKIN[seed % SKIN.length]);

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
  }

  private buildExtras(opts: NpcModelOptions): void {

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
    this.root.position.set(n.x, this.skinned ? 0 : pose.bob, n.z);
    this.root.rotation.y = n.heading;
    this.body.rotation.x = pose.lean;
    this.indicator.visible = pose.indicator !== 'none';
    this.exclaim.visible = pose.indicator === 'notice' || pose.indicator === 'alarm';
    this.question.visible = pose.indicator === 'distracted';
    this.alarmMat.color.setHex(pose.indicator === 'alarm' ? 0xff6b6b : 0xffd166);
    this.indicator.position.y = (this.skinned ? 2.3 : 2.65) + Math.sin(time * 8) * 0.05;
    if (this.skinned) {
      this.animateSkinned(n, pose.armRaise, time);
      return;
    }
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
  }

  private animateSkinned(n: NpcView, armRaise: number, time: number): void {
    const k = this.skinned!;
    const dt = k.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - k.lastTime));
    k.lastTime = time;
    const want = clipFor(n.mode, n.moving);
    if (want !== k.current) {
      const next = k.actions[want];
      next.reset().play();
      k.actions[k.current].crossFadeTo(next, tuning.people.blend.value, false);
      k.current = want;
    }
    const rate = want === 'walk' ? tuning.people.walkRate.value : want === 'run' ? tuning.people.runRate.value : 1;
    k.actions[want].timeScale = rate;
    k.mixer.update(dt);
    this.root.updateMatrixWorld(true);
    // arms on top of the clip: raised in panic / cheering, the right one reaching for what is in hand
    const up = new THREE.Vector3(0, 1, 0);
    if (armRaise > 0.01) aimBone(k.armL, k.foreL, up, Math.min(1, armRaise));
    if (n.hand) {
      const shoulder = k.armR.getWorldPosition(new THREE.Vector3());
      const dir = new THREE.Vector3(n.hand.x, n.hand.y, n.hand.z).sub(shoulder);
      if (dir.lengthSq() > 1e-6) aimBone(k.armR, k.foreR, dir.normalize(), 1);
    } else if (armRaise > 0.01) aimBone(k.armR, k.foreR, up, Math.min(1, armRaise));
    if (k.hat) {
      const p = k.headTop.getWorldPosition(new THREE.Vector3());
      k.hat.position.copy(this.root.worldToLocal(p));
    }
  }
}

const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _wq = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/** Rotate a bone (in world space) so that it points from itself toward its child along `dir`, blended by `w`. */
function aimBone(bone: THREE.Bone, child: THREE.Bone, dir: THREE.Vector3, w: number): void {
  bone.getWorldPosition(_a);
  child.getWorldPosition(_b);
  const cur = _b.sub(_a).normalize();
  _q.setFromUnitVectors(cur, dir);
  _q.slerp(new THREE.Quaternion(), 1 - w);
  bone.getWorldQuaternion(_wq);
  bone.parent!.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q.multiply(_wq)));
  bone.updateMatrixWorld(true);
}

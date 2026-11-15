import * as THREE from 'three';
import type { Pose } from './pose';
import { GULL_SKINS, PIGEON, type GullSlot } from '../data/gullSkins';

/**
 * Low-poly herring gull built from primitives, faces -Z, driven by a Pose.
 * Parts that move together are baked into one mesh (about a dozen draw calls in all). Every vertex remembers its
 * colour slot (body, mantle, wingtip, beak spot...), so a skin change just repaints the vertex colours.
 */

type Part = { geo: THREE.BufferGeometry; slot: GullSlot; at?: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number] };

const p = (geo: THREE.BufferGeometry, slot: GullSlot, at?: Part['at'], rot?: Part['rot'], scale?: Part['scale']): Part => ({ geo, slot, at, rot, scale });

interface Baked {
  mesh: THREE.Mesh;
  slots: GullSlot[];
}

/** Merge parts into one flat-shaded mesh with a colour slot per vertex. */
function bake(parts: Part[]): Baked {
  const pos: number[] = [];
  const slots: GullSlot[] = [];
  const m = new THREE.Matrix4();
  for (const part of parts) {
    const g = (part.geo.index ? part.geo.toNonIndexed() : part.geo.clone()) as THREE.BufferGeometry;
    m.compose(
      new THREE.Vector3(...(part.at ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.rot ?? [0, 0, 0]))),
      new THREE.Vector3(...(part.scale ?? [1, 1, 1])),
    );
    g.applyMatrix4(m);
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      pos.push(a.getX(i), a.getY(i), a.getZ(i));
      slots.push(part.slot);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return { mesh: new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })), slots };
}

/** Tapered box: a feather or wing panel lying in x (length), z (width), with a thinner, narrower far end. */
function feather(len: number, w0: number, w1: number, t = 0.025): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(len, t, 1, 2, 1, 1);
  const a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i) + len / 2; // 0..len
    const k = x / len;
    a.setZ(i, a.getZ(i) * (w0 + (w1 - w0) * k));
    a.setX(i, x);
  }
  return g;
}

const _open = new THREE.Quaternion();
const _fold = new THREE.Quaternion();
const _e = new THREE.Euler();

export class GullModel {
  readonly root = new THREE.Group();
  private shoulders: THREE.Group[] = [];
  private elbows: THREE.Group[] = [];
  private fans: THREE.Group[] = [];
  private legs: THREE.Group[] = [];
  private head = new THREE.Group();
  private lowerBeak = new THREE.Group();
  private baked: Baked[] = [];
  private skin: Record<GullSlot, number> = GULL_SKINS[0].colours;
  private disguised = false;
  private cur = { flap: 0, fold: 1, sweep: 0.5, legTuck: 0, headRoll: 0, headPitch: 0, beakOpen: 0 };

  constructor() {
    const add = (parent: THREE.Object3D, parts: Part[]) => {
      const b = bake(parts);
      parent.add(b.mesh);
      this.baked.push(b);
    };

    // body: a lathe teardrop along z, a grey saddle on the back, a fanned tail
    const prof = [[0.02, 0.62], [0.15, 0.48], [0.26, 0.22], [0.31, -0.04], [0.29, -0.3], [0.2, -0.48], [0.06, -0.58], [0.0, -0.6]];
    const body = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, -z)), 10);
    body.rotateX(-Math.PI / 2);
    body.scale(1, 0.9, 1);
    const tailParts: Part[] = [];
    for (let i = -2; i <= 2; i++) tailParts.push(p(feather(0.42, 0.11, 0.09, 0.02), 'tail', [i * 0.035, 0.03, 0.5], [0, -Math.PI / 2 - i * 0.16, -0.12]));
    add(this.root, [
      p(body, 'body'),
      p(new THREE.SphereGeometry(0.27, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2.2), 'mantle', [0, 0.06, 0.05], [0, 0, 0], [0.95, 0.55, 1.5]),
      ...tailParts,
    ]);

    // head: skull, eyes (pale iris, pupil, red ring), beak with a hook; the lower beak (with the red spot) opens
    this.head.position.set(0, 0.3, -0.6);
    const eyeParts: Part[] = [];
    for (const s of [-1, 1]) {
      eyeParts.push(p(new THREE.SphereGeometry(0.034, 6, 5), 'eye', [s * 0.128, 0.045, -0.1]));
      eyeParts.push(p(new THREE.SphereGeometry(0.017, 5, 4), 'pupil', [s * 0.155, 0.05, -0.108]));
      eyeParts.push(p(new THREE.TorusGeometry(0.036, 0.008, 4, 10), 'ring', [s * 0.132, 0.045, -0.1], [0, Math.PI / 2, 0]));
    }
    const upper = new THREE.CylinderGeometry(0.018, 0.045, 0.34, 4);
    upper.rotateX(-Math.PI / 2);
    upper.rotateZ(Math.PI / 4);
    add(this.head, [
      p(new THREE.SphereGeometry(0.19, 10, 8), 'head', [0, 0, 0], [0, 0, 0], [0.95, 1, 1.12]),
      ...eyeParts,
      p(upper, 'beak', [0, -0.015, -0.34], [0, 0, 0], [1, 0.75, 1]),
      p(new THREE.ConeGeometry(0.03, 0.08, 4), 'beak', [0, -0.05, -0.5], [Math.PI, 0, 0]),
    ]);
    this.lowerBeak.position.set(0, -0.05, -0.2);
    const lower = new THREE.CylinderGeometry(0.014, 0.035, 0.28, 4);
    lower.rotateX(-Math.PI / 2);
    lower.rotateZ(Math.PI / 4);
    add(this.lowerBeak, [p(lower, 'beak', [0, 0, -0.14], [0, 0, 0], [1, 0.7, 1]), p(new THREE.BoxGeometry(0.045, 0.035, 0.05), 'spot', [0, -0.012, -0.21])]);
    this.head.add(this.lowerBeak);
    this.root.add(this.head);

    // wings: arm (grey coverts, white trailing edge) -> elbow: hand panel -> a fan of five primaries with black tips
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.27, 0.14, -0.1);
      const armLen = 0.95;
      const arm = feather(armLen, 0.56, 0.48, 0.05);
      if (side < 0) arm.scale(-1, 1, 1);
      const trail = feather(armLen, 0.1, 0.09, 0.035);
      if (side < 0) trail.scale(-1, 1, 1);
      add(shoulder, [p(arm, 'mantle', [0, 0, 0.02]), p(trail, 'trail', [0, -0.005, 0.32])]);
      const elbow = new THREE.Group();
      elbow.position.x = side * armLen;
      const hand = feather(0.48, 0.44, 0.34, 0.04);
      if (side < 0) hand.scale(-1, 1, 1);
      add(elbow, [p(hand, 'mantle', [0, 0, 0.04])]);
      const fan = new THREE.Group();
      fan.position.set(side * 0.42, 0, 0.02);
      const fparts: Part[] = [];
      for (let i = 0; i < 5; i++) {
        const ang = -0.22 + i * 0.17; // outermost (leading) first, swept back toward the trailing edge
        const len = 0.62 - i * 0.05;
        const base = feather(len * 0.55, 0.1, 0.095, 0.02);
        const tip = feather(len * 0.45, 0.095, 0.05, 0.02);
        const yaw = side > 0 ? -ang : Math.PI + ang;
        const dir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const zOff = i * 0.075 - 0.12;
        fparts.push(p(base, 'mantle', [0, -0.004 * i, zOff], [0, yaw, 0]));
        const tipAt = new THREE.Vector3(0, -0.004 * i, zOff).addScaledVector(dir, len * 0.55);
        fparts.push(p(tip, 'tip', [tipAt.x, tipAt.y, tipAt.z], [0, yaw, 0]));
        if (i < 2) {
          const spot = tipAt.clone().addScaledVector(dir, len * 0.22);
          fparts.push(p(new THREE.BoxGeometry(0.07, 0.026, 0.06), 'mirror', [spot.x, spot.y, spot.z], [0, yaw, 0]));
        }
      }
      add(fan, fparts);
      elbow.add(fan);
      shoulder.add(elbow);
      this.root.add(shoulder);
      this.shoulders.push(shoulder);
      this.elbows.push(elbow);
      this.fans.push(fan);
    }

    // legs: pink shins and webbed feet; tuck rotates them up and back
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.13, -0.22, 0.1);
      const web = new THREE.ConeGeometry(0.1, 0.22, 3);
      web.rotateX(-Math.PI / 2);
      web.scale(1, 0.15, 1);
      add(leg, [p(new THREE.CylinderGeometry(0.022, 0.026, 0.3, 5), 'legs', [0, -0.15, 0]), p(web, 'legs', [0, -0.3, -0.07])]);
      this.root.add(leg);
      this.legs.push(leg);
    }
    this.paint();
  }

  /** Wear a skin (colour per slot). */
  setSkin(colours: Record<GullSlot, number>): void {
    this.skin = colours;
    this.paint();
  }

  /** Pigeon colours while the Disguise skill is on. */
  setDisguise(on: boolean): void {
    this.disguised = on;
    this.paint();
  }

  private paint(): void {
    const colours = this.disguised ? PIGEON : this.skin;
    const c = new THREE.Color();
    for (const b of this.baked) {
      const attr = b.mesh.geometry.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < b.slots.length; i++) {
        c.setHex(colours[b.slots[i]]);
        attr.setXYZ(i, c.r, c.g, c.b);
      }
      attr.needsUpdate = true;
    }
  }

  /** Move the model toward a pose. Stroke-driven flaps apply immediately, the rest is smoothed. */
  apply(pose: Pose, dt: number): void {
    const k = 1 - Math.exp(-14 * dt);
    const c = this.cur;
    c.flap = pose.flapActive ? pose.flap : c.flap + (pose.flap - c.flap) * k;
    c.fold += (pose.fold - c.fold) * k;
    c.sweep += (pose.sweep - c.sweep) * k;
    c.legTuck += (pose.legTuck - c.legTuck) * k;
    c.headRoll += (pose.headRoll - c.headRoll) * k;
    c.headPitch += (pose.headPitch - c.headPitch) * k;
    c.beakOpen += (pose.beakOpen - c.beakOpen) * Math.min(1, k * 1.5);

    const f = Math.min(1, Math.max(0, c.fold));
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      // open wing (flap + sweep) blended toward the folded wing: pointing back along the body, leading edge up
      _open.setFromEuler(_e.set(0, -side * c.sweep, side * c.flap, 'YXZ'));
      _fold.setFromEuler(_e.set(1.05, -side * (Math.PI / 2 - 0.1), -side * 0.08, 'YXZ'));
      this.shoulders[i].quaternion.copy(_open).slerp(_fold, f * f * (3 - 2 * f));
      this.shoulders[i].scale.x = 1 - 0.47 * f; // the folded wing is shorter (tips end just past the tail)
      // half-folded (dive, flap upstroke): the hand bends back at the elbow; fully folded it lies straight again
      this.elbows[i].rotation.set(0, -side * 2.4 * f * (1 - f), 0, 'YXZ');
      this.fans[i].rotation.set(0, -side * 0.35 * f, side * c.flap * 0.25 * (1 - f), 'YXZ');
      this.fans[i].scale.z = 1 - 0.75 * f; // the primaries close into a bundle when folded
      const swing = Math.sin(pose.walkPhase + (i === 0 ? 0 : Math.PI)) * pose.legStride;
      this.legs[i].rotation.x = -1.3 * c.legTuck + swing;
    }
    for (const leg of this.legs) leg.visible = !pose.swimming; // swimming: no legs in sight
    this.head.rotation.set(c.headPitch, 0, c.headRoll);
    this.lowerBeak.rotation.x = c.beakOpen * 0.5;
    this.root.position.y = pose.bob;
  }
}

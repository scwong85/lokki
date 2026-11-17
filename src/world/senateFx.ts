import * as THREE from 'three';
import type { Tram, TramDef } from '../gameplay/tram';
import type { GangMode, PigeonGang } from '../gameplay/pigeons';

const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

/** The tram: cream-and-green cars with window panes, doors, a driver cab, headlights and a pantograph. Position follows the logic object. */
export class TramView {
  readonly group = new THREE.Group();
  constructor(private readonly tram: Tram, def: TramDef) {
    const L = def.length, W = def.width, H = def.roofY;
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      this.group.add(o);
      return o;
    };
    const green = mat(0x7fc8a9), cream = mat(0xf6efe0), glass = mat(0xcfe8f5), dark = mat(0x5a6573), grey = mat(0xb9c4cf);
    // lower body, cream waist stripe, upper body in green
    add(new THREE.BoxGeometry(L, 1.1, W), green, 0, 0.8 + 0.55, 0);
    add(new THREE.BoxGeometry(L + 0.02, 0.3, W + 0.02), cream, 0, 2.0, 0);
    add(new THREE.BoxGeometry(L, H - 2.15, W), green, 0, 2.15 + (H - 2.15) / 2, 0);
    // window panes along both sides, with pillars between them
    const bays = Math.max(3, Math.floor((L - 3) / 1.8));
    const pitch = (L - 3.2) / bays;
    for (let i = 0; i < bays; i++) {
      const x = -L / 2 + 1.9 + pitch * (i + 0.5);
      for (const side of [-1, 1]) add(new THREE.BoxGeometry(pitch * 0.78, 0.85, 0.06), glass, x, 2.55, side * (W / 2 + 0.02));
    }
    // doors (two darker panels) and the cab at the front end (the +x end; scale.x flips it)
    for (const dx of [-L * 0.18, L * 0.22]) for (const side of [-1, 1]) add(new THREE.BoxGeometry(1.1, 1.9, 0.07), mat(0x3f8f78), dx, 1.85, side * (W / 2 + 0.03));
    add(new THREE.BoxGeometry(0.5, 0.9, W - 0.3), glass, L / 2 - 0.2, 2.55, 0);
    for (const z of [-0.6, 0.6]) add(new THREE.BoxGeometry(0.1, 0.18, 0.28), mat(0xfff2b8), L / 2 + 0.02, 1.2, z);
    add(new THREE.BoxGeometry(0.1, 0.5, W - 0.2), cream, L / 2 + 0.02, 1.0, 0);
    // roof with a pantograph
    add(new THREE.BoxGeometry(L - 0.4, 0.18, W - 0.3), grey, 0, H + 0.09, 0);
    add(new THREE.BoxGeometry(0.9, 0.06, 0.06), dark, -L * 0.25, H + 0.65, 0).rotation.z = 0.5;
    add(new THREE.BoxGeometry(0.06, 0.06, 1.4), dark, -L * 0.25 + 0.4, H + 0.95, 0);
    // bogies and a skirt
    add(new THREE.BoxGeometry(L - 1.2, 0.5, W - 0.5), dark, 0, 0.4, 0);
    for (const bx of [-L * 0.32, L * 0.32]) add(new THREE.BoxGeometry(1.8, 0.45, W + 0.05), mat(0x3f4854), bx, 0.35, 0);
    this.group.position.set(tram.x, 0, def.z);
  }
  update(): void {
    this.group.position.x = this.tram.x;
    this.group.scale.x = this.tram.dir;
  }
}

/** The Pigeon Gang: little grey birds on the statue base; friends cluster near the gull's side, scattered ones fly off. */
export class PigeonView {
  readonly group = new THREE.Group();
  private readonly birds: { root: THREE.Group; head: THREE.Mesh; wings: THREE.Mesh[] }[] = [];
  private t = 0;
  private away = 0;
  constructor(private readonly gang: PigeonGang, count: number) {
    const sphere = new THREE.SphereGeometry(1, 6, 5);
    for (let i = 0; i < count; i++) {
      const b = new THREE.Group();
      const grey = mat(i % 3 === 0 ? 0xc9c2d8 : 0x9aa3b2);
      const body = new THREE.Mesh(sphere, grey);
      body.scale.set(0.2, 0.17, 0.27);
      const neck = new THREE.Mesh(sphere, mat(0x6f9a8a)); // the shimmering green-purple neck
      neck.scale.set(0.12, 0.1, 0.1);
      neck.position.set(0, 0.1, 0.2);
      const head = new THREE.Mesh(sphere, mat(0x7e8796));
      head.scale.setScalar(0.085);
      head.position.set(0, 0.17, 0.27);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), mat(0xf2b65c));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, -0.01, 0.1);
      head.add(beak);
      for (const e of [-1, 1]) {
        const eye = new THREE.Mesh(sphere, mat(0xe8782a));
        eye.scale.setScalar(0.18);
        eye.position.set(e * 0.7, 0.3, 0.45);
        head.add(eye);
      }
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.2), mat(0x6b7483));
      tail.position.set(0, 0.04, -0.3);
      tail.rotation.x = -0.25;
      const wings: THREE.Mesh[] = [];
      for (const w of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.3), mat(0x7e8796));
        wing.position.set(w * 0.16, 0.06, -0.02);
        wings.push(wing);
        b.add(wing);
      }
      b.add(body, neck, head, tail);
      this.birds.push({ root: b, head, wings });
      this.group.add(b);
    }
  }
  update(dt: number): void {
    this.t += dt;
    const mode: GangMode = this.gang.mode;
    this.away += ((mode === 'scattered' ? 1 : 0) - this.away) * Math.min(1, dt * 1.5);
    const { x, z } = this.gang.def;
    const flying = mode === 'scattered' && this.away < 0.97;
    this.birds.forEach((bd, i) => {
      const b = bd.root;
      const a = (i / this.birds.length) * Math.PI * 2 + (mode === 'guarding' ? 0 : this.t * 0.2);
      const r = 3.2 + (i % 3) * 0.8 + this.away * 24;
      const hop = flying ? 3 + this.away * 18 : Math.max(0, Math.sin(this.t * 6 + i * 2.1)) * (mode === 'friends' ? 0.18 : 0.06);
      b.position.set(x + Math.cos(a) * r, 0.2 + hop, z + Math.sin(a) * r);
      b.rotation.y = -a + Math.PI / 2;
      // the head bobs forward and back as it pecks about; wings beat while it flies off
      bd.head.position.z = 0.27 + Math.max(0, Math.sin(this.t * 7 + i * 1.7)) * 0.05;
      const flap = flying ? Math.sin(this.t * 30 + i) * 0.9 : 0;
      bd.wings[0].rotation.z = -flap;
      bd.wings[1].rotation.z = flap;
    });
  }
}

import type { Sunbathers } from '../gameplay/sunbathers';
import type { Dog } from '../gameplay/dogs';
import type { Sprinklers } from '../gameplay/sprinklers';

/** Sunbathers on towels: arms, legs, a hat and a book; woken ones sit up and put on sunglasses. */
export class SunbatherView {
  readonly group = new THREE.Group();
  private readonly figs: { torso: THREE.Group; head: THREE.Group; shades: THREE.Mesh; hat: THREE.Mesh }[] = [];
  constructor(private readonly sun: Sunbathers) {
    const colours = [0xff8fa3, 0x9ec9f0, 0xffc971, 0xc7b5e0, 0x9bd8b0];
    const skins = [0xf2c8a0, 0xd9a47a, 0xf7d9bd, 0xb67c55];
    const sphere = new THREE.SphereGeometry(1, 8, 6);
    sun.list.forEach((s, i) => {
      const root = new THREE.Group();
      const col = colours[i % colours.length], skin = mat(skins[i % skins.length]);
      const towel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 2.1), mat(col));
      towel.position.y = 0.02;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.045, 0.18), mat(0xfff6e6));
      stripe.position.set(0, 0.022, 0.85);
      // a torso group (swimsuit top and tummy) that sits up as a whole, with the arms on it
      const torso = new THREE.Group();
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.6), mat(col === 0xff8fa3 ? 0xffd166 : 0xff8fa3));
      const belly = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.3), skin);
      belly.position.z = 0.42;
      torso.add(chest, belly);
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.55), skin);
        arm.position.set(side * 0.34, -0.02, 0.1);
        arm.rotation.y = side * 0.25;
        torso.add(arm);
      }
      torso.position.set(0, 0.15, -0.1);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.7), skin);
      legs.position.set(0, 0.11, 0.72);
      const feet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.16), skin);
      feet.position.set(0, 0.12, 1.1);
      const head = new THREE.Group();
      const face = new THREE.Mesh(sphere, skin);
      face.scale.setScalar(0.16);
      const hair = new THREE.Mesh(sphere, mat([0x3a2a20, 0xd9a441, 0x8a4b2a, 0x222222][i % 4]));
      hair.scale.set(0.17, 0.12, 0.17);
      hair.position.set(0, 0.06, 0.03);
      const shades = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.05), mat(0x1d1f2a));
      shades.position.set(0, 0.02, -0.15);
      shades.visible = false;
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 10), mat(0xf4e3a1)); // a straw hat over the face while asleep
      hat.position.set(0, 0.1, -0.05);
      head.add(face, hair, shades, hat);
      head.position.set(0, 0.2, -0.62);
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.3), mat(0x7f9fd8));
      book.position.set(0.6, 0.05, 0.1);
      book.rotation.y = 0.4;
      root.add(towel, stripe, torso, legs, feet, head, book);
      root.position.set(s.x, 0, s.z);
      this.figs.push({ torso, head, shades, hat });
      this.group.add(root);
    });
  }
  update(): void {
    this.sun.list.forEach((s, i) => {
      const f = this.figs[i];
      const up = s.state === 'awake';
      f.torso.rotation.x = up ? -0.9 : 0;
      f.torso.position.set(0, up ? 0.35 : 0.15, up ? -0.2 : -0.1);
      f.head.position.set(0, up ? 0.82 : 0.2, up ? -0.5 : -0.62);
      f.shades.visible = up;
      f.hat.visible = !up;
    });
  }
}

/** A dog: floppy ears, a wagging tail, a nose and collar, and four legs that swing when it runs. */
export class DogView {
  readonly group = new THREE.Group();
  private t = 0;
  private readonly body: THREE.Group;
  private readonly tail: THREE.Mesh;
  private readonly legs: THREE.Mesh[] = [];
  constructor(private readonly dog: Dog) {
    this.body = new THREE.Group();
    const fur = mat(0xc98f5a), dark = mat(0x8a5a35);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.85), fur);
    torso.position.y = 0.55;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), mat(0xf1dcc0)); // pale chest and tummy
    chest.position.set(0, 0.42, 0.28);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.08), mat(0xe05a5a));
    collar.position.set(0, 0.74, 0.38);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.32), fur);
    head.position.set(0, 0.82, 0.55);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.2), dark);
    snout.position.set(0, 0.76, 0.76);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), mat(0x2a2024));
    nose.position.set(0, 0.8, 0.87);
    this.body.add(torso, chest, collar, head, snout, nose);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.14), dark);
      ear.position.set(side * 0.18, 0.84, 0.5);
      ear.rotation.z = side * 0.35;
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), mat(0x1d1f2a));
      eye.position.set(side * 0.08, 0.88, 0.71);
      this.body.add(ear, eye);
    }
    this.tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), fur);
    this.tail.geometry.translate(0, 0, -0.17); // pivot at the base so it wags from the rump
    this.tail.position.set(0, 0.7, -0.42);
    this.tail.rotation.x = 0.7;
    this.body.add(this.tail);
    for (const [x, z] of [[-0.14, 0.3], [0.14, 0.3], [-0.14, -0.3], [0.14, -0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), fur);
      leg.geometry.translate(0, -0.2, 0); // pivot at the hip
      leg.position.set(x, 0.4, z);
      this.legs.push(leg);
      this.body.add(leg);
    }
    this.group.add(this.body);
  }
  update(dt: number): void {
    this.t += dt;
    this.group.position.set(this.dog.x, 0, this.dog.z);
    this.group.rotation.y = this.dog.heading;
    const run = this.dog.running;
    this.body.position.y = run ? Math.abs(Math.sin(this.t * 14)) * 0.12 : 0;
    this.legs.forEach((l, i) => {
      const phase = i === 0 || i === 3 ? 0 : Math.PI;
      l.rotation.x = run ? Math.sin(this.t * 14 + phase) * 0.7 : 0;
    });
    this.tail.rotation.y = Math.sin(this.t * (run ? 18 : 9)) * (run ? 0.5 : 0.7); // a happy wag either way
  }
}

/** The spray: pale-blue jets that fan out from each zone's centre while the sprinklers run. */
export class SprinklerView {
  readonly group = new THREE.Group();
  private readonly jets: THREE.Mesh[] = [];
  private t = 0;
  constructor(private readonly sp: Sprinklers) {
    const m = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.45, depthWrite: false });
    for (const z of sp.zones) {
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.3, 6), mat(0x6a7a8a));
      head.position.set(z.x, 0.15, z.z);
      this.group.add(head);
      for (let k = 0; k < 4; k++) {
        const jet = new THREE.Mesh(new THREE.ConeGeometry(z.r * 0.45, z.r * 0.9, 8, 1, true), m);
        jet.position.set(z.x, z.r * 0.45, z.z);
        jet.userData.zone = z;
        this.jets.push(jet);
        this.group.add(jet);
      }
    }
  }
  update(dt: number): void {
    this.t += dt;
    const on = this.sp.running;
    this.jets.forEach((j, i) => {
      j.visible = on;
      const z = j.userData.zone as { x: number; z: number; r: number };
      const a = this.t * 2 + (i % 4) * (Math.PI / 2);
      j.position.set(z.x + Math.cos(a) * z.r * 0.25, z.r * 0.4, z.z + Math.sin(a) * z.r * 0.25);
      j.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5);
    });
  }
}

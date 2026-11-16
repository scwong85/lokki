import * as THREE from 'three';
import type { Tram, TramDef } from '../gameplay/tram';
import type { GangMode, PigeonGang } from '../gameplay/pigeons';

const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

/** The tram: a long cream-and-green box with a dark roof and windows. Position follows the logic object. */
export class TramView {
  readonly group = new THREE.Group();
  constructor(private readonly tram: Tram, def: TramDef) {
    const L = def.length, W = def.width, H = def.roofY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, H - 0.8, W), mat(0x7fc8a9));
    body.position.y = 0.8 + (H - 0.8) / 2;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(L + 0.02, 0.5, W + 0.02), mat(0xf6efe0));
    stripe.position.y = 1.5;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(L - 0.4, 0.18, W - 0.3), mat(0xb9c4cf));
    roof.position.y = H + 0.09;
    const win = new THREE.Mesh(new THREE.BoxGeometry(L - 1.6, 0.9, W + 0.04), mat(0xcfe8f5));
    win.position.y = 2.2;
    const wheels = new THREE.Mesh(new THREE.BoxGeometry(L - 1.2, 0.5, W - 0.5), mat(0x5a6573));
    wheels.position.y = 0.4;
    this.group.add(body, stripe, win, roof, wheels);
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
  private readonly birds: THREE.Group[] = [];
  private t = 0;
  private away = 0;
  constructor(private readonly gang: PigeonGang, count: number) {
    for (let i = 0; i < count; i++) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), mat(i % 3 === 0 ? 0xc9c2d8 : 0x9aa3b2));
      body.scale.set(1, 0.8, 1.35);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0x7e8796));
      head.position.set(0, 0.14, 0.25);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), mat(0xf2b65c));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.13, 0.36);
      b.add(body, head, beak);
      this.birds.push(b);
      this.group.add(b);
    }
  }
  update(dt: number): void {
    this.t += dt;
    const mode: GangMode = this.gang.mode;
    this.away += ((mode === 'scattered' ? 1 : 0) - this.away) * Math.min(1, dt * 1.5);
    const { x, z } = this.gang.def;
    this.birds.forEach((b, i) => {
      const a = (i / this.birds.length) * Math.PI * 2 + (mode === 'guarding' ? 0 : this.t * 0.2);
      const r = 3.2 + (i % 3) * 0.8 + this.away * 24;
      const hop = mode === 'scattered' && this.away < 0.97 ? 3 + this.away * 18 : Math.max(0, Math.sin(this.t * 6 + i * 2.1)) * (mode === 'friends' ? 0.18 : 0.06);
      b.position.set(x + Math.cos(a) * r, 0.2 + hop, z + Math.sin(a) * r);
      b.rotation.y = -a + Math.PI / 2;
    });
  }
}

import type { Sunbathers } from '../gameplay/sunbathers';
import type { Dog } from '../gameplay/dogs';
import type { Sprinklers } from '../gameplay/sprinklers';

/** Sunbathers on towels: lying with eyes shut; woken ones sit up and put on sunglasses. */
export class SunbatherView {
  readonly group = new THREE.Group();
  private readonly figs: { root: THREE.Group; torso: THREE.Mesh; head: THREE.Mesh; shades: THREE.Mesh }[] = [];
  constructor(private readonly sun: Sunbathers) {
    const colours = [0xff8fa3, 0x9ec9f0, 0xffc971, 0xc7b5e0, 0x9bd8b0];
    sun.list.forEach((s, i) => {
      const root = new THREE.Group();
      const towel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 2.1), mat(colours[i % colours.length]));
      towel.position.y = 0.02;
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.9), mat(0xf2c8a0));
      torso.position.set(0, 0.15, 0.0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0xf2c8a0));
      head.position.set(0, 0.2, -0.62);
      const shades = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.05), mat(0x1d1f2a));
      shades.position.set(0, 0.24, -0.76);
      shades.visible = false;
      root.add(towel, torso, head, shades);
      root.position.set(s.x, 0, s.z);
      this.figs.push({ root, torso, head, shades });
      this.group.add(root);
    });
  }
  update(): void {
    this.sun.list.forEach((s, i) => {
      const f = this.figs[i];
      const up = s.state === 'awake';
      f.torso.rotation.x = up ? -0.9 : 0;
      f.torso.position.set(0, up ? 0.35 : 0.15, up ? -0.1 : 0);
      f.head.position.set(0, up ? 0.8 : 0.2, up ? -0.5 : -0.62);
      f.shades.position.set(0, up ? 0.84 : 0.24, up ? -0.64 : -0.76);
      f.shades.visible = up;
    });
  }
}

/** A dog: brown box body, head, tail and four legs; bobs when running. */
export class DogView {
  readonly group = new THREE.Group();
  private t = 0;
  private readonly body: THREE.Group;
  constructor(private readonly dog: Dog) {
    this.body = new THREE.Group();
    const fur = mat(0xc98f5a);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.85), fur);
    torso.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.32), fur);
    head.position.set(0, 0.8, 0.55);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.2), mat(0x8a5a35));
    snout.position.set(0, 0.74, 0.76);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), fur);
    tail.position.set(0, 0.78, -0.55);
    tail.rotation.x = 0.7;
    this.body.add(torso, head, snout, tail);
    for (const [x, z] of [[-0.14, 0.3], [0.14, 0.3], [-0.14, -0.3], [0.14, -0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), fur);
      leg.position.set(x, 0.2, z);
      this.body.add(leg);
    }
    this.group.add(this.body);
  }
  update(dt: number): void {
    this.t += dt;
    this.group.position.set(this.dog.x, 0, this.dog.z);
    this.group.rotation.y = this.dog.heading;
    this.body.position.y = this.dog.running ? Math.abs(Math.sin(this.t * 14)) * 0.12 : 0;
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

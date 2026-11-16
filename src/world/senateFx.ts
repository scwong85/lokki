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

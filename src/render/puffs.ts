import * as THREE from 'three';

/** What a burst looks like: colour(s), how many bits, how fast, how they fall. */
export interface PuffStyle {
  colors: number[];
  count: number;
  speed: number;
  up: number;
  gravity: number;
  life: number;
  size: number;
}

export const PUFFS = {
  feathers: { colors: [0xffffff, 0xf1f3f5, 0xdee2e6], count: 12, speed: 3.5, up: 2.5, gravity: 3, life: 1.3, size: 0.14 },
  crumbs: { colors: [0xf2c078, 0xe8a95b, 0xfff1d6], count: 9, speed: 2.5, up: 3, gravity: 12, life: 0.8, size: 0.07 },
  dust: { colors: [0xe9dcc3, 0xd8c9ad], count: 8, speed: 2.2, up: 0.8, gravity: 0.5, life: 0.6, size: 0.16 },
  stars: { colors: [0xffd43b, 0xfff3bf, 0xff922b], count: 10, speed: 4.5, up: 3.5, gravity: 6, life: 0.7, size: 0.12 },
  splash: { colors: [0xbfe8ff, 0xffffff, 0x9ad5f5], count: 12, speed: 3, up: 4.5, gravity: 13, life: 0.8, size: 0.09 },
  hearts: { colors: [0xff8fab, 0xffc2d1], count: 6, speed: 1.2, up: 2.4, gravity: -0.5, life: 1.1, size: 0.13 },
  steam: { colors: [0xffffff, 0xf3f0ec, 0xe9e6e2], count: 5, speed: 0.35, up: 1.6, gravity: -0.9, life: 1.8, size: 0.26 },
  petals: { colors: [0xffd6e4, 0xffe8b8, 0xf6c1d2, 0xe8f5c8], count: 10, speed: 0.6, up: -0.2, gravity: 0.35, life: 5, size: 0.1 },
  confetti: { colors: [0xff6b6b, 0xffd43b, 0x69db7c, 0x74c0fc, 0xda77f2], count: 40, speed: 5, up: 7, gravity: 6, life: 2.2, size: 0.11 },
} satisfies Record<string, PuffStyle>;

export type PuffKind = keyof typeof PUFFS;

/** Pooled particles in one InstancedMesh (one draw call): feathers, crumbs, dust, stars, splashes, confetti. */
export class Puffs {
  readonly mesh: THREE.InstancedMesh;
  private readonly n: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly total: Float32Array;
  private readonly grav: Float32Array;
  private readonly size: Float32Array;
  private readonly spin: Float32Array;
  private next = 0;
  private seed = 7;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly s = new THREE.Vector3();
  private readonly p = new THREE.Vector3();
  private readonly c = new THREE.Color();
  enabled = true;

  constructor(capacity = 160) {
    this.n = capacity;
    this.mesh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ flatShading: true }), capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.total = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
    this.m.makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) {
      this.mesh.setMatrixAt(i, this.m);
      this.mesh.setColorAt(i, this.c.setHex(0xffffff));
    }
  }

  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 2 ** 32;
  }

  /** Live particles (for tests). */
  get active(): number {
    let k = 0;
    for (let i = 0; i < this.n; i++) if (this.life[i] > 0) k++;
    return k;
  }

  burst(kind: PuffKind, at: { x: number; y: number; z: number }, scale = 1): void {
    if (!this.enabled) return;
    const st: PuffStyle = PUFFS[kind];
    const count = Math.max(1, Math.round(st.count * scale));
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.n;
      const a = this.rnd() * Math.PI * 2;
      const sp = st.speed * (0.4 + this.rnd() * 0.6);
      this.pos.set([at.x, at.y, at.z], i * 3);
      this.vel.set([Math.cos(a) * sp, st.up * (0.5 + this.rnd() * 0.7), Math.sin(a) * sp], i * 3);
      this.life[i] = this.total[i] = st.life * (0.7 + this.rnd() * 0.5);
      this.grav[i] = st.gravity;
      this.size[i] = st.size * (0.7 + this.rnd() * 0.6);
      this.spin[i] = (this.rnd() - 0.5) * 14;
      this.mesh.setColorAt(i, this.c.setHex(st.colors[Math.floor(this.rnd() * st.colors.length)]));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let any = false;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      const j = i * 3;
      this.vel[j + 1] -= this.grav[i] * dt;
      this.vel[j] *= 1 - 1.5 * dt;
      this.vel[j + 2] *= 1 - 1.5 * dt;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] = Math.max(0.03, this.pos[j + 1] + this.vel[j + 1] * dt);
      this.pos[j + 2] += this.vel[j + 2] * dt;
      const k = this.life[i] <= 0 ? 0 : this.size[i] * Math.min(1, this.life[i] / (this.total[i] * 0.4));
      const age = this.total[i] - this.life[i];
      this.e.set(age * this.spin[i], age * this.spin[i] * 0.7, 0);
      this.m.compose(this.p.set(this.pos[j], this.pos[j + 1], this.pos[j + 2]), this.q.setFromEuler(this.e), this.s.set(k, k * 0.5, k));
      this.mesh.setMatrixAt(i, this.m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

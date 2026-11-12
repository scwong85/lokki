import * as THREE from 'three';

interface Shard {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
}

/** Visual-only shards for things that break (no physics, short-lived). */
export class Debris {
  readonly group = new THREE.Group();
  private shards: Shard[] = [];
  private seed = 99;

  constructor(capacity = 48) {
    const geo = new THREE.BoxGeometry(0.06, 0.03, 0.08);
    for (let i = 0; i < capacity; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x9bd8b0, flatShading: true }));
      mesh.visible = false;
      this.group.add(mesh);
      this.shards.push({ mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 });
    }
  }

  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 2 ** 32;
  }

  burst(p: { x: number; y: number; z: number }, color: number, count = 12): void {
    let spawned = 0;
    for (const s of this.shards) {
      if (s.life > 0) continue;
      s.life = 1.2 + this.rnd() * 0.6;
      s.mesh.position.set(p.x, p.y, p.z);
      (s.mesh.material as THREE.MeshLambertMaterial).color.setHex(color);
      s.vel.set((this.rnd() - 0.5) * 6, 2 + this.rnd() * 4, (this.rnd() - 0.5) * 6);
      s.spin.set(this.rnd() * 10, this.rnd() * 10, this.rnd() * 10);
      s.mesh.visible = true;
      if (++spawned >= count) break;
    }
  }

  update(dt: number): void {
    for (const s of this.shards) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.vel.y -= 14 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.spin.x * dt;
      s.mesh.rotation.z += s.spin.z * dt;
      if (s.mesh.position.y < 0.03) {
        s.mesh.position.y = 0.03;
        s.vel.set(s.vel.x * 0.4, 0, s.vel.z * 0.4);
        s.spin.multiplyScalar(0.3);
      }
      if (s.life <= 0) s.mesh.visible = false;
    }
  }
}

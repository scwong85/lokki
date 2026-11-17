import { tuning } from '../core/tuning';

/**
 * A park dog. It chases gulls on the ground (never in the air), fetches loose balls straight across whatever is in the way
 * (food flies off picnics), and brings them back to its owner. Pure logic: the caller moves the ball it carries.
 */
export type DogMode = 'idle' | 'chase' | 'fetch' | 'return';

export interface DogBall {
  id: number;
  x: number;
  z: number;
  y: number;
}

export interface DogGull {
  x: number;
  y: number;
  z: number;
  grounded: boolean;
}

export type DogEvent =
  | { type: 'pickup'; id: number }
  | { type: 'drop'; x: number; z: number }
  | { type: 'bark' }
  | { type: 'bite'; gull: number; x: number; z: number };

export class Dog {
  x: number;
  z: number;
  heading = 0;
  mode: DogMode = 'idle';
  carrying: number | null = null;
  /** True while running fast (the caller scatters food near it). */
  running = false;
  private biteCd = 0;
  private alertT = 0;
  private alertX = 0;
  private alertZ = 0;
  private wanderT = 0;
  private wanderX = 0;
  private wanderZ = 0;

  constructor(readonly homeX: number, readonly homeZ: number, readonly ownerX: number, readonly ownerZ: number) {
    this.x = homeX;
    this.z = homeZ;
    this.wanderX = homeX;
    this.wanderZ = homeZ;
  }

  /** A honk (or a shout): the dog bounds over to the spot, straight through whatever is in the way. */
  summon(x: number, z: number, seconds = 6): void {
    this.alertT = seconds;
    this.alertX = x;
    this.alertZ = z;
  }

  private moveTo(tx: number, tz: number, speed: number, dt: number): number {
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    if (d > 1e-3) {
      const step = Math.min(d, speed * dt);
      this.x += (dx / d) * step;
      this.z += (dz / d) * step;
      this.heading = Math.atan2(dx, dz);
    }
    return d;
  }

  update(dt: number, gulls: readonly DogGull[], balls: readonly DogBall[]): DogEvent[] {
    const ev: DogEvent[] = [];
    const t = tuning.dog;
    this.biteCd = Math.max(0, this.biteCd - dt);
    this.running = false;
    if (this.mode === 'return') {
      this.running = true;
      if (this.moveTo(this.ownerX, this.ownerZ, t.speed.value, dt) < 1.4) {
        ev.push({ type: 'drop', x: this.x, z: this.z });
        this.carrying = null;
        this.mode = 'idle';
      }
      return ev;
    }
    if (this.alertT > 0 && this.mode !== 'fetch') {
      this.alertT -= dt;
      this.running = true;
      if (this.mode !== 'chase') this.mode = 'chase';
      if (this.moveTo(this.alertX, this.alertZ, t.speed.value, dt) < 1.6) this.alertT = 0;
      return ev;
    }
    // chase a gull on the ground
    let chase = -1;
    let best = t.chaseRadius.value;
    gulls.forEach((g, i) => {
      if (!g.grounded || g.y > 1.4) return;
      const d = Math.hypot(g.x - this.x, g.z - this.z);
      if (d < best) { best = d; chase = i; }
    });
    if (chase >= 0 && this.mode !== 'fetch') {
      if (this.mode !== 'chase') ev.push({ type: 'bark' });
      this.mode = 'chase';
      this.running = true;
      const g = gulls[chase];
      if (this.moveTo(g.x, g.z, t.speed.value, dt) < 1.6 && this.biteCd <= 0) {
        this.biteCd = 2;
        ev.push({ type: 'bite', gull: chase, x: g.x - this.x, z: g.z - this.z });
      }
      return ev;
    }
    if (this.mode === 'chase') this.mode = 'idle';
    // fetch the nearest loose ball
    let near: DogBall | null = null;
    let nd = t.fetchRadius.value;
    for (const b of balls) {
      if (b.y > 1.3) continue;
      const d = Math.hypot(b.x - this.x, b.z - this.z);
      if (d < nd) { nd = d; near = b; }
    }
    if (near) {
      this.mode = 'fetch';
      this.running = true;
      if (this.moveTo(near.x, near.z, t.speed.value, dt) < 0.8) {
        this.carrying = near.id;
        this.mode = 'return';
        ev.push({ type: 'pickup', id: near.id });
      }
      return ev;
    }
    if (this.mode === 'fetch') this.mode = 'idle';
    // idle: potter about near home
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 2 + (Math.abs(Math.sin(this.x * 12.9 + this.z * 78.2 + this.wanderT)) * 3);
      const a = Math.abs(Math.sin(this.x * 3.1 + this.z * 1.7 + this.wanderT * 5.3)) * Math.PI * 2;
      this.wanderX = this.homeX + Math.cos(a) * t.idleWander.value;
      this.wanderZ = this.homeZ + Math.sin(a) * t.idleWander.value;
    }
    this.moveTo(this.wanderX, this.wanderZ, t.speed.value * 0.25, dt);
    return ev;
  }
}

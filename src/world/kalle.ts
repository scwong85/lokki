import * as THREE from 'three';
import { GullModel } from '../gull/model';
import { skinById } from '../data/gullSkins';
import { computePose } from '../gull/pose';
import { tuning } from '../core/tuning';
import { newKalle, stepKalle, type Kalle, type KalleEvent, type Snack } from '../gameplay/kalle';

/** Kalle in the world: the logic plus a gull model in a darker look so he can be told apart. */
export class KalleView {
  readonly group = new THREE.Group();
  readonly kalle: Kalle;
  private model = new GullModel();
  private time = 0;
  private flapAnim = 99;
  private prev = { x: 0, y: 0, z: 0 };

  constructor(readonly perch: { x: number; z: number }, readonly goal: number) {
    this.kalle = newKalle(perch);
    this.model.setSkin(skinById('juvenile').colours); // browner than the player's gull
    this.group.add(this.model.root);
    this.group.visible = true;
    this.group.position.set(perch.x, 0.6, perch.z);
  }

  step(dt: number, snacks: readonly Snack[], gulls: readonly { x: number; y: number; z: number; diving: boolean }[]): KalleEvent[] {
    this.prev = { x: this.kalle.x, y: this.kalle.y, z: this.kalle.z };
    return stepKalle(this.kalle, snacks, gulls, this.perch, dt);
  }

  /** Where he is, for carrying the snack in his beak. */
  beak(): { x: number; y: number; z: number } {
    const k = this.kalle;
    return { x: k.x - Math.sin(k.heading) * 0.45, y: k.y - 0.05, z: k.z - Math.cos(k.heading) * 0.45 };
  }

  /** From the host's news (a guest does not run him). */
  setRemote(x: number, y: number, z: number, heading: number, mode: Kalle['mode']): void {
    this.prev = { x: this.kalle.x, y: this.kalle.y, z: this.kalle.z };
    Object.assign(this.kalle, { x, y, z, heading, mode });
  }

  render(dt: number): void {
    const k = this.kalle;
    this.time += dt;
    this.flapAnim += dt;
    const flying = k.mode !== 'perch' || k.y > 1.2;
    if (flying && this.flapAnim > tuning.flight.flapInterval.value) this.flapAnim = 0;
    this.group.position.set(k.x, k.y, k.z);
    this.group.rotation.y = k.heading;
    const sp = Math.hypot(k.x - this.prev.x, k.z - this.prev.z) / Math.max(dt, 1e-3);
    this.model.apply(
      computePose({ mode: flying ? 'air' : 'ground', stunned: false, hspeed: sp, walkPhase: this.time * 4, flapAnim: this.flapAnim, flapDuration: tuning.flight.flapInterval.value, heightAbove: k.y, turnRate: 0, bodyPitch: 0, beakOpen: k.mode === 'flee', time: this.time }),
      dt,
    );
  }
}

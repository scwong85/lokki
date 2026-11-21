import { tuning } from '../core/tuning';

/**
 * The Pigeon Gang of Senate Square. They live on the statue and chase lone gulls away from it. Feed them a bun and they become
 * friends (they let you perch on the emperor); drop salmiakki and they scatter for a while (the statue is free). Pure logic.
 */
export type GangMode = 'guarding' | 'friends' | 'scattered';

export interface GangEvent {
  type: 'befriended' | 'fed' | 'scattered' | 'back' | 'chase';
}

export interface GangDef {
  /** The statue the gang sits on. */
  x: number;
  z: number;
  /** Height of what they sit on (a roof picnic, M107; default the ground). */
  y?: number;
  /** How far round the spot they sit (default 3.2 m). */
  ring?: number;
}

export interface Dropped {
  type: string;
  x: number;
  z: number;
}

export class PigeonGang {
  mode: GangMode = 'guarding';
  private awayT = 0;
  private chaseCd = 0;
  /** True once the gang has been friends at some point (forgives a later scatter). */
  wasFriends = false;

  constructor(readonly def: GangDef) {}

  /**
   * Advance. `gull`: the gull's position (or null when it is disguised as a pigeon: they ignore it).
   * Returns events and, when chasing, the horizontal shove to apply to the gull.
   */
  /** A honk: pigeons near the gull take off for a while. */
  honk(x: number, z: number, range: number): void {
    if (this.mode === 'scattered') return;
    if (Math.hypot(x - this.def.x, z - this.def.z) > range) return;
    this.mode = 'scattered';
    this.awayT = tuning.pigeons.scatterSeconds.value * 0.5;
  }

  update(dt: number, gull: { x: number; z: number } | null, dropped: Dropped[]): { events: GangEvent[]; shove: { x: number; z: number } | null } {
    const events: GangEvent[] = [];
    const t = tuning.pigeons;
    this.chaseCd = Math.max(0, this.chaseCd - dt);
    for (const d of dropped) {
      if (Math.hypot(d.x - this.def.x, d.z - this.def.z) > t.guardRadius.value + t.feedRadius.value) continue;
      if (d.type === 'bun' && this.mode !== 'friends') {
        this.mode = 'friends';
        this.wasFriends = true;
        this.awayT = 0;
        events.push({ type: 'befriended' });
      } else if (d.type === 'bun' && this.mode === 'friends') {
        events.push({ type: 'fed' }); // already friends (Pigeon Diplomacy): they still take the bun, and it still counts as winning them over
      } else if (d.type === 'salmiakki' && this.mode !== 'scattered') {
        this.mode = 'scattered';
        this.awayT = t.scatterSeconds.value;
        events.push({ type: 'scattered' });
      }
    }
    if (this.mode === 'scattered') {
      this.awayT -= dt;
      if (this.awayT <= 0) {
        this.mode = this.wasFriends ? 'friends' : 'guarding';
        events.push({ type: 'back' });
      }
    }
    let shove: { x: number; z: number } | null = null;
    if (this.mode === 'guarding' && gull) {
      const dx = gull.x - this.def.x, dz = gull.z - this.def.z;
      const d = Math.hypot(dx, dz);
      if (d < t.guardRadius.value) {
        const k = (t.shove.value * dt) / Math.max(d, 0.5);
        shove = { x: dx * k, z: dz * k };
        if (this.chaseCd <= 0) {
          this.chaseCd = 4;
          events.push({ type: 'chase' });
        }
      }
    }
    return { events, shove };
  }
}

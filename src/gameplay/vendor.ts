import { tuning } from '../core/tuning';
import type { World } from '../world/collision';
import { bearing, canSee, type GullInfo, type Noise } from './npc';

/**
 * Market vendor with a spray bottle: stands at the stall, wakes up when the city is on alert (or the gull
 * gets close), aims, then fires. The windup gives the gull time to dodge; a poop in the face disables the vendor for a while.
 */
export type VendorMode = 'idle' | 'alert' | 'windup' | 'recover' | 'asleep';

export interface Vendor {
  id: number;
  x: number;
  z: number;
  /** Where the stall faces (rest heading). */
  homeHeading: number;
  heading: number;
  mode: VendorMode;
  t: number;
  /** Spray cooldown. */
  cd: number;
  seesGull: boolean;
  lostT: number;
  /** Aim point locked at the end of the windup. */
  aimX: number;
  aimZ: number;
  /** For the model's mode field. */
  moving: boolean;
  /** Looking at a noise (a decoy flock, a crow call): ignores the gull for a moment. */
  distractT: number;
  noiseX: number;
  noiseZ: number;
  /** Night market: goes back to sleep when it has been quiet for a while. */
  sleepy: boolean;
  /** Seconds of quiet since waking. */
  quietT: number;
}

export type VendorEvent =
  | { type: 'noticed'; vendor: Vendor }
  | { type: 'spray'; vendor: Vendor; hit: boolean; dx: number; dz: number }
  | { type: 'dodged'; vendor: Vendor }
  | { type: 'distracted'; vendor: Vendor }
  | { type: 'woke'; vendor: Vendor };

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function newVendor(id: number, x: number, z: number, heading: number): Vendor {
  return { id, x, z, homeHeading: heading, heading, mode: 'idle', t: 0, cd: 0, seesGull: false, lostT: 0, aimX: 0, aimZ: 0, moving: false, distractT: 0, noiseX: 0, noiseZ: 0, sleepy: false, quietT: 0 };
}

/** Is the gull inside the spray cone and range if the vendor aims at (aimX,aimZ)? */
export function inSpray(v: Vendor, g: { x: number; y: number; z: number }, aimX: number, aimZ: number): boolean {
  const d = tuning.deter;
  const dist = Math.hypot(g.x - v.x, g.z - v.z);
  if (dist > d.sprayRange.value || g.y > 4.5) return false;
  const aim = bearing(aimX - v.x, aimZ - v.z);
  return Math.abs(angleDiff(bearing(g.x - v.x, g.z - v.z), aim)) <= (d.sprayConeDeg.value * Math.PI) / 360;
}

export function stepVendor(v: Vendor, g: GullInfo, alert: boolean, dt: number, world: World, noises: readonly Noise[] = []): VendorEvent[] {
  const ev: VendorEvent[] = [];
  const d = tuning.deter;
  v.t += dt;
  v.cd = Math.max(0, v.cd - dt);
  v.distractT = Math.max(0, v.distractT - dt);
  if (v.mode === 'asleep') {
    // asleep: ignores a gull flying past, wakes at a loud noise nearby or a gull right next to him
    const woken = noises.some((s) => s.loud >= tuning.deter.wakeLoud.value && Math.hypot(s.x - v.x, s.z - v.z) <= tuning.npc.hearRange.value * s.loud * 0.5) || Math.hypot(g.x - v.x, g.z - v.z) < tuning.deter.wakeDistance.value;
    if (woken) {
      v.mode = 'idle';
      v.t = 0;
      v.quietT = 0;
      ev.push({ type: 'woke', vendor: v });
    }
    return ev;
  }
  if (v.sleepy && v.mode === 'idle' && v.seesGull === false) {
    v.quietT += dt;
    if (v.quietT > tuning.deter.sleepAfter.value) {
      v.mode = 'asleep';
      v.quietT = 0;
      return ev;
    }
  }
  for (const s of noises) {
    if (v.mode !== 'windup' && v.mode !== 'recover' && Math.hypot(s.x - v.x, s.z - v.z) <= tuning.npc.hearRange.value * s.loud) {
      if (v.distractT <= 0) ev.push({ type: 'distracted', vendor: v });
      v.distractT = tuning.deter.vendorDistract.value;
      v.noiseX = s.x;
      v.noiseZ = s.z;
      if (v.mode === 'alert') v.mode = 'idle';
    }
  }
  const dist = Math.hypot(g.x - v.x, g.z - v.z);
  const wasSeeing = v.seesGull;
  v.seesGull = v.distractT <= 0 && canSee(v, g, world); // looking at the noise: the gull goes unseen
  const turn = tuning.npc.turnRate.value * dt;
  const face = (x: number, z: number) => {
    v.heading += Math.max(-turn, Math.min(turn, angleDiff(bearing(x - v.x, z - v.z), v.heading)));
  };

  switch (v.mode) {
    case 'idle':
      if (v.distractT > 0) face(v.noiseX, v.noiseZ);
      else v.heading += Math.max(-turn, Math.min(turn, angleDiff(v.homeHeading, v.heading)));
      if (v.seesGull && (alert || dist < 6)) {
        v.mode = 'alert';
        v.t = 0;
        v.lostT = 0;
        if (!wasSeeing) ev.push({ type: 'noticed', vendor: v });
      }
      break;
    case 'alert': {
      face(g.x, g.z);
      if (v.seesGull) v.lostT = 0;
      else v.lostT += dt;
      if (v.lostT > 2.5) {
        v.mode = 'idle';
        v.t = 0;
        break;
      }
      // fire when the gull is low, in range and the vendor is already facing it
      if (v.seesGull && v.cd <= 0 && inSpray(v, g, g.x, g.z) && Math.abs(angleDiff(bearing(g.x - v.x, g.z - v.z), v.heading)) < 0.5) {
        v.mode = 'windup';
        v.t = 0;
        v.aimX = g.x;
        v.aimZ = g.z;
      }
      break;
    }
    case 'windup':
      // keep tracking for the first half of the windup, then lock the aim: moving away in time dodges it
      if (v.t < d.sprayWindup.value * 0.5) {
        v.aimX = g.x;
        v.aimZ = g.z;
      }
      face(v.aimX, v.aimZ);
      if (v.t >= d.sprayWindup.value) {
        const hit = inSpray(v, g, v.aimX, v.aimZ);
        const away = bearing(g.x - v.x, g.z - v.z);
        ev.push({ type: 'spray', vendor: v, hit, dx: -Math.sin(away), dz: -Math.cos(away) });
        if (!hit) ev.push({ type: 'dodged', vendor: v });
        v.cd = d.sprayCooldown.value;
        v.mode = 'recover';
        v.t = 0;
      }
      break;
    case 'recover':
      if (v.t >= 0.6) {
        v.mode = 'alert';
        v.t = 0;
      }
      break;
  }
  return ev;
}

/** Pooped on: out of action for a few seconds. */
export function vendorPooped(v: Vendor): void {
  v.mode = 'recover';
  v.t = -3.4; // recovers after ~4 s in total
  v.cd = Math.max(v.cd, 4);
}

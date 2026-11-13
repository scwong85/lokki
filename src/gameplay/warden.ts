import { tuning } from '../core/tuning';
import type { Rng } from '../core/rng';
import type { World } from '../world/collision';
import { bearing, canSee, type GullInfo, type Noise } from './npc';

/**
 * The Gull Warden (invented nemesis): a hi-vis inspector with an umbrella. Patrols the square, hunts the gull
 * when he sees it and swats it away with the umbrella. While the umbrella is up it covers his head from above;
 * it goes down when he is distracted by a noise, swatting, or sulking after a poop.
 */
export type WardenMode = 'patrol' | 'alert' | 'hunt' | 'swat' | 'recover';

export interface Warden {
  x: number;
  z: number;
  heading: number;
  mode: WardenMode;
  t: number;
  wp: number;
  cd: number;
  distractT: number;
  /** Umbrella stays down while this is above zero (he is exposed, plus a delay after he recovers). */
  exposedT: number;
  noiseX: number;
  noiseZ: number;
  seesGull: boolean;
  lostT: number;
  moving: boolean;
  speed: number;
  walkPhase: number;
  /** Where the umbrella was aimed when the swat started. */
  aimX: number;
  aimZ: number;
}

export type WardenEvent =
  | { type: 'noticed' }
  | { type: 'swat'; hit: boolean; dx: number; dz: number }
  | { type: 'dodged' }
  | { type: 'distracted' };

export interface WardenCtx {
  world: World;
  walkable: (x: number, z: number) => boolean;
  patrol: readonly [number, number][];
  rng: Rng;
}

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function newWarden(x: number, z: number): Warden {
  return { x, z, heading: 0, mode: 'patrol', t: 0, wp: 0, cd: 0, distractT: 0, exposedT: 0, noiseX: 0, noiseZ: 0, seesGull: false, lostT: 0, moving: false, speed: 0, walkPhase: 0, aimX: 0, aimZ: 0 };
}

/** Umbrella covers his head from above only while he is paying attention and not mid-swat or sulking. */
export function umbrellaUp(w: Warden): boolean {
  return w.distractT <= 0 && w.exposedT <= 0 && w.mode !== 'recover' && w.mode !== 'swat';
}

function walk(w: Warden, tx: number, tz: number, speed: number, dt: number, ctx: WardenCtx): boolean {
  const diff = angleDiff(bearing(tx - w.x, tz - w.z), w.heading);
  const turn = tuning.npc.turnRate.value * dt;
  w.heading += Math.max(-turn, Math.min(turn, diff));
  if (Math.abs(diff) > 1) return false;
  const nx = w.x - Math.sin(w.heading) * speed * dt;
  const nz = w.z - Math.cos(w.heading) * speed * dt;
  if (!ctx.walkable(nx, nz)) return false;
  w.x = nx;
  w.z = nz;
  w.speed = speed;
  return true;
}

function face(w: Warden, x: number, z: number, dt: number): void {
  const turn = tuning.npc.turnRate.value * dt;
  w.heading += Math.max(-turn, Math.min(turn, angleDiff(bearing(x - w.x, z - w.z), w.heading)));
}

export function stepWarden(w: Warden, g: GullInfo, noises: readonly Noise[], dt: number, ctx: WardenCtx): WardenEvent[] {
  const ev: WardenEvent[] = [];
  const d = tuning.deter;
  w.t += dt;
  w.cd = Math.max(0, w.cd - dt);
  w.distractT = Math.max(0, w.distractT - dt);
  w.speed = 0;
  const wasSeeing = w.seesGull;
  w.seesGull = canSee(w, g, ctx.world);
  const dist = Math.hypot(g.x - w.x, g.z - w.z);

  for (const s of noises) {
    if (w.mode === 'recover' || w.mode === 'swat') continue;
    if (Math.hypot(s.x - w.x, s.z - w.z) <= tuning.npc.hearRange.value * s.loud) {
      w.noiseX = s.x;
      w.noiseZ = s.z;
      w.distractT = d.wardenDistract.value;
      ev.push({ type: 'distracted' });
    }
  }

  switch (w.mode) {
    case 'patrol': {
      if (w.distractT > 0) face(w, w.noiseX, w.noiseZ, dt);
      else {
        const [tx, tz] = ctx.patrol[w.wp % ctx.patrol.length];
        w.moving = walk(w, tx, tz, d.wardenPatrolSpeed.value, dt, ctx);
        if (Math.hypot(tx - w.x, tz - w.z) < 1.2) w.wp++;
      }
      if (w.seesGull && w.distractT <= 0) {
        w.mode = 'alert';
        w.t = 0;
        w.lostT = 0;
        if (!wasSeeing) ev.push({ type: 'noticed' });
      }
      break;
    }
    case 'alert':
      face(w, g.x, g.z, dt);
      if (w.t >= 0.6) {
        w.mode = 'hunt';
        w.t = 0;
      }
      break;
    case 'hunt': {
      if (w.distractT > 0) {
        face(w, w.noiseX, w.noiseZ, dt);
        break;
      }
      if (w.seesGull) w.lostT = 0;
      else w.lostT += dt;
      if (dist > d.wardenSwatRange.value * 0.8) w.moving = walk(w, g.x, g.z, d.wardenSpeed.value, dt, ctx);
      else face(w, g.x, g.z, dt);
      if (dist <= d.wardenSwatRange.value && g.y < 2.8 && w.cd <= 0) {
        w.mode = 'swat';
        w.t = 0;
        w.aimX = g.x;
        w.aimZ = g.z;
      }
      if (w.lostT > 4) {
        w.mode = 'patrol';
        w.t = 0;
      }
      break;
    }
    case 'swat': {
      face(w, w.aimX, w.aimZ, dt);
      if (w.t >= d.wardenSwatWindup.value) {
        const hit = Math.hypot(g.x - w.aimX, g.z - w.aimZ) < 1.6 && Math.hypot(g.x - w.x, g.z - w.z) < d.wardenSwatRange.value + 0.8 && g.y < 3;
        const away = bearing(g.x - w.x, g.z - w.z);
        ev.push({ type: 'swat', hit, dx: -Math.sin(away), dz: -Math.cos(away) });
        if (!hit) ev.push({ type: 'dodged' });
        w.cd = d.wardenSwatCooldown.value;
        w.mode = 'hunt';
        w.t = 0;
      }
      break;
    }
    case 'recover':
      face(w, g.x, g.z, dt);
      if (w.t >= d.wardenSulk.value) {
        w.mode = 'patrol';
        w.t = 0;
      }
      break;
  }
  // exposed while distracted, swatting or sulking, and for a while after: that is the window to poop him
  if (w.distractT > 0 || w.mode === 'swat' || w.mode === 'recover') w.exposedT = d.umbrellaDelay.value;
  else w.exposedT = Math.max(0, w.exposedT - dt);
  w.walkPhase += w.speed * dt * 2.2;
  w.moving = w.speed > 0;
  return ev;
}

/** Hit by poop: humiliated and out of action for a while. */
export function wardenPooped(w: Warden): void {
  w.mode = 'recover';
  w.t = 0;
  w.cd = 3;
}

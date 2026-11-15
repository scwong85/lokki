import { tuning } from '../core/tuning';
import { mods, staminaMax } from '../core/skillMods';
import type { World } from '../world/collision';
import { windAt } from './wind';
import { bestAimTarget, type Target } from '../gameplay/targets';

export const GULL_RADIUS = 0.5;

export type Mode = 'ground' | 'air' | 'dive';

export interface FlightState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Facing, radians. 0 = -Z. Forward vector = (-sin h, -cos h). */
  heading: number;
  /** Signed heading change rate (rad/s), for visuals. */
  turnRate: number;
  mode: Mode;
  stamina: number;
  stunT: number;
  flapCd: number;
  hopCd: number;
  diveT: number;
  diveCd: number;
  /** Current dive steepness (rad below horizontal). */
  diveAngle: number;
  /** Seconds since the last flap (wing animation). */
  flapAnim: number;
  perched: boolean;
  /** Height of the gull's underside above the surface below. */
  heightAbove: number;
  /** Sitting on (or just above) the sea: set by the caller each step. Swimming is slower and landings are splashes. */
  overWater: boolean;
}

export interface FlightInput {
  /** right / forward axes in [-1,1], camera-relative. */
  ax: number;
  ay: number;
  flap: boolean;
  dive: boolean;
  /** Camera pitch: aims dive steepness. */
  aimPitch: number;
  /** kg in the beak: weakens flapping. */
  carryMass?: number;
}

export type FlightEvent =
  | { type: 'flap' }
  | { type: 'hop' }
  | { type: 'exhausted' }
  | { type: 'diveStart' }
  | { type: 'diveEnd' }
  | { type: 'land'; impact: number; quality: 'soft' | 'rough' | 'hard'; perch: boolean; water?: boolean }
  | { type: 'bonk'; impact: number };

export function newFlightState(x = 0, z = 0): FlightState {
  return {
    x, y: GULL_RADIUS, z, vx: 0, vy: 0, vz: 0, heading: 0, turnRate: 0, mode: 'ground',
    stamina: staminaMax(), stunT: 0, flapCd: 0, hopCd: 0, diveT: 0, diveCd: 0, diveAngle: 0.7,
    flapAnim: 99, perched: false, heightAbove: 0, overWater: false,
  };
}

/** Dive steepness the player is aiming for, from camera pitch. */
export function aimDiveAngle(aimPitch: number): number {
  const d = tuning.dive;
  const span = Math.max(1e-3, d.pitchHigh.value - d.pitchLow.value);
  const t = Math.min(1, Math.max(0, (aimPitch - d.pitchLow.value) / span));
  return ((d.minAngleDeg.value + (d.maxAngleDeg.value - d.minAngleDeg.value) * t) * Math.PI) / 180;
}

/** Where a dive along (heading, angle) from the gull would hit the world. Null if nothing within range. */
export function divePreview(
  s: { x: number; y: number; z: number },
  heading: number,
  angle: number,
  world: World,
): { x: number; y: number; z: number } | null {
  const dx = -Math.sin(heading) * Math.cos(angle);
  const dy = -Math.sin(angle);
  const dz = -Math.cos(heading) * Math.cos(angle);
  const step = 0.4;
  let x = s.x;
  let y = s.y;
  let z = s.z;
  for (let i = 0; i < 400; i++) {
    x += dx * step;
    y += dy * step;
    z += dz * step;
    if (world.solidAt(x, y, z)) return { x, y: Math.max(0, y), z };
  }
  return null;
}

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Camera-relative stick -> world direction (unit-ish). Camera looks toward (-sin yaw, -cos yaw). */
function worldDir(ax: number, ay: number, camYaw: number): { wx: number; wz: number; len: number } {
  const len = Math.hypot(ax, ay);
  if (len === 0) return { wx: 0, wz: 0, len: 0 };
  const nx = ax / Math.max(1, len);
  const ny = ay / Math.max(1, len);
  const c = Math.cos(camYaw);
  const s = Math.sin(camYaw);
  return { wx: nx * c - ny * s, wz: -nx * s - ny * c, len };
}

/** One fixed simulation step of walking, flying, diving and landing. Pure logic: no rendering. */
/**
 * Landing assist (the "landing magnet"): when a slow-ish, descending gull heads for a perch top, turn its heading toward
 * the landing spot (harder when closer) and flare when it's within 2.5 m, so it settles on the perch instead of
 * overshooting. Returns the new heading and whether to flare. Pure.
 */
export function magnetSteer(
  g: { x: number; z: number; heading: number },
  target: { x: number; z: number },
  strength: number,
  range: number,
  dt: number,
): { heading: number; flare: boolean } {
  const dx = target.x - g.x, dz = target.z - g.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return { heading: g.heading, flare: true };
  const turn = strength * 0.35 * (0.5 + 0.5 * (1 - Math.min(1, d / Math.max(range, 1e-3)))) * dt;
  const want = Math.atan2(-dx, -dz);
  return { heading: g.heading + clamp(angleDiff(want, g.heading), -turn, turn), flare: d < 2.5 };
}

/** Is the gull heading toward the spot (not just flying past it)? */
export const headingToward = (g: { x: number; z: number; vx: number; vz: number }, t: { x: number; z: number }): boolean => {
  const dx = t.x - g.x, dz = t.z - g.z;
  const d = Math.hypot(dx, dz), sp = Math.hypot(g.vx, g.vz);
  return d < 0.5 || sp < 0.5 || (dx * g.vx + dz * g.vz) / (d * sp) > 0.25;
};

export function stepFlight(
  s: FlightState,
  inp: FlightInput,
  camYaw: number,
  dt: number,
  world: World,
  time: number,
  targets: readonly Target[] = [],
): FlightEvent[] {
  const ev: FlightEvent[] = [];
  const f = tuning.flight;
  const d = tuning.dive;
  const w = tuning.walk;
  const l = tuning.landing;

  s.flapCd = Math.max(0, s.flapCd - dt);
  s.hopCd = Math.max(0, s.hopCd - dt);
  s.diveCd = Math.max(0, s.diveCd - dt);
  s.flapAnim += dt;
  const stunned = s.stunT > 0;
  s.stunT = Math.max(0, s.stunT - dt);
  const ctl: FlightInput = stunned ? { ax: 0, ay: 0, flap: false, dive: false, aimPitch: inp.aimPitch, carryMass: inp.carryMass } : inp;

  const surf = world.surfaceBelow(s.x, s.z, s.y - GULL_RADIUS + 0.05);
  s.heightAbove = Math.max(0, s.y - GULL_RADIUS - surf.y);
  const wasGrounded = s.mode === 'ground';
  const prevHeading = s.heading;

  if (s.mode === 'ground') {
    // ---- walking (or paddling, slower) ----
    const { wx, wz, len } = worldDir(ctl.ax, ctl.ay, camYaw);
    const walkSpeed = w.speed.value * (s.overWater ? tuning.water.swimSpeed.value : 1);
    const spBefore = Math.hypot(s.vx, s.vz);
    if (len > 0) {
      s.vx += wx * w.accel.value * dt;
      s.vz += wz * w.accel.value * dt;
      // acceleration may steer but never push past walk speed (or the speed we landed with)
      const cap = Math.max(walkSpeed, spBefore);
      const spNow = Math.hypot(s.vx, s.vz);
      if (spNow > cap) {
        s.vx *= cap / spNow;
        s.vz *= cap / spNow;
      }
    }
    const sp = Math.hypot(s.vx, s.vz);
    const decel = (len === 0 ? w.friction.value : 0) + (sp > walkSpeed ? l.groundDrag.value * (s.overWater ? 2 : 1) : 0);
    const floor = len === 0 ? 0 : walkSpeed;
    if (sp > 0) {
      const target = Math.max(floor, sp - decel * dt);
      const cur = Math.min(sp, Math.max(target, 0));
      s.vx *= cur / sp;
      s.vz *= cur / sp;
    }
    const sp2 = Math.hypot(s.vx, s.vz);
    if (sp2 > 0.2) {
      const diff = angleDiff(Math.atan2(-s.vx, -s.vz), s.heading);
      const maxTurn = w.turnRate.value * dt;
      s.heading += clamp(diff, -maxTurn, maxTurn);
    }
    s.vy -= f.gravity.value * dt; // keeps us pressed to the surface
    s.stamina += (s.perched ? f.perchRegen.value : f.groundRegen.value) * dt;
    if (ctl.flap && s.hopCd <= 0) {
      s.vy = w.hopSpeed.value;
      s.hopCd = w.hopInterval.value;
      s.flapCd = Math.max(s.flapCd, w.hopInterval.value);
      s.mode = 'air';
      s.perched = false;
      ev.push({ type: 'hop' });
    }
  } else {
    // ---- airborne (glide or dive) ----
    const diving = s.mode === 'dive';
    // gliding: W/A/D steer; diving: always aim along the camera, A/D bend the line
    const { wx, wz, len } = worldDir(ctl.ax, diving ? 1 : Math.max(ctl.ay, 0), camYaw);
    const flare = ctl.ay < 0;
    if (len > 0) {
      const diff = angleDiff(Math.atan2(-wx, -wz), s.heading);
      const rate = f.airTurnRate.value * (diving ? d.turnFactor.value : 1);
      s.heading += clamp(diff, -rate * dt, rate * dt);
    }

    if (diving) {
      s.diveT += dt;
      let aim = aimDiveAngle(ctl.aimPitch);
      const tgt = d.assistStrength.value > 0 ? bestAimTarget(targets, s, s.heading, s.diveAngle) : null;
      if (tgt) {
        // light aim assist: bend heading and steepness toward the target on the line
        const dx = tgt.x - s.x;
        const dz = tgt.z - s.z;
        const hd = Math.hypot(dx, dz);
        if (hd > 1.5) {
          const k = d.assistStrength.value * 4 * dt;
          s.heading += clamp(angleDiff(Math.atan2(-dx, -dz), s.heading), -k, k);
          const want = clamp(Math.atan2(s.y - tgt.y, hd), 0.1, 1.45);
          aim += (want - aim) * d.assistStrength.value;
        }
      }
      const ar = d.angleRate.value * dt;
      s.diveAngle += clamp(aim - s.diveAngle, -ar, ar);
      const a = s.diveAngle;
      const sp3 = Math.min(d.speed.value, Math.hypot(s.vx, s.vy, s.vz) + d.accel.value * dt);
      s.vx = -Math.sin(s.heading) * Math.cos(a) * sp3;
      s.vz = -Math.cos(s.heading) * Math.cos(a) * sp3;
      s.vy = -Math.sin(a) * sp3;
      if (s.diveT >= d.maxTime.value || (s.diveT >= d.minTime.value && !ctl.dive)) {
        // release: turn part of the dive speed into a swoop up
        s.vy = clamp(-s.vy * d.pullUpRatio.value, 0, f.maxClimb.value);
        s.mode = 'air';
        s.diveCd = d.cooldown.value;
        ev.push({ type: 'diveEnd' });
      }
    } else {
      // landing magnet: ease a descending gull onto a perch top it is heading for
      let autoFlare = false;
      const la = tuning.landing;
      if (!stunned && !ctl.flap && s.vy < 0 && la.magnet.value > 0 && Math.hypot(s.vx, s.vz) < la.magnetMaxSpeed.value) {
        const spot = world.perchNear(s.x, s.y - GULL_RADIUS, s.z, la.magnetRange.value, la.magnetHeight.value);
        if (spot && headingToward(s, spot)) {
          const m = magnetSteer(s, spot, la.magnet.value, la.magnetRange.value, dt);
          s.heading = m.heading;
          autoFlare = m.flare;
        }
      }
      // speed follows heading (glider model)
      let sp = Math.hypot(s.vx, s.vz);
      const target = flare || autoFlare ? f.flareSpeed.value : f.glideSpeed.value;
      sp = sp < target ? Math.min(target, sp + f.airAccel.value * dt) : Math.max(target, sp - f.airDrag.value * dt);

      s.vy -= f.gravity.value * dt;
      if (ctl.flap && s.flapCd <= 0) {
        s.flapCd = f.flapInterval.value;
        if (s.stamina >= f.flapCost.value) {
          s.stamina -= f.flapCost.value;
          const load = 1 / (1 + (ctl.carryMass ?? 0) * tuning.interaction.carryPenalty.value);
          s.vy = Math.min(f.maxClimb.value, Math.max(s.vy, 0) + f.flapImpulse.value * load * mods.flapImpulse);
          sp = Math.min(f.maxSpeed.value, sp + f.flapBoost.value);
          s.flapAnim = 0;
          ev.push({ type: 'flap' });
        } else {
          ev.push({ type: 'exhausted' });
        }
      }
      const sink = flare && s.heightAbove < l.assistHeight.value ? f.flareSink.value : f.glideSink.value * mods.glideSink;
      if (s.vy < -sink) s.vy = Math.min(-sink, s.vy + (f.gravity.value + d.pullOutRate.value) * dt);
      s.vx = -Math.sin(s.heading) * sp;
      s.vz = -Math.cos(s.heading) * sp;
      s.stamina += f.glideRegen.value * dt;

      if (ctl.dive && s.diveCd <= 0 && s.heightAbove >= d.minHeight.value) {
        s.mode = 'dive';
        s.diveT = 0;
        s.diveAngle = aimDiveAngle(ctl.aimPitch);
        ev.push({ type: 'diveStart' });
      }
    }
    s.perched = false;
  }
  s.stamina = clamp(s.stamina, 0, staminaMax());
  s.turnRate = angleDiff(s.heading, prevHeading) / dt;

  // ---- integrate ----
  if (s.mode !== 'ground') {
    const wind = windAt(time);
    s.x += wind.x * tuning.wind.airEffect.value * dt;
    s.z += wind.z * tuning.wind.airEffect.value * dt;
  }
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.z += s.vz * dt;

  // ---- collide ----
  const wasDive = s.mode === 'dive';
  const pos = { x: s.x, y: s.y, z: s.z };
  const contacts = world.collide(pos, GULL_RADIUS);
  s.x = pos.x;
  s.y = pos.y;
  s.z = pos.z;
  let grounded = false;
  let perch = false;
  for (const c of contacts) {
    const vn = s.vx * c.nx + s.vy * c.ny + s.vz * c.nz;
    if (vn >= 0) {
      if (c.ny > 0.6) grounded = true;
      if (c.ny > 0.6 && c.kind === 'perch') perch = true;
      continue;
    }
    const impact = -vn;
    s.vx -= vn * c.nx;
    s.vy -= vn * c.ny;
    s.vz -= vn * c.nz;
    if (c.kind === 'bound') continue; // invisible map edge: just stop, no stun
    if (c.ny > 0.6) {
      grounded = true;
      perch = perch || c.kind === 'perch';
      if (!wasGrounded && s.overWater && c.kind !== 'perch') {
        // splashdown: water is soft, whatever the speed
        if (wasDive) s.diveCd = d.cooldown.value;
        ev.push({ type: 'land', impact, quality: 'soft', perch: false, water: true });
      } else if (!wasGrounded) {
        const quality = impact < l.softSpeed.value ? 'soft' : impact < l.hardSpeed.value ? 'rough' : 'hard';
        if (quality === 'rough') s.stunT = l.stunSoft.value;
        if (quality === 'hard') s.stunT = wasDive ? l.diveStun.value : l.stunHard.value;
        if (wasDive) s.diveCd = d.cooldown.value;
        ev.push({ type: 'land', impact, quality, perch });
      }
    } else if (impact > l.bonkSpeed.value) {
      s.stunT = l.bonkStun.value;
      if (wasDive) s.diveCd = d.cooldown.value;
      s.mode = 'air';
      ev.push({ type: 'bonk', impact });
    }
  }
  if (grounded) {
    s.mode = 'ground';
    s.diveT = 0;
  } else if (s.mode === 'ground') {
    s.mode = 'air'; // walked off an edge
  }
  s.perched = grounded && perch;
  return ev;
}

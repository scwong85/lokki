import { tuning } from '../core/tuning';
import { mods, staminaMax } from '../core/skillMods';
import type { World } from '../world/collision';
import { windAt } from './wind';
import { bestAimTarget, type Target } from '../gameplay/targets';
import { edgeAhead, findLandSpot, landingStep, planLanding, type LandPlan, type LandSpot } from './landing';

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
  /** A ground jump in progress: walking-style control in the air until you press Space again (then you flap into flight). */
  jump: boolean;
  /** Was flap held last step (to tell a tap from a hold). */
  flapPrev: boolean;
  /** How long flap has been held on the ground (a hold takes off, a tap jumps). */
  flapHold: number;
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
  /** "Land here" (M122): the spot ahead that holding S would land on, the arc being flown, the scan clock. */
  landSpot: LandSpot | null;
  landing: LandPlan | null;
  landScanT: number;
  /** Seconds after a landing that walking stops at an edge, and how long the stick has pushed against one. */
  guardT: number;
  edgePush: number;
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
  /** Rising warm air under the gull right now (m/s^2), from a level's thermals. */
  lift?: number;
  /** A locked target (Tab): dives home in on it. */
  lock?: { x: number; y: number; z: number } | null;
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
    stamina: staminaMax(), stunT: 0, flapCd: 0, hopCd: 0, jump: false, flapPrev: false, flapHold: 0, diveT: 0, diveCd: 0, diveAngle: 0.7,
    flapAnim: 99, perched: false, heightAbove: 0, overWater: false, landSpot: null, landing: null, landScanT: 0, guardT: 0, edgePush: 0,
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
  s.guardT = Math.max(0, s.guardT - dt);
  const stunned = s.stunT > 0;
  s.stunT = Math.max(0, s.stunT - dt);
  const ctl: FlightInput = stunned ? { ax: 0, ay: 0, flap: false, dive: false, aimPitch: inp.aimPitch, carryMass: inp.carryMass } : inp;

  const surf = world.surfaceBelow(s.x, s.z, s.y - GULL_RADIUS + 0.05);
  s.heightAbove = Math.max(0, s.y - GULL_RADIUS - surf.y);
  const wasGrounded = s.mode === 'ground';
  const prevHeading = s.heading;
  const pressed = ctl.flap && !s.flapPrev; // a fresh press of Space (not a hold)
  s.flapPrev = ctl.flap;
  s.flapHold = ctl.flap && (wasGrounded || s.jump) ? s.flapHold + dt : 0; // counts the hold through the jump too
  const wasJump = s.jump;

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
    // the ledge guard (M122): just after a landing, and always on a perch top, walking stops at an edge unless the stick pushes against it for a moment
    if ((s.guardT > 0 || s.perched) && sp2 > 0.05 && !s.overWater) {
      if (edgeAhead(world, s, s.vx / sp2, s.vz / sp2, l.ledgeReach.value)) {
        if (len > 0) s.edgePush += dt;
        if (len === 0 || s.edgePush < l.ledgePush.value) {
          s.vx = 0;
          s.vz = 0;
        }
      } else s.edgePush = 0;
    } else s.edgePush = 0;
    s.vy -= f.gravity.value * dt; // keeps us pressed to the surface
    s.stamina += (s.perched ? f.perchRegen.value : f.groundRegen.value) * dt;
    if (pressed && s.hopCd <= 0) {
      // a tap on the ground: a proper jump (a hop up and forward), still walking-style until you press Space again
      s.vy = w.jumpSpeed.value;
      s.hopCd = w.hopInterval.value;
      s.mode = 'air';
      s.jump = true;
      s.perched = false;
      ev.push({ type: 'hop' });
    } else if (ctl.flap && s.flapHold >= w.takeoffHold.value && s.hopCd <= 0) {
      // holding Space: take off (the old hop-and-fly)
      s.vy = w.hopSpeed.value;
      s.hopCd = w.hopInterval.value;
      s.flapCd = Math.max(s.flapCd, w.hopInterval.value);
      s.mode = 'air';
      s.jump = false;
      s.perched = false;
      ev.push({ type: 'hop' });
    }
  } else if (s.jump && s.mode === 'air' && !pressed && !(ctl.flap && s.flapHold >= w.takeoffHold.value)) {
    // ---- mid-jump: steer like on the ground (with a little air control) until Space is pressed again or you land ----
    const { wx, wz, len } = worldDir(ctl.ax, ctl.ay, camYaw);
    const walkSpeed = w.speed.value * w.jumpSpeedFactor.value;
    if (len > 0) {
      s.vx += wx * w.accel.value * 0.6 * dt;
      s.vz += wz * w.accel.value * 0.6 * dt;
      const cap = Math.max(walkSpeed, Math.hypot(s.vx, s.vz) - 0.01);
      const spNow = Math.hypot(s.vx, s.vz);
      if (spNow > cap) {
        s.vx *= cap / spNow;
        s.vz *= cap / spNow;
      }
    }
    const sp = Math.hypot(s.vx, s.vz);
    if (sp > 0.2) s.heading += clamp(angleDiff(Math.atan2(-s.vx, -s.vz), s.heading), -w.turnRate.value * dt, w.turnRate.value * dt);
    s.vy -= f.gravity.value * dt;
    s.stamina += f.groundRegen.value * 0.5 * dt;
    s.perched = false;
  } else {
    if (s.jump) {
      s.jump = false; // pressed (or kept holding) Space in the air: spread the wings
      s.flapCd = 0;
    }
    // ---- airborne (glide or dive) ----
    const diving = s.mode === 'dive';
    // gliding: W/A/D steer; diving: always aim along the camera, A/D bend the line
    const { wx, wz, len } = worldDir(ctl.ax, diving ? 1 : Math.max(ctl.ay, 0), camYaw);
    const flare = ctl.ay < 0;
    // ---- "Land here" (M122): look for a spot ahead; holding S commits to a braking arc onto it ----
    if (!diving) {
      s.landScanT -= dt;
      if (s.landScanT <= 0 && !s.landing) {
        s.landScanT = l.scanEvery.value;
        s.landSpot = !stunned && !s.jump && s.heightAbove > 1 ? findLandSpot(world, s, world.isLand) : null;
      }
      if (!s.landing && flare && s.landSpot && !stunned && !ctl.flap && !ctl.dive && !s.jump) s.landing = planLanding(world, s, s.landSpot);
    }
    if (s.landing && (stunned || ctl.flap || ctl.dive || !flare || diving || s.jump)) s.landing = null; // flap, a dive (still a crash) or letting go of S ends it
    if (diving) s.landSpot = null;
    if (len > 0) {
      const diff = angleDiff(Math.atan2(-wx, -wz), s.heading);
      const slow = 1 + f.airTurnSlow.value * clamp(1 - Math.hypot(s.vx, s.vz) / Math.max(1, f.glideSpeed.value), 0, 1); // flying slowly turns tighter
      const rate = f.airTurnRate.value * slow * (diving ? d.turnFactor.value : 1);
      s.heading += clamp(diff, -rate * dt, rate * dt);
    }

    if (diving) {
      s.diveT += dt;
      let aim = aimDiveAngle(ctl.aimPitch);
      const lock = ctl.lock;
      const tgt = lock ? null : d.assistStrength.value > 0 ? bestAimTarget(targets, s, s.heading, s.diveAngle) : null;
      if (lock) {
        // locked on: bend the heading and the steepness all the way toward the target (the player still chooses when to dive)
        const dx = lock.x - s.x, dz = lock.z - s.z;
        const hd = Math.hypot(dx, dz);
        if (hd > 1.2) {
          const k = tuning.lock.diveTurn.value * dt;
          s.heading += clamp(angleDiff(Math.atan2(-dx, -dz), s.heading), -k, k);
          aim = clamp(Math.atan2(s.y - lock.y, hd), 0.12, 1.45);
        }
      }
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
      if (ctl.lift) s.vy = Math.min(s.vy + ctl.lift * dt, Math.max(s.vy, f.maxClimb.value * 0.7)); // a thermal lifts a gliding gull (never past 70% of the climb limit)
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
        if (ctl.lock) {
          const hd = Math.hypot(ctl.lock.x - s.x, ctl.lock.z - s.z);
          if (hd > 1.2) s.diveAngle = clamp(Math.atan2(s.y - ctl.lock.y, hd), 0.12, 1.45); // start already pointing at it
        }
        ev.push({ type: 'diveStart' });
      }
    }
    if (s.landing && s.mode === 'air') {
      // fly the arc: heading, speed and climb come from the plan (the wind is cancelled so that arriving means stopping)
      const st = landingStep(s.landing, s, dt);
      if (st.stuck) s.landing = null; // something is in the way: the arc ends, the gull glides on
      const wind = windAt(time);
      s.heading = st.heading;
      s.vx = -Math.sin(s.heading) * st.speed - wind.x * tuning.wind.airEffect.value;
      s.vz = -Math.cos(s.heading) * st.speed - wind.z * tuning.wind.airEffect.value;
      s.vy = st.vy;
      s.stamina += f.glideRegen.value * dt;
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
  let hardLand = false;
  const landedPlan = s.landing !== null;
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
        const quality = wasJump ? 'soft' : impact < l.softSpeed.value ? 'soft' : impact < l.hardSpeed.value ? 'rough' : 'hard';
        if (quality === 'rough') s.stunT = l.stunSoft.value;
        if (quality === 'hard') {
          hardLand = true;
          s.stunT = wasDive ? l.diveStun.value : l.stunHard.value;
        }
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
  if (grounded && !wasGrounded && !s.overWater) {
    // stick the landing (M122): a planned landing, or a glide onto a perch top, stops dead; a dive still crashes and skids
    if (landedPlan || (perch && !wasDive && !hardLand)) {
      s.vx = 0;
      s.vz = 0;
    }
    s.guardT = l.ledgeGuard.value;
    s.landing = null;
    s.landSpot = null;
  }
  if (grounded) {
    s.mode = 'ground';
    s.jump = false;
    s.diveT = 0;
  } else if (s.mode === 'ground') {
    s.mode = 'air'; // walked off an edge
  }
  s.perched = grounded && perch;
  return ev;
}

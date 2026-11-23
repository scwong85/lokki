import { tuning } from '../core/tuning';
import type { World } from '../world/collision';

/**
 * "Land here" (M122, docs/design/landing.md). Hold S with a landing spot ahead and the gull flies a braking arc onto it: it glides down, dips a
 * little under the spot's top and glides up onto it, slowing so that it arrives with no speed (the way a hawk perches). Flap, a dive or letting
 * go of S cancel it; a dive is still a crash. Every surface a gull could stand on is a spot: perches, roofs, ledges, the ground. Pure logic.
 */
export const GULL_R = 0.5;

export interface LandSpot {
  x: number;
  /** Height of the top (the surface the feet touch). */
  y: number;
  z: number;
  perch: boolean;
}

export interface LandPlan {
  spot: LandSpot;
  /** Horizontal distance and feet height above the top at the start. */
  d0: number;
  h0: number;
  /** The dip actually used (0 when the way under is blocked). */
  dip: number;
  dipDist: number;
  /** Progress guard: the closest it has been, and how long it has not got closer (a wall in the way ends the arc). */
  bestD?: number;
  stuckT?: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** The best spot to land on ahead of a gull in the air, or null. `isLand` tells ground from water. */
export function findLandSpot(world: World, g: { x: number; y: number; z: number; heading: number }, isLand: ((x: number, z: number) => boolean) | null): LandSpot | null {
  const l = tuning.landing;
  const feet = g.y - GULL_R;
  const cands: { x: number; z: number; top: number; perch: boolean; score: number }[] = [];
  const cone = l.spotConeDeg.value;
  for (let r = 3; r <= l.spotRange.value; r += 2.5) {
    for (let a = -cone; a <= cone + 0.01; a += 8) {
      const ang = g.heading + rad(a);
      const x = g.x - Math.sin(ang) * r, z = g.z - Math.cos(ang) * r;
      const sf = world.surfaceBelow(x, z, feet - 0.3, 0);
      const top = sf.y;
      const drop = feet - top;
      if (drop < l.spotMinDrop.value) continue;
      if (drop + l.dipDepth.value > l.spotMaxSlope.value * r) continue; // too steep to reach from here yet
      if (top === 0 && isLand && !isLand(x, z)) continue; // water
      if (world.solidAt(x, top + 0.3, z) || world.solidAt(x, top + GULL_R * 2 + 0.2, z)) continue; // inside something, or no headroom
      const perch = sf.kind === 'perch';
      cands.push({ x, z, top, perch, score: Math.abs(a) * 0.8 + r * 0.25 - (perch ? 5 : 0) });
    }
  }
  cands.sort((p, q) => p.score - q.score);
  const w = l.spotFlat.value;
  for (const c of cands.slice(0, 24)) {
    let flat = c.perch; // a perch top may be tiny: it counts on its centre alone
    if (!flat) {
      flat = true;
      for (const [dx, dz] of [[w, 0], [-w, 0], [0, w], [0, -w]]) {
        const t = world.surfaceBelow(c.x + dx, c.z + dz, feet - 0.3, 0).y;
        if (Math.abs(t - c.top) > 0.12) {
          flat = false;
          break;
        }
        if (c.top === 0 && isLand && !isLand(c.x + dx, c.z + dz)) {
          flat = false;
          break;
        }
      }
    }
    if (flat) return { x: c.x, y: c.top, z: c.z, perch: c.perch };
  }
  return null;
}

/** Height (feet above the spot's top) the arc wants at horizontal distance `d` from the spot: down to a dip, up over the edge, then a short settle. */
export function arcHeight(p: LandPlan, d: number): number {
  const end = tuning.landing.dipEnd.value; // the glide-up is over this far before the spot, clear of a pillar's or a roof's edge
  const OVER = 0.4;
  if (d >= p.dipDist) {
    const span = Math.max(p.d0 - p.dipDist, 1e-3);
    const u = clamp((p.d0 - d) / span, 0, 1);
    return p.h0 + (-p.dip - p.h0) * u;
  }
  if (d >= end) {
    const u = 1 - (d - end) / Math.max(p.dipDist - end, 1e-3);
    return -p.dip + (OVER + p.dip) * (u * u * (3 - 2 * u));
  }
  return 0.12 + (OVER - 0.12) * (d / Math.max(end, 1e-3)); // settle from just over the edge down onto the spot
}

/** Commit to a spot: the arc, with the dip as deep as the way under allows (a roof's wall is in the way of a dip from the street). */
export function planLanding(world: World, g: { x: number; y: number; z: number }, spot: LandSpot): LandPlan {
  const l = tuning.landing;
  const d0 = Math.hypot(spot.x - g.x, spot.z - g.z);
  const h0 = g.y - GULL_R - spot.y;
  const dipDist = Math.max(l.dipEnd.value + 1.5, Math.min(l.dipDist.value, d0 * 0.7));
  const make = (dip: number): LandPlan => ({ spot, d0, h0, dip, dipDist, bestD: d0, stuckT: 0 });
  const ux = (g.x - spot.x) / Math.max(d0, 1e-3), uz = (g.z - spot.z) / Math.max(d0, 1e-3);
  /** Does a gull sphere flying the arc touch anything? (sampled every 0.4 m, with a ring of points round the sphere) */
  const clear = (p: LandPlan): boolean => {
    for (let d = d0; d >= l.dipEnd.value; d -= 0.4) { // (the settle after that is over the spot itself)
      const cx = spot.x + ux * d, cz = spot.z + uz * d;
      const cy = spot.y + arcHeight(p, d) + GULL_R;
      for (const [ox, oz, oy] of [[0, 0, 0], [GULL_R, 0, 0], [-GULL_R, 0, 0], [0, GULL_R, 0], [0, -GULL_R, 0], [0, 0, -GULL_R * 0.95 - 0.3]]) { // the underside must clear anything by 0.3 m
        if (world.solidAt(cx + ox, cy + oy, cz + oz)) return false;
      }
    }
    return true;
  };
  const full = Math.min(l.dipDepth.value, Math.max(0, h0 - 0.2));
  for (const k of [1, 0.6, 0.3]) {
    const plan = make(full * k);
    if (plan.dip <= 0 || clear(plan)) return plan;
  }
  return make(0);
}

export interface LandStep {
  heading: number;
  speed: number;
  vy: number;
  /** Close enough to settle: the caller lets it touch down and takes the speed off. */
  settling: boolean;
  /** Not getting closer (something is in the way): the caller ends the arc. */
  stuck: boolean;
}

/** One step of the arc: where to point, how fast to go, how fast to climb or sink. Pure. */
export function landingStep(plan: LandPlan, g: { x: number; y: number; z: number; heading: number }, dt: number): LandStep {
  const l = tuning.landing;
  const dx = plan.spot.x - g.x, dz = plan.spot.z - g.z;
  const d = Math.hypot(dx, dz);
  const turn = l.approachTurn.value * dt;
  const want = Math.atan2(-dx, -dz);
  const heading = d > 0.3 ? g.heading + clamp(angleDiff(want, g.heading), -turn, turn) : g.heading;
  const h = g.y - GULL_R - plan.spot.y;
  const settling = d <= l.arrive.value;
  // the braking profile: v = sqrt(2 a d), so the speed is gone just as the spot is reached
  let speed = clamp(Math.sqrt(2 * l.approachBrake.value * Math.max(d - l.arrive.value * 0.5, 0)), 0, l.approachSpeed.value);
  speed = Math.max(speed, settling ? 0 : l.approachMinSpeed.value);
  speed = Math.min(speed, d / Math.max(dt, 1e-3) * 0.9); // never step past the spot
  const dNext = Math.max(0, d - speed * dt);
  let vy = (arcHeight(plan, dNext) - h) / Math.max(dt, 1e-3);
  if (settling) vy = -Math.min(2.5, Math.max(0.8, h * 2)); // right above it: sink onto it
  vy = clamp(vy, -l.approachSink.value, l.approachClimb.value);
  // progress guard: closer than ever resets it; a second without getting closer means a wall or a ledge is in the way
  if (d < (plan.bestD ?? Infinity) - 0.05) {
    plan.bestD = d;
    plan.stuckT = 0;
  } else plan.stuckT = (plan.stuckT ?? 0) + dt;
  return { heading, speed, vy, settling, stuck: !settling && (plan.stuckT ?? 0) > 1 };
}

/** The edge guard (M122): is there a drop ahead of a walking gull deep enough to be an edge? */
export function edgeAhead(world: World, g: { x: number; y: number; z: number }, dirX: number, dirZ: number, reach: number): boolean {
  const l = tuning.landing;
  const floor = g.y - GULL_R;
  const t = world.surfaceBelow(g.x + dirX * reach, g.z + dirZ * reach, floor + 0.4, 0).y;
  return floor - t > l.ledgeDrop.value;
}

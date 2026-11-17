import { tuning } from '../core/tuning';
import type { Rng } from '../core/rng';
import type { World } from '../world/collision';
import type { PropType } from '../data/props';

/**
 * Tourist brain: a small state machine with senses (sight cone, hearing), things it cares about
 * (the ice cream in its hand) and reactions (notice, shield, panic, chase, recover). Pure logic, no rendering.
 */
/** How someone feels about what the gull did. Fades back to calm; chains of events are built from changes of mood. */
export type Mood = 'calm' | 'annoyed' | 'angry' | 'upset' | 'delighted';

/** A place that gives a need: a stall where someone who craves `sells` can buy it. */
export interface Station {
  id: string;
  x: number;
  z: number;
  r: number;
  sells: PropType;
  /** Where its goods stand (offset in z from the station spot, and the counter height), so an empty stall can restock. */
  goods?: { dz: number; y?: number };
}

export type NpcMode = 'idle' | 'walk' | 'eat' | 'notice' | 'shield' | 'panic' | 'chase' | 'recover' | 'yuck' | 'cheer' | 'slip';

export interface NpcSpawn {
  x: number;
  z: number;
  heading?: number;
  /** Holds an ice cream (shorthand for holds: 'icecream'). */
  ice?: boolean;
  /** Item in hand at the start. */
  holds?: PropType;
  /** Items this tourist will pick up and eat if they lie near it (e.g. sweets). */
  wants?: PropType[];
  /** Jacket colour. */
  color: number;
  /** Who this is for quests ('dater', 'child'). */
  role?: string;
  /** Stays where it is (a couple waiting at the clock) unless sent somewhere. */
  stationary?: boolean;
  /** Body scale (children are small). */
  scale?: number;
  /** Quest tag of the item in hand (so 'grab:<tag>' can tell this one apart). */
  holdTag?: string;
  /** A hat for the model ('top' = a tall top hat). */
  hat?: 'sun' | 'cap' | 'top';
  hatColor?: number;
  /** The Clean Freak's sign (role 'cleaner'). */
  signAt?: { x: number; z: number };
  /** What they want to buy when they are upset or angry and pass a stall that sells it (comfort food). */
  craves?: PropType;
  /** Follows a taunting gull in a conga line (hold T) and for a few seconds after. */
  follows?: boolean;
  /** Walks this route back and forth instead of wandering. */
  patrol?: { x: number; z: number }[];
}

export interface Npc {
  id: number;
  x: number;
  z: number;
  heading: number;
  mode: NpcMode;
  /** Seconds in the current mode. */
  t: number;
  homeX: number;
  homeZ: number;
  targetX: number | null;
  targetZ: number | null;
  /** Prop id of the ice cream in hand, or null. */
  holding: number | null;
  /** World bearing (heading convention) from the tourist towards where it last saw the gull: the ice cream hides on the other side. */
  shieldFrom: number;
  /** World angle of the hand around the body (heading convention). */
  handAngle: number;
  /** Selfie routine (role 'selfie'): what she is doing and the number she is counting. */
  selfie: 'idle' | 'count' | 'open';
  selfieCount: number;
  /** The Clean Freak (role 'cleaner'): seconds left polishing his sign, and how many splats in a row. */
  cleanT: number;
  cleanSplats: number;
  /** Where his sign is (he turns to it when it gets splatted). */
  signX: number;
  signZ: number;
  distractT: number;
  noiseX: number;
  noiseZ: number;
  lostSightT: number;
  noticeCd: number;
  walkPhase: number;
  moving: boolean;
  speed: number;
  seesGull: boolean;
  /** 0..1: how close a calm person is to noticing the gull (it builds while the gull is in sight, and fades when it is not). */
  suspicion: number;
  /** Mode timers for idle/eat cycling. */
  nextT: number;
  /** Items it picks up when free and on the ground nearby. */
  wants: PropType[];
  /** Type of the item in hand. */
  holdType: PropType | null;
  /** Forced destination (e.g. the wrong ferry); cleared on arrival. */
  goal: { x: number; z: number; name: string } | null;
  role: string;
  stationary: boolean;
  mood: Mood;
  /** Seconds in the current mood. */
  moodT: number;
  craves: PropType | null;
  /** At a stall waiting to buy: the stall, and how long they have waited (0 = not buying). */
  station: Station | null;
  buyT: number;
  follows: boolean;
  /** Seconds left of following after the taunt stops, how far behind the gull they stay, and whether they are following now. */
  followT: number;
  followGap: number;
  following: boolean;
  patrol: { x: number; z: number }[] | null;
  patrolI: number;
  /** Slipping: seconds so far, and the slide they carry on with. */
  slipT: number;
  slideX: number;
  slideZ: number;
}

export interface GullInfo {
  x: number;
  y: number;
  z: number;
  diving: boolean;
  /** Taunting: holds the attention of everyone nearby (co-op decoy). */
  taunt?: boolean;
}

export interface Noise {
  x: number;
  z: number;
  /** Multiplier of hearRange (1 = clatter, 0.5 = splat). */
  loud: number;
}

export type NpcEvent = { type: 'reclaimed'; npc: Npc; propType: PropType } | { type: 'cheer'; npc: Npc } | { type: 'arrived'; npc: Npc; goal: string } | { type: 'yuck'; npc: Npc } | { type: 'tookItem'; npc: Npc; propType: PropType } | { type: 'noticed'; npc: Npc } | { type: 'shield'; npc: Npc } | { type: 'panic'; npc: Npc } | { type: 'chase'; npc: Npc } | { type: 'distracted'; npc: Npc } | { type: 'selfieClick'; npc: Npc; inFrame: boolean; framed: number } | { type: 'signSplat'; npc: Npc; splats: number } | { type: 'cleanerRobbed'; npc: Npc } | { type: 'snatchUnseen'; npc: Npc } | { type: 'review'; npc: Npc } | { type: 'soaked'; npc: Npc } | { type: 'scared'; npc: Npc; carried: boolean } | { type: 'mood'; npc: Npc; mood: Mood } | { type: 'atStation'; npc: Npc; station: string } | { type: 'bought'; npc: Npc; station: string; propType: PropType } | { type: 'slipped'; npc: Npc };

export interface NpcCtx {
  world: World;
  stations?: readonly Station[];
  walkable: (x: number, z: number) => boolean;
  rng: Rng;
}

export const BODY_RADIUS = 0.42;
export const BODY_HEIGHT = 1.8;

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** Bearing (heading convention, 0 = -Z) of the vector (dx,dz). */
export const bearing = (dx: number, dz: number) => Math.atan2(-dx, -dz);

export function newNpc(id: number, sp: NpcSpawn): Npc {
  const h = sp.heading ?? 0;
  return {
    id, x: sp.x, z: sp.z, heading: h, mode: 'idle', t: 0, homeX: sp.x, homeZ: sp.z, selfie: 'idle', selfieCount: 0, cleanT: 0, cleanSplats: 0, signX: sp.signAt?.x ?? sp.x, signZ: sp.signAt?.z ?? sp.z, targetX: null, targetZ: null,
    holding: null, shieldFrom: h, handAngle: h - Math.PI / 2, distractT: 0, noiseX: 0, noiseZ: 0, lostSightT: 0, noticeCd: 0,
    walkPhase: 0, moving: false, speed: 0, seesGull: false, suspicion: 0, nextT: 2,
    wants: sp.wants ?? [], holdType: null, goal: null, role: sp.role ?? 'tourist', stationary: sp.stationary ?? false,
    mood: 'calm', moodT: 0, craves: sp.craves ?? null, station: null, buyT: 0,
    follows: sp.follows ?? false, followT: 0, followGap: 2.5, following: false, patrol: sp.patrol ?? null, patrolI: 0, slipT: 0, slideX: 0, slideZ: 0,
  };
}

/** Does the tourist see the gull right now? Range, cone, blind spot overhead, line of sight. */
export function canSee(n: { x: number; z: number; heading: number; mode: string }, g: GullInfo, world: World): boolean {
  const t = tuning.npc;
  const dx = g.x - n.x, dz = g.z - n.z;
  const d2 = Math.hypot(dx, dz);
  const dy = g.y - 1.6;
  const range = t.sightRange.value * (n.mode === 'eat' ? t.eatSightFactor.value : 1) * (g.diving ? 1.3 : 1);
  if (Math.hypot(d2, dy) > range) return false;
  if (d2 > 2.5) {
    if (Math.abs(angleDiff(bearing(dx, dz), n.heading)) > (t.sightConeDeg.value * Math.PI) / 360) return false;
    if ((Math.atan2(dy, d2) * 180) / Math.PI > t.blindAboveDeg.value) return false;
  }
  // line of sight: walls, roofs and tent canopies block
  const steps = Math.ceil(Math.hypot(d2, dy));
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    if (world.solidAt(n.x + dx * f, 1.6 + dy * f, n.z + dz * f)) return false;
  }
  return true;
}

/** Where the ice cream hand is, in world space. */
export function handPos(n: Npc): { x: number; y: number; z: number } {
  // taking a selfie: the arm is up, holding the phone (and the ice cream) out in front
  if (n.selfie !== 'idle' && n.mode !== 'panic') return { x: n.x - Math.sin(n.heading) * 0.6, y: 2.0, z: n.z - Math.cos(n.heading) * 0.6 };
  if (n.mode === 'eat') return { x: n.x - Math.sin(n.heading) * 0.3, y: 1.45, z: n.z - Math.cos(n.heading) * 0.3 };
  if (n.mode === 'panic') return { x: n.x - Math.sin(n.handAngle) * 0.3, y: 1.95, z: n.z - Math.cos(n.handAngle) * 0.3 };
  const r = n.mode === 'shield' ? 0.55 : 0.5;
  return { x: n.x - Math.sin(n.handAngle) * r, y: n.mode === 'shield' ? 1.2 : 1.1, z: n.z - Math.cos(n.handAngle) * r };
}

export type SnatchState = 'none' | 'far' | 'blocked' | 'ok';

/** Why can / can't this beak take the ice cream: nothing in hand, too far, body in the way, or fine. */
export function snatchState(n: Npc, beak: { x: number; y: number; z: number }): SnatchState {
  if (n.holding === null) return 'none';
  const h = handPos(n);
  const d = Math.hypot(beak.x - h.x, beak.y - h.y, beak.z - h.z);
  if (d > tuning.npc.snatchReach.value * 2.5) return 'far';
  for (let i = 0; i <= 6; i++) {
    const f = i / 7;
    const x = beak.x + (h.x - beak.x) * f, y = beak.y + (h.y - beak.y) * f, z = beak.z + (h.z - beak.z) * f;
    if (y < BODY_HEIGHT && Math.hypot(x - n.x, z - n.z) < BODY_RADIUS) return 'blocked';
  }
  return d > tuning.npc.snatchReach.value ? 'far' : 'ok';
}

/** Is the ice cream protected right now? (paying attention to the gull) or available (unaware / distracted). */
export function guardState(n: Npc): 'none' | 'guarded' | 'open' {
  if (n.holding === null) return 'none';
  if ((n.mode === 'shield' || n.mode === 'notice') && n.distractT <= 0) return 'guarded';
  return 'open';
}

/** Can a beak at `beak` reach this tourist's ice cream? Blocked when the body is in the way (shielding). */
export function snatchable(n: Npc, beak: { x: number; y: number; z: number }): boolean {
  return snatchState(n, beak) === 'ok';
}

/** Change mood (and say so once). */
export function setMood(n: Npc, mood: Mood, ev?: NpcEvent[]): void {
  if (n.mood === mood) {
    n.moodT = 0;
    return;
  }
  n.mood = mood;
  n.moodT = 0;
  ev?.push({ type: 'mood', npc: n, mood });
}

/** One step angrier: calm, annoyed, angry (and angry stays angry). */
export const angrier = (m: Mood): Mood => (m === 'calm' || m === 'delighted' || m === 'upset' ? 'annoyed' : 'angry');

function enter(n: Npc, mode: NpcMode): void {
  n.mode = mode;
  n.t = 0;
  n.targetX = n.targetZ = null;
}

/** Walk/turn towards a point. Returns true while moving. */
function moveToward(n: Npc, tx: number, tz: number, speed: number, dt: number, ctx: NpcCtx): boolean {
  const want = bearing(tx - n.x, tz - n.z);
  const diff = angleDiff(want, n.heading);
  const turn = tuning.npc.turnRate.value * dt;
  n.heading += Math.max(-turn, Math.min(turn, diff));
  if (Math.abs(diff) > 1.0) return false; // turn first
  const nx = n.x - Math.sin(n.heading) * speed * dt;
  const nz = n.z - Math.cos(n.heading) * speed * dt;
  if (!ctx.walkable(nx, nz)) return false;
  n.x = nx;
  n.z = nz;
  n.speed = speed;
  return true;
}

function faceToward(n: Npc, tx: number, tz: number, dt: number): void {
  const diff = angleDiff(bearing(tx - n.x, tz - n.z), n.heading);
  const turn = tuning.npc.turnRate.value * dt;
  n.heading += Math.max(-turn, Math.min(turn, diff));
}

function pickWanderTarget(n: Npc, ctx: NpcCtx): void {
  if (n.patrol && !n.goal) {
    const p = n.patrol[n.patrolI++ % n.patrol.length];
    n.targetX = p.x;
    n.targetZ = p.z;
    return;
  }
  if (n.goal) {
    n.targetX = n.goal.x;
    n.targetZ = n.goal.z;
    return;
  }
  for (let i = 0; i < 8; i++) {
    const a = ctx.rng.range(0, Math.PI * 2);
    const r = ctx.rng.range(3, 10);
    const x = n.homeX + Math.cos(a) * r, z = n.homeZ + Math.sin(a) * r;
    if (ctx.walkable(x, z)) {
      n.targetX = x;
      n.targetZ = z;
      return;
    }
  }
  n.targetX = n.homeX;
  n.targetZ = n.homeZ;
}

/** Disturbances the NPC reacts to from outside. */
export function startle(n: Npc, kind: 'pooped' | 'snatched' | 'yuck' | 'cheer'): NpcEvent[] {
  const ev: NpcEvent[] = [];
  if (kind === 'cheer') {
    enter(n, 'cheer');
    setMood(n, 'delighted', ev);
    ev.push({ type: 'cheer', npc: n });
  } else if (kind === 'yuck') {
    n.holding = null;
    n.holdType = null;
    enter(n, 'yuck');
    setMood(n, 'upset', ev);
    ev.push({ type: 'yuck', npc: n });
  } else if (kind === 'snatched') {
    n.holding = null;
    n.holdType = null;
    enter(n, 'chase');
    setMood(n, 'angry', ev);
    ev.push({ type: 'chase', npc: n });
  } else {
    // every splat on the same person makes them angrier; someone who is angry and has comfort in mind chases the gull instead of running
    setMood(n, angrier(n.mood), ev);
    if (n.mood === 'angry' && n.craves) enter(n, 'chase');
    else {
      enter(n, 'panic');
      ev.push({ type: 'panic', npc: n });
    }
  }
  n.handAngle = n.heading - Math.PI / 2;
  return ev;
}

/** They tread in a puddle (a splat, a fish): arms up, a long slide, what they hold goes flying, and they are not happy. */
export function slip(n: Npc, ev: NpcEvent[]): void {
  enter(n, 'slip');
  n.slipT = 0;
  n.slideX = -Math.sin(n.heading) * 3.4;
  n.slideZ = -Math.cos(n.heading) * 3.4;
  n.holding = null;
  n.holdType = null;
  n.following = false;
  setMood(n, angrier(n.mood), ev);
  ev.push({ type: 'slipped', npc: n });
}

export const SLIP_SECONDS = 2.4;

export function stepNpc(n: Npc, g: GullInfo, noises: readonly Noise[], dt: number, ctx: NpcCtx): NpcEvent[] {
  const t = tuning.npc;
  const ev: NpcEvent[] = [];
  n.t += dt;
  n.noticeCd = Math.max(0, n.noticeCd - dt);
  n.distractT = Math.max(0, n.distractT - dt);
  n.speed = 0;
  const calm = n.mode === 'idle' || n.mode === 'walk' || n.mode === 'eat';
  if (n.mode === 'yuck') n.speed = 0;

  // ---- mood fades back to calm (not while they chase or wait to buy) ----
  n.moodT += dt;
  if (n.mode === 'chase' || n.buyT > 0 || (n.craves && (n.mood === 'angry' || n.mood === 'upset'))) n.moodT = 0; // a grudge lasts until they have had their comfort
  if (n.mood !== 'calm' && n.moodT > tuning.mood.time.value) setMood(n, 'calm', ev);

  // ---- comfort food: someone upset or angry who passes a stall that sells what they crave goes and buys it ----
  if (n.craves && n.buyT === 0 && (n.mood === 'angry' || n.mood === 'upset' || n.mood === 'annoyed') && ctx.stations) {
    const st = ctx.stations.find((x) => x.sells === n.craves && Math.hypot(x.x - n.x, x.z - n.z) <= x.r);
    if (st) {
      n.station = st;
      n.buyT = 0.001;
      n.goal = null;
      enter(n, 'idle');
      setMood(n, 'upset', ev);
      ev.push({ type: 'atStation', npc: n, station: st.id });
    }
  }
  if (n.buyT > 0 && n.station) {
    const st = n.station;
    if (Math.hypot(st.x - n.x, st.z - n.z) > 1.8) n.moving = moveToward(n, st.x, st.z, t.walkSpeed.value, dt, ctx);
    else {
      faceToward(n, st.x, st.z, dt);
      n.buyT += dt;
    }
    if (n.buyT >= tuning.mood.buyTime.value) {
      ev.push({ type: 'bought', npc: n, station: st.id, propType: st.sells });
      n.station = null;
      n.buyT = 0;
      n.craves = null;
      setMood(n, 'delighted', ev);
      enter(n, 'idle');
      n.nextT = 2;
    }
    n.handAngle += angleDiff(n.heading - Math.PI / 2, n.handAngle) * Math.min(1, 8 * dt);
    n.moving = n.speed > 0;
    n.walkPhase += n.speed * dt * 2.2;
    return ev;
  }

  // ---- senses ----
  n.seesGull = canSee(n, g, ctx.world);
  for (const s of noises) {
    if (n.role === 'tour' && calm && Math.hypot(s.x - n.x, s.z - n.z) <= t.hearRange.value * s.loud) {
      // a tour-group member follows a sound: they walk over to see what it is
      n.goal = { x: s.x, z: s.z, name: 'lure' };
      n.targetX = s.x;
      n.targetZ = s.z;
      if (n.mode !== 'walk') enter(n, 'walk');
      continue;
    }
    if (Math.hypot(s.x - n.x, s.z - n.z) <= t.hearRange.value * s.loud && (calm || n.mode === 'shield' || n.mode === 'notice')) {
      n.noiseX = s.x;
      n.noiseZ = s.z;
      n.distractT = t.distractTime.value;
      ev.push({ type: 'distracted', npc: n });
      if (n.mode === 'notice') enter(n, 'idle');
    }
  }

  // ---- reactions ----
  // seeing the gull is not noticing it: suspicion builds while it is in sight (twice as fast for a diving gull) and fades when it is not
  if (calm && n.seesGull && n.distractT <= 0 && n.mood !== 'delighted') n.suspicion = Math.min(1, n.suspicion + (dt / t.noticeBuild.value) * (g.diving ? 2 : 1));
  else n.suspicion = Math.max(0, n.suspicion - dt * t.suspicionFade.value);
  if (calm && n.suspicion >= 1 && n.noticeCd <= 0 && n.distractT <= 0) {
    n.suspicion = 0;
    enter(n, 'notice');
    ev.push({ type: 'noticed', npc: n });
  }

  const gullBearing = bearing(g.x - n.x, g.z - n.z);
  const gullDist = Math.hypot(g.x - n.x, g.z - n.z);
  // the lure: someone still angry who wants comfort goes after a taunting gull again, even after they had given up the chase
  if (g.taunt && n.craves && n.buyT === 0 && (n.mood === 'angry' || n.mood === 'upset') && n.mode !== 'chase' && n.mode !== 'panic' && gullDist < tuning.mood.lureRange.value) enter(n, 'chase');
  // ---- the conga line: a follower trails a taunting gull (and for a few seconds after) ----
  if (n.follows && n.mode !== 'slip' && n.mode !== 'panic' && n.mode !== 'chase') {
    if (g.taunt && gullDist < tuning.mood.followRange.value) n.followT = tuning.mood.followHold.value;
    else n.followT = Math.max(0, n.followT - dt);
    if (n.followT > 0 && gullDist < tuning.mood.followRange.value * 1.5) {
      n.following = true;
      if (n.mode !== 'walk') enter(n, 'walk');
      n.goal = null;
      n.t = 0;
      if (gullDist > n.followGap) n.moving = moveToward(n, g.x, g.z, t.walkSpeed.value * 1.2, dt, ctx);
      else faceToward(n, g.x, g.z, dt);
      n.handAngle += angleDiff(n.heading - Math.PI / 2, n.handAngle) * Math.min(1, 8 * dt);
      n.moving = n.speed > 0;
      n.walkPhase += n.speed * dt * 2.2;
      return ev;
    }
    if (n.following) {
      n.following = false;
      enter(n, 'idle');
      n.nextT = ctx.rng.range(1.5, 3);
    }
  }

  switch (n.mode) {
    case 'idle': {
      if (n.distractT > 0) faceToward(n, n.noiseX, n.noiseZ, dt);
      if (n.stationary && !n.goal) {
        n.t = 0; // waiting in place
        break;
      }
      if (n.t >= n.nextT && n.distractT <= 0) {
        if (!n.goal && n.holding !== null && ctx.rng.next() < 0.5) {
          enter(n, 'eat');
          n.nextT = ctx.rng.range(2, 3.5);
        } else {
          enter(n, 'walk');
          pickWanderTarget(n, ctx);
        }
      }
      break;
    }
    case 'eat':
      if (n.distractT > 0) faceToward(n, n.noiseX, n.noiseZ, dt);
      if (n.t >= n.nextT) {
        enter(n, 'idle');
        n.nextT = ctx.rng.range(1.5, 4);
      }
      break;
    case 'walk': {
      if (n.distractT > 0) {
        faceToward(n, n.noiseX, n.noiseZ, dt);
        break;
      }
      if (n.targetX === null || n.targetZ === null) pickWanderTarget(n, ctx);
      const tx = n.targetX!, tz = n.targetZ!;
      n.moving = moveToward(n, tx, tz, t.walkSpeed.value, dt, ctx);
      if (n.goal && Math.hypot(n.goal.x - n.x, n.goal.z - n.z) < 2) {
        ev.push({ type: 'arrived', npc: n, goal: n.goal.name });
        n.goal = null;
        enter(n, 'idle');
        n.nextT = ctx.rng.range(2, 5);
      } else if (Math.hypot(tx - n.x, tz - n.z) < 0.6 || n.t > (n.goal ? 40 : 8)) {
        enter(n, 'idle');
        n.nextT = ctx.rng.range(2, 5);
      }
      break;
    }
    case 'notice':
      faceToward(n, g.x, g.z, dt);
      n.shieldFrom = gullBearing;
      if (n.t >= t.noticeTime.value) {
        if (n.holding !== null) {
          enter(n, 'shield');
          ev.push({ type: 'shield', npc: n });
        } else {
          enter(n, 'idle');
          n.nextT = ctx.rng.range(2, 4);
          n.noticeCd = 4;
        }
      }
      break;
    case 'shield': {
      const attentive = n.distractT <= 0;
      if (attentive) {
        faceToward(n, g.x, g.z, dt);
        if (n.seesGull) {
          n.shieldFrom = gullBearing;
          n.lostSightT = 0;
        } else n.lostSightT += dt;
      } else faceToward(n, n.noiseX, n.noiseZ, dt); // distracted: body turns to the noise, the hand stays where it was
      // the hand swings to the side away from where the gull was last seen
      const want = n.shieldFrom + Math.PI;
      const diff = angleDiff(want, n.handAngle);
      const hr = t.handTurnRate.value * dt;
      n.handAngle += Math.max(-hr, Math.min(hr, diff));
      if (n.lostSightT >= t.loseSightTime.value || gullDist > t.shieldRange.value * 1.8) {
        enter(n, 'idle');
        n.nextT = ctx.rng.range(2, 4);
        n.noticeCd = 3;
        n.lostSightT = 0;
      }
      break;
    }
    case 'panic': {
      n.handAngle = n.heading - Math.PI / 2;
      const away = bearing(n.x - g.x, n.z - g.z);
      const tx = n.x - Math.sin(away) * 5, tz = n.z - Math.cos(away) * 5;
      n.moving = moveToward(n, tx, tz, t.runSpeed.value, dt, ctx);
      if (n.t >= t.panicTime.value) {
        enter(n, 'recover');
        n.noticeCd = 2;
      }
      break;
    }
    case 'chase': {
      if (gullDist > 2.5) n.moving = moveToward(n, g.x, g.z, t.runSpeed.value, dt, ctx);
      else faceToward(n, g.x, g.z, dt);
      // the lure: an angry person keeps following a gull that taunts (holds T) instead of giving up
      const lured = !!g.taunt && gullDist < tuning.mood.lureRange.value;
      if (lured) n.t = Math.min(n.t, t.chaseTime.value - 1);
      if (n.t >= t.chaseTime.value || gullDist > (lured ? 45 : 25)) {
        enter(n, 'recover');
        n.noticeCd = 2;
      }
      break;
    }
    case 'cheer':
      n.handAngle = n.heading - Math.PI / 2;
      if (n.t >= 3.5) {
        enter(n, 'idle');
        n.nextT = 2;
      }
      break;
    case 'yuck':
      // spitting out salmiakki: flail in place, then sulk
      n.handAngle = n.heading - Math.PI / 2;
      if (n.t >= 3) {
        enter(n, 'recover');
        n.noticeCd = 2;
      }
      break;
    case 'slip': {
      // slides on with the speed it had, slowing down, until it stops and sits there
      n.slipT += dt;
      const k = Math.max(0, 1 - n.slipT / SLIP_SECONDS);
      const nx = n.x + n.slideX * k * dt, nz = n.z + n.slideZ * k * dt;
      if (ctx.walkable(nx, nz)) {
        n.x = nx;
        n.z = nz;
      }
      n.handAngle = n.heading - Math.PI / 2;
      if (n.slipT >= SLIP_SECONDS) {
        enter(n, 'recover');
        n.noticeCd = 2;
      }
      break;
    }
    case 'recover':
      faceToward(n, g.x, g.z, dt);
      if (n.t >= t.recoverTime.value) {
        enter(n, 'idle');
        n.nextT = ctx.rng.range(2, 4);
      }
      break;
  }
  if (n.mode !== 'shield' && n.mode !== 'panic') {
    // hand rests at the side (right hand), following the body
    const want = n.heading - Math.PI / 2;
    n.handAngle += angleDiff(want, n.handAngle) * Math.min(1, 8 * dt);
  }
  n.moving = n.speed > 0;
  n.walkPhase += n.speed * dt * 2.2;
  return ev;
}

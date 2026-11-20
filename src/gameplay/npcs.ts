import { watchedGull } from './coopPlay';
import * as THREE from 'three';
import type { NpcSnap } from '../net/snapshot';
import { easeAngle, easeTo } from '../net/remote';
import { createRng, type Rng } from '../core/rng';
import { tuning } from '../core/tuning';
import { restY, type PropType } from '../data/props';
import type { Target } from './targets';
import { npcPull } from './tug';
import { pickRoutine, type Poi } from './routine';
import { BODY_HEIGHT, BODY_RADIUS, guardState, handPos, newNpc, snatchable, snatchState, startle, stepNpc, type GullInfo, type Noise, type Npc, type NpcEvent, type NpcSpawn, type Station, slip, honkAt, setMood, isCalm, scareJump, startDance, gatherSlot } from './npc';
import type { GrabCandidate } from './grab';
import type { HitSphere } from './poop';
import type { NpcHooks } from './interaction';
import type { Prop, PropManager } from './props';
import type { World } from '../world/collision';
import type { FlightState } from '../gull/flight';
import { NpcModel } from '../world/npcModel';
import { inFrame, selfieState } from './selfie';

const NPC_RADIUS_BODY = 0.5;
const RING_GUARDED = 0xff6b6b;
const RING_OPEN = 0x6bd66b;

/** Owns all NPCs: brains, models, the ice cream in their hands, world collision and gull bumps. */
export class NpcManager implements NpcHooks {
  readonly npcs: Npc[] = [];
  private models = new Map<number, NpcModel>();
  private spawns = new Map<number, NpcSpawn>();
  private noises: Noise[] = [];
  private pending: NpcEvent[] = [];
  /** Mechanics that are available now (stage gating). */
  gates = { contagion: true, slam: true, slip: true };
  /** Frights waiting to reach the next people (contagion), and how many people the current cascade has reached. */
  private frights: { x: number; z: number; gen: number; at: number; src: Npc }[] = [];
  private cascade = 0;
  private cascadeIdle = 0;
  private knockCount = 0;
  private knockIdle = 0;
  private rng: Rng;
  private nextId = 1;
  private owners: Npc[] = [];
  /** Each tourist's own item in hand (so reset can hand it back after a snatch). */
  private items = new Map<number, Prop>();
  /** Who an item was snatched from (quests send the victim somewhere afterwards). */
  private victimOf = new Map<number, number>();
  /** Who a prop was in the hand of at the start (a fallback victim if its theft was not recorded). */
  private firstHolder = new Map<number, number>();
  /** Who dropped which prop (so someone who will not let go can chase the thief who picks it up). */
  private droppedBy = new Map<number, number>();
  /** Wanted items being eaten: consumed when the timer runs out. */
  private eating = new Map<number, { prop: Prop; until: number }>();
  private clock = 0;
  private handTargetCache = new Map<number, Target>();
  /** Floating ring around each held ice cream: red = guarded, green = available. */
  private rings = new Map<number, THREE.Mesh>();

  constructor(
    private world: World,
    private props: PropManager,
    private parent: THREE.Object3D,
    private walkable: (x: number, z: number) => boolean,
    private seed = 1234,
  ) {
    this.rng = createRng(seed);
  }

  spawn(sp: NpcSpawn): Npc {
    const n = newNpc(this.nextId++, sp);
    this.spawns.set(n.id, sp);
    const model = new NpcModel(sp.color, n.id, { hat: sp.hat, hatColor: sp.hatColor, name: sp.name });
    model.root.scale.setScalar(sp.scale ?? 1);
    this.parent.add(model.root);
    this.models.set(n.id, model);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.46, 28), new THREE.MeshBasicMaterial({ color: RING_OPEN, transparent: true, opacity: 1, depthTest: false, side: THREE.DoubleSide }));
    ring.renderOrder = 12;
    ring.visible = false;
    this.parent.add(ring);
    this.rings.set(n.id, ring);
    const holds = sp.holds ?? (sp.ice ? 'icecream' : undefined);
    if (holds) this.giveItem(n, holds, sp.holdTag);
    this.npcs.push(n);
    return n;
  }

  private giveItem(n: Npc, type: PropType, tag?: string): void {
    const h = handPos(n);
    const prop = this.props.spawn({ type, x: h.x, y: h.y, z: h.z, tag });
    this.props.attach(prop, n.id);
    n.holding = prop.id;
    n.holdType = type;
    this.items.set(n.id, prop);
    this.firstHolder.set(prop.id, n.id);
  }

  /**
   * Give back the item (and the calm) of every npc of this role that has lost it: snatched out of turn, dropped, eaten.
   * The bell heist uses it so a snatch while the bell is quiet is never the end of the level. `release` frees the old
   * item from a beak. Returns how many were restocked.
   */
  restockHeld(role: string, release: (p: Prop) => void): number {
    let k = 0;
    for (const n of this.npcs) {
      if (n.role !== role) continue;
      const sp = this.spawns.get(n.id)!;
      const prop = this.items.get(n.id);
      const holds = sp.holds ?? (sp.ice ? 'icecream' : undefined);
      if (!prop || !holds || n.holding === prop.id) continue;
      release(prop);
      Object.assign(n, newNpc(n.id, sp)); // calm again, back at the picnic
      this.props.reset(prop);
      this.props.attach(prop, n.id);
      n.holding = prop.id;
      n.holdType = holds;
      this.props.setHoldTarget(prop, handPos(n));
      k++;
    }
    return k;
  }

  /** Places where someone who craves something can buy it (a level's stalls). The goods are real props on the counter. */
  stations: Station[] = [];

  /** Someone buys at a stall: the nearest free item of that type on the counter goes into their hand. None left: they sulk and try again later. */
  private serve(n: Npc, stationId: string, type: PropType): void {
    const st = this.stations.find((x) => x.id === stationId);
    const goods = st
      ? this.props.free().filter((p) => p.type === type).sort((a, b) => Math.hypot(a.cur.p.x - st.x, a.cur.p.z - st.z) - Math.hypot(b.cur.p.x - st.x, b.cur.p.z - st.z))[0]
      : undefined;
    let item = goods;
    if (!item && st?.goods) item = this.props.spawn({ type, x: st.x, y: restY(type, st.goods.y), z: st.z + st.goods.dz }); // the stall had run out: a fresh one
    if (!item) {
      n.craves = type;
      n.mood = 'upset';
      return;
    }
    if (n.holding !== null) {
      // their hands are full: they drop what they hold (it lands at their feet) to take the treat
      const old = this.props.byId(n.holding);
      if (old) this.props.drop(old, { x: 0, y: 0, z: 0 });
    }
    this.props.attach(item, n.id);
    n.holding = item.id;
    n.holdType = type;
    this.props.setHoldTarget(item, handPos(n));
  }

  /** Wet patches on the ground (a splat): whoever walks through one slips. */
  hazards: { x: number; z: number; ttl: number; r: number }[] = [];

  /** A puddle for `ttl` seconds: it makes anyone who walks into it slip. */
  addHazard(x: number, z: number, ttl = 40, r = 1.7): void {
    this.hazards.push({ x, z, ttl, r });
    if (this.hazards.length > 24) this.hazards.shift();
  }

  /** How many followers are trailing the gull now. */
  followingCount(): number {
    return this.npcs.filter((n) => n.following).length;
  }

  /** Followers within `r` of a point. */
  followersNear(x: number, z: number, r: number): number {
    return this.npcs.filter((n) => n.following && Math.hypot(n.x - x, n.z - z) <= r).length;
  }

  /** A cannonball splash at (x, z): everyone within `r` is soaked: they drop what they hold and run. Returns how many. */
  soakRadius(x: number, z: number, r: number): number {
    let k = 0;
    for (const n of this.npcs) {
      if (n.mode === 'panic' || n.mode === 'slip' || Math.hypot(n.x - x, n.z - z) > r) continue;
      this.dropHeld(n);
      this.pending.push(...startle(n, 'pooped'));
      this.pending.push({ type: 'soaked', npc: n });
      k++;
    }
    return k;
  }

  /** Someone who keeps their place walks back to it after a fright or a fall, and takes back a cone that lies unclaimed. */
  private backToPost(n: Npc, dt: number): void {
    const sp = this.spawns.get(n.id);
    if (!sp?.post || n.mode !== 'idle' || n.goal || n.following || n.tugged || n.buyT > 0) return; // (not while off buying a treat: that pulled them back to their spot every step)
    const dx = sp.x - n.x, dz = sp.z - n.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.25) {
      const step = Math.min(d, 1.5 * dt);
      n.x += (dx / d) * step;
      n.z += (dz / d) * step;
      n.heading = Math.atan2(-dx, -dz);
      n.speed = 1.2;
      n.moving = true;
      return;
    }
    n.heading = sp.heading ?? n.heading;
    const prop = this.items.get(n.id);
    // what they dropped themselves (knocked over, a fright) comes back to them wherever it fell; something a gull has carried off
    // and put down elsewhere only counts as theirs again if it lies close to their spot (it used to jump back into their hand)
    if (n.holding === null && prop && prop.heldBy === null && !prop.carried && (!prop.byGull || (Math.hypot(prop.cur.p.x - sp.x, prop.cur.p.z - sp.z) <= tuning.npc.reclaimRange.value && prop.cur.p.y < 1.4))) {
      this.props.reset(prop);
      this.props.attach(prop, n.id);
      n.holding = prop.id;
      n.holdType = sp.holds ?? (sp.ice ? 'icecream' : null);
      this.props.setHoldTarget(prop, handPos(n));
    }
  }

  /** A fright reaches calm neighbours (called with this tick's events; adds its own results to `ev` after scanning). */
  private spread(ev: NpcEvent[], dt: number): void {
    if (!this.gates.contagion) return;
    const c = tuning.contagion;
    const fresh = ev.slice();
    for (const e of fresh) {
      if ((e.type === 'panic' || e.type === 'startled' || e.type === 'slipped' || e.type === 'soaked') && e.npc.infectedT <= 0) {
        e.npc.infectedT = c.immune.value;
        this.frights.push({ x: e.npc.x, z: e.npc.z, gen: 0, at: this.clock + c.delay.value, src: e.npc });
      }
    }
    const due = this.frights.filter((f) => f.at <= this.clock);
    this.frights = this.frights.filter((f) => f.at > this.clock);
    for (const f of due) {
      for (const n of this.npcs) {
        if (n === f.src || n.infectedT > 0 || !isCalm(n) || Math.hypot(n.x - f.x, n.z - f.z) > c.radius.value) continue;
        n.infectedT = c.immune.value;
        if (f.gen <= 1) {
          this.dropHeld(n);
          ev.push(...startle(n, 'pooped'));
        } else scareJump(n, ev);
        this.cascade++;
        ev.push({ type: 'spread', count: this.cascade });
        if (f.gen + 1 < c.maxGen.value) this.frights.push({ x: n.x, z: n.z, gen: f.gen + 1, at: this.clock + c.delay.value, src: n });
      }
    }
    for (const n of this.npcs) if (n.infectedT > 0) n.infectedT -= dt;
    if (this.frights.length === 0 && this.cascade > 0) {
      this.cascadeIdle += dt;
      if (this.cascadeIdle > 4) this.cascade = 0;
    } else this.cascadeIdle = 0;
  }

  /** A fast dive through people bowls them over; a fallen person knocks over the next (the domino). Returns true if the dive hit someone. */
  slam(s: FlightState): boolean {
    if (!this.gates.slam) return false;
    const t = tuning.slam;
    const speed = Math.hypot(s.vx, s.vy, s.vz);
    if (s.mode !== 'dive' || speed < t.minSpeed.value) return false;
    const dir = { x: s.vx, z: s.vz };
    let hit = false;
    for (const n of this.npcs) {
      if (n.mode === 'slip' || n.tugged) continue;
      if (s.y - n.y < 0.1 || s.y - n.y > BODY_HEIGHT + 0.8) continue;
      if (Math.hypot(n.x - s.x, n.z - s.z) > t.radius.value + BODY_RADIUS) continue;
      // a steep dive at somebody's hand is a snatch, not a skittle: when the held item is within the beak's reach, take it instead of bowling them over
      if (n.holding !== null && s.diveAngle > (t.maxAngleDeg.value * Math.PI) / 180) {
        const h = handPos(n);
        const beak = { x: s.x - Math.sin(s.heading) * 0.85, y: s.y + 0.05, z: s.z - Math.cos(s.heading) * 0.85 };
        if (Math.hypot(beak.x - h.x, beak.y - h.y, beak.z - h.z) <= tuning.npc.snatchReach.value * 2) continue;
      }
      this.knock(n, dir, 0);
      hit = true;
    }
    if (hit) {
      s.vx *= t.speedLoss.value;
      s.vz *= t.speedLoss.value;
      this.pending.push({ type: 'slam' });
    }
    return hit;
  }

  private knock(n: Npc, dir: { x: number; z: number }, gen: number): void {
    this.dropHeld(n);
    const ev: NpcEvent[] = [];
    slip(n, ev, dir, tuning.slam.slide.value);
    n.infectedT = tuning.contagion.immune.value;
    this.pending.push(...ev);
    this.knockCount++;
    this.knockIdle = 0;
    this.pending.push({ type: 'knockdown', count: this.knockCount });
    this.knocks.push({ src: n, gen, at: this.clock + 0.25, x: n.x, z: n.z });
  }
  private knocks: { src: Npc; gen: number; at: number; x: number; z: number }[] = [];

  private knockStep(dt: number): void {
    const t = tuning.slam;
    const due = this.knocks.filter((k) => k.at <= this.clock);
    this.knocks = this.knocks.filter((k) => k.at > this.clock);
    for (const k of due) {
      if (k.gen + 1 >= t.maxGen.value) continue;
      for (const n of this.npcs) {
        if (n === k.src || n.mode === 'slip' || n.tugged || Math.hypot(n.x - k.x, n.z - k.z) > t.knockRadius.value) continue;
        this.knock(n, { x: n.x - k.x, z: n.z - k.z }, k.gen + 1);
      }
    }
    if (this.knockCount > 0 && this.knocks.length === 0) {
      this.knockIdle += dt;
      if (this.knockIdle > 4) this.knockCount = 0;
    }
  }

  /** Something knocks over whoever stands within `r` of (x, z), sliding them along `dir` (a falling domino): the fall goes on from them. */
  knockAt(x: number, z: number, r: number, dir: { x: number; z: number }): number {
    let k = 0;
    for (const n of this.npcs) {
      if (n.mode === 'slip' || n.tugged || Math.hypot(n.x - x, n.z - z) > r) continue;
      this.knock(n, dir, 0);
      k++;
    }
    return k;
  }

  private lastMode = new Map<number, string>();

  /** Somebody panics or gives chase: the people close by notice, and stay wary of gulls for a while. */
  private gossipStep(): void {
    for (const n of this.npcs) {
      const was = this.lastMode.get(n.id);
      this.lastMode.set(n.id, n.mode);
      if (was === n.mode || (n.mode !== 'panic' && n.mode !== 'chase')) continue;
      for (const o of this.npcs) {
        if (o === n || o.mode === 'panic' || o.mode === 'chase') continue;
        if (Math.hypot(o.x - n.x, o.z - n.z) <= tuning.gossip.range.value) o.wary = Math.max(o.wary, tuning.gossip.seconds.value);
      }
    }
  }

  /** A ferry comes in: up to `max` passengers step off at the quay (the same people are reused for the next ferry). */
  ferryCrowd(at: { x: number; z: number }, to: { x: number; z: number }, count: number, max: number, color: (i: number) => number, pois: readonly Poi[] = []): void {
    const mine = this.npcs.filter((n) => n.role === 'passenger');
    for (let i = 0; i < count; i++) {
      const x = at.x + (i % 3) * 1.2, z = at.z + Math.floor(i / 3) * 1.2;
      let n = mine[i];
      if (!n && mine.length + i < max) n = this.spawn({ x, z, heading: 0, role: 'passenger', color: color(i), wander: 16, routine: pois.length ? pickRoutine(pois, this.rng, 3) : undefined });
      if (!n) continue;
      n.x = x;
      n.z = z;
      if (pois.length) { n.routine = pickRoutine(pois, this.rng, 3); n.routineI = 0; n.stop = null; n.stance = 'none'; }
      n.homeX = to.x; // once ashore they stroll around the square, not back at the quay
      n.homeZ = to.z;
      n.goal = { x: to.x + (i - count / 2) * 1.5, z: to.z, name: 'ferry-walk' };
      n.targetX = n.goal.x;
      n.targetZ = n.goal.z;
      n.nextT = 0;
    }
  }

  /** A playing music source (a boom box, a jukebox): free people come over and dance until `until`. */
  music: { x: number; z: number; until: number; range: number; gather: number } | null = null;
  private musicT = 0;
  private musicDancers = 0;

  playMusic(x: number, z: number, seconds: number, range: number, gather: number): void {
    this.music = { x, z, until: this.clock + seconds, range, gather };
    this.musicT = 0;
    this.musicDancers = 0;
  }

  stopMusic(): void {
    this.music = null;
  }

  /** The source moves (a carried boom box): the crowd follows it. */
  moveMusic(x: number, z: number): void {
    if (this.music) {
      this.music.x = x;
      this.music.z = z;
    }
  }

  get musicPlaying(): boolean {
    return !!this.music && this.clock < this.music.until;
  }

  private musicStep(dt: number, pulse: number): NpcEvent[] {
    const m = this.music;
    if (!m) return [];
    if (this.clock >= m.until) {
      this.music = null;
      return [];
    }
    this.musicT -= dt;
    if (this.musicT > 0) return [];
    this.musicT = pulse;
    const ev: NpcEvent[] = [];
    let dancers = 0;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - m.x, n.z - m.z);
      if (d > m.range) continue;
      if (n.mode === 'dance') {
        if (d <= m.gather * 1.5) {
          dancers++;
          if (n.danceT < 2.5) n.danceT = 2.5; // keeps dancing while the music plays
        } else if (n.danceT > 1) n.danceT = 1; // the music moved on: stop and follow it
        continue;
      }
      if (d <= m.gather && isCalm(n) && (!n.stationary || n.roam > 0)) {
        // close enough: the music wins even over somebody guarding an ice cream (nobody guards while dancing)
        startDance(n, 4, ev);
        n.heading = Math.atan2(-(m.x - n.x), -(m.z - n.z));
        dancers++;
      } else if (d > m.gather && isCalm(n) && !n.goal && !n.following && n.buyT === 0 && !n.tugged && (!n.stationary || n.roam > 0)) {
        // even somebody guarding an ice cream puts it down to the beat: they stop watching the gull and walk over
        const s = gatherSlot(n.id, m.x, m.z);
        if (n.mode === 'shield' || n.mode === 'notice') {
          n.mode = 'walk';
          n.t = 0;
        }
        n.obliviousT = Math.max(n.obliviousT, pulse * 3);
        n.suspicion = 0;
        n.goal = { x: s.x, z: s.z, name: 'music' };
        n.targetX = s.x;
        n.targetZ = s.z;
        n.nextT = 0;
        n.distractT = 0;
      }
    }
    if (dancers > this.musicDancers) ev.push({ type: 'dancing', count: dancers });
    this.musicDancers = dancers;
    return ev;
  }

  /** The jukebox plays: calm people within `r` dance for `seconds`. Returns how many. */
  danceNear(x: number, z: number, r: number, seconds: number): NpcEvent[] {
    const ev: NpcEvent[] = [];
    let k = 0;
    for (const n of this.npcs) {
      if (Math.hypot(n.x - x, n.z - z) > r || !isCalm(n)) continue;
      startDance(n, seconds, ev);
      n.heading = Math.atan2(-(x - n.x), -(z - n.z)); // they turn to the music
      k++;
    }
    ev.push({ type: 'dancing', count: k });
    return ev;
  }

  /** Everyone with this role changes mood. */
  moodRole(role: string, mood: 'calm' | 'annoyed' | 'angry' | 'upset' | 'delighted'): void {
    for (const n of this.npcs) if (n.role === role) setMood(n, mood, this.pending);
  }

  /** Everyone with this role looks elsewhere for a while: their hands are open. */
  distractRole(role: string, seconds: number): void {
    for (const n of this.npcs) if (n.role === role) n.distractT = Math.max(n.distractT, seconds);
  }

  /** Everyone with this role is too busy to notice the gull for a while. */
  obliviousRole(role: string, seconds: number): void {
    for (const n of this.npcs) if (n.role === role) n.obliviousT = Math.max(n.obliviousT, seconds);
  }

  /** People within r of a point. */
  near(x: number, z: number, r: number): Npc[] {
    return this.npcs.filter((n) => Math.hypot(n.x - x, n.z - z) <= r);
  }

  /** BOO from a hiding place: everyone within `r` jumps, drops what they hold and runs. */
  boo(x: number, z: number, r: number): NpcEvent[] {
    const ev: NpcEvent[] = [];
    for (const n of this.npcs) {
      if (Math.hypot(n.x - x, n.z - z) > r || n.mode === 'panic' || n.mode === 'slip' || n.tugged) continue;
      this.dropHeld(n);
      ev.push(...startle(n, 'pooped'));
      ev.push({ type: 'boo', npc: n });
    }
    return ev;
  }

  /** A honk at (x, z): calm people within `range` jump; someone with their back turned drops what they hold. */
  honk(x: number, z: number, range: number): NpcEvent[] {
    const ev: NpcEvent[] = [];
    for (const n of this.npcs) {
      if (Math.hypot(n.x - x, n.z - z) > range) continue;
      const r = honkAt(n, x, z, ev);
      if (r === 'drop') this.dropHeld(n);
      if (r && !n.goal && (!n.stationary || n.roam > 0) && !n.following && n.buyT === 0) this.shoo(n, x, z);
    }
    return ev;
  }

  /** Watchers (M95): somebody who minds a prop notices when it is gone, and goes after the gull if they can see it. */
  private watchStep(dt: number): NpcEvent[] {
    const ev: NpcEvent[] = [];
    for (const n of this.npcs) {
      if (!n.watch || n.watchCd > 0 || !(n.mode === 'idle' || n.mode === 'walk' || n.mode === 'eat' || n.mode === 'notice' || n.mode === 'shield' || n.mode === 'recover')) continue;
      const p = this.props.props.find((x) => x.tag === n.watch && !x.broken);
      const gone = !p || p.carried || Math.hypot(p.cur.p.x - p.spawn.x, p.cur.p.z - p.spawn.z) > 2.5 || p.cur.p.y > p.spawn.y + 1.5;
      if (!gone) {
        n.missT = 0;
        n.discovered = false; // it is back: they can lose it again
        continue;
      }
      // the discovery: back at their spot (or near where it was) and not busy, they notice it is gone, even if they never saw who took it
      const home = this.spawns.get(n.id);
      const nearSpot = p ? Math.hypot(n.x - p.spawn.x, n.z - p.spawn.z) < tuning.watch.discoverRange.value : !!home && Math.hypot(n.x - home.x, n.z - home.z) < 1.5;
      if (!n.discovered && nearSpot && n.distractT <= 0 && n.obliviousT <= 0 && (n.mode === 'idle' || n.mode === 'walk')) {
        n.missT += dt;
        if (n.missT >= tuning.watch.discoverDelay.value) {
          n.discovered = true;
          ev.push({ type: 'discovered', npc: n });
        }
      }
      if (!n.seesGull || n.distractT > 0 || n.obliviousT > 0) continue;
      n.watchCd = 12;
      n.relentless = true;
      ev.push(...startle(n, 'snatched')); // they chase
      ev.push({ type: 'caught', npc: n });
    }
    return ev;
  }

  /** A honk sends free people (strollers, passengers, partygoers) away from the gull: about ten metres, on the first walkable side. */
  private shoo(n: Npc, gx: number, gz: number): void {
    const away = Math.atan2(n.z - gz, n.x - gx);
    for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
      const x = n.x + Math.cos(away + off) * 10, z = n.z + Math.sin(away + off) * 10;
      if (!this.walkable(x, z)) continue;
      n.goal = { x, z, name: 'shoo' };
      n.targetX = x;
      n.targetZ = z;
      return;
    }
  }

  /** Food lying about: free people who are not busy walk over and eat it. Set by the level. */
  crumbs: PropType[] = [];
  private crumbT = 0;
  private crumbTarget = new Map<number, number>();
  crumbsEaten = 0;

  private crumbStep(dt: number): NpcEvent[] {
    if (!this.crumbs.length) return [];
    this.crumbT -= dt;
    if (this.crumbT > 0) return [];
    this.crumbT = 0.8;
    const ev: NpcEvent[] = [];
    const loose = this.props.free().filter((p) => this.crumbs.includes(p.type) && p.tag === undefined && !p.lost && p.cur.p.y < 0.8 && !p.stolen);
    // people already walking to a crumb: eat it when they get there; forget it when it is gone
    for (const [nid, pid] of [...this.crumbTarget]) {
      const n = this.npcs.find((o) => o.id === nid);
      const p = loose.find((o) => o.id === pid);
      if (!n || !p) {
        if (n?.goal?.name === 'crumb') n.goal = null;
        this.crumbTarget.delete(nid);
        continue;
      }
      const near = Math.hypot(p.cur.p.x - n.x, p.cur.p.z - n.z) < 2.4; // a walker counts as arrived two metres out, and their goal is gone by then
      if (!near && n.goal?.name !== 'crumb') {
        this.crumbTarget.delete(nid); // something else took them away
        continue;
      }
      if (near) {
        this.props.destroy(p);
        n.goal = null;
        n.homeX = n.x; // they stay around where they ate: a crowd gathers where the crumbs lead
        n.homeZ = n.z;
        this.crumbTarget.delete(nid);
        this.crumbsEaten++;
        ev.push({ type: 'crumb', npc: n, count: this.crumbsEaten });
        setMood(n, 'delighted', ev);
      }
    }
    const taken = new Set(this.crumbTarget.values());
    for (const p of loose) {
      if (taken.has(p.id)) continue;
      let best: Npc | null = null;
      let bd = tuning.crowd.crumbRange.value;
      for (const n of this.npcs) {
        if (!(n.mode === 'idle' || n.mode === 'walk') || n.goal || n.following || n.buyT !== 0 || n.tugged || (n.stationary && !(n.roam > 0)) || n.holding !== null) continue;
        const d = Math.hypot(n.x - p.cur.p.x, n.z - p.cur.p.z);
        if (d < bd) { bd = d; best = n; }
      }
      if (!best) continue;
      best.goal = { x: p.cur.p.x, z: p.cur.p.z, name: 'crumb' };
      best.targetX = p.cur.p.x;
      best.targetZ = p.cur.p.z;
      best.nextT = 0;
      this.crumbTarget.set(best.id, p.id);
      ev.push({ type: 'crumbCall', npc: best });
    }
    return ev;
  }

  /** Someone slips: what they hold goes flying. */
  private trip(n: Npc): NpcEvent[] {
    const ev: NpcEvent[] = [];
    const held = n.holding;
    slip(n, ev);
    if (held !== null) {
      const pr = this.props.byId(held);
      if (pr) this.props.drop(pr, { x: 0, y: 1.6, z: 0 });
    } else {
      // they had nothing left to drop (it was snatched earlier): a fresh one flies out of their pocket, so a chain that wants it cannot get stuck
      const sp = this.spawns.get(n.id);
      const type = sp?.holds ?? (sp?.ice ? 'icecream' : undefined);
      if (sp && type) this.props.drop(this.props.spawn({ type, x: n.x, y: 1.4, z: n.z, tag: sp.holdTag }), { x: 0, y: 1.2, z: 0 });
    }
    return ev;
  }

  /** Is there a puddle (a splat, or a free item tagged `slippery`, like a wet fish) under this person? */
  private puddleAt(n: Npc): { kill?: () => void } | null {
    for (const h of this.hazards) if (Math.hypot(h.x - n.x, h.z - n.z) < h.r) return { kill: () => (h.ttl = 0) };
    for (const p of this.props.props) {
      if (p.tag !== 'slippery' || p.broken || p.heldBy !== null || p.carried) continue;
      if (Math.hypot(p.cur.p.x - n.x, p.cur.p.z - n.z) < 1.2 && p.cur.p.y < 1.0) return { kill: () => this.props.destroy(p) };
    }
    return null;
  }

  /** A sound the tourists can hear (clatter, crash, tipped bin...). */
  addNoise(x: number, z: number, loud = 1): void {
    this.noises.push({ x, z, loud });
  }

  /** One fixed sim step. Returns brain events (noticed, panic, chase...). */
  /** `gull`: one gull, or every gull in play (each tourist watches the nearest one). */
  update(dt: number, gull: GullInfo | readonly GullInfo[]): NpcEvent[] {
    const gulls: readonly GullInfo[] = Array.isArray(gull) ? gull : [gull as GullInfo];
    const ev: NpcEvent[] = this.pending.splice(0);
    const ctx = { world: this.world, walkable: this.walkable, rng: this.rng, stations: this.stations };
    this.clock += dt;
    ev.push(...this.musicStep(dt, tuning.boombox.pulse.value));
    this.gossipStep();
    ev.push(...this.watchStep(dt));
    ev.push(...this.crumbStep(dt));
    for (const h of this.hazards) h.ttl -= dt;
    this.hazards = this.hazards.filter((h) => h.ttl > 0);
    // the conga line: followers stay behind the gull in the order they are in (nearest first)
    const lead = gulls[0];
    if (lead) {
      const f = this.npcs.filter((n) => n.following).sort((a, b) => Math.hypot(a.x - lead.x, a.z - lead.z) - Math.hypot(b.x - lead.x, b.z - lead.z));
      f.forEach((n, i) => (n.followGap = 2.4 + i * 1.2));
    }
    for (const n of this.npcs) {
      if (n.role === 'selfie' || n.role === 'blogger') ev.push(...this.selfieStep(n, gulls)); // the blogger photographs her dish on the same rhythm
      if (n.role === 'cleaner') this.cleanStep(n, dt);
      const near = gulls.length === 1 ? gulls[0] : watchedGull(n, gulls);
      const stepped = stepNpc(n, near, this.noises, dt, ctx);
      for (const e of stepped) if (e.type === 'bought') this.serve(e.npc, e.station, e.propType);
      ev.push(...stepped);
      if (this.gates.slip && n.mode !== 'slip' && n.speed > 0.6) {
        const puddle = this.puddleAt(n);
        if (puddle) {
          puddle.kill?.();
          ev.push(...this.trip(n));
        }
      }
      this.backToPost(n, dt);
      ev.push(...this.wantedItems(n));
      ev.push(...this.reclaim(n));
      // solid walls, counters and landmarks push the tourist out (horizontal only)
      const p = { x: n.x, y: 0.9 + n.y, z: n.z };
      this.world.collide(p, BODY_RADIUS);
      n.x = p.x;
      n.z = p.z;
      // keep tourists from standing inside each other
      for (const o of this.npcs) {
        if (o === n) continue;
        const dx = n.x - o.x, dz = n.z - o.z;
        const d = Math.hypot(dx, dz);
        if (d > 0 && d < 0.8) {
          n.x += (dx / d) * (0.8 - d) * 0.5;
          n.z += (dz / d) * (0.8 - d) * 0.5;
        }
      }
      if (n.holding !== null) {
        const prop = this.props.byId(n.holding);
        if (prop && prop.heldBy === n.id) this.props.setHoldTarget(prop, handPos(n));
      }
    }
    this.spread(ev, dt);
    this.knockStep(dt);
    this.noises.length = 0;
    return ev;
  }

  /** The Clean Freak scrubs his sign with his back to his fish: while he does, only the sign has his attention. */
  private cleanStep(n: Npc, dt: number): void {
    if (n.cleanT <= 0) return;
    n.cleanT = Math.max(0, n.cleanT - dt);
    n.noiseX = n.signX;
    n.noiseZ = n.signZ;
    n.distractT = Math.max(n.distractT, 0.3);
    if (n.cleanT === 0) n.cleanSplats = 0;
  }

  /** The sign got splatted: he rushes to clean it. Every splat while he is still at it makes him more frantic (and slower to look back). */
  signSplatted(): boolean {
    const n = this.npcs.find((x) => x.role === 'cleaner');
    if (!n) return false;
    const c = tuning.cleaner;
    n.cleanSplats = n.cleanT > 0 ? n.cleanSplats + 1 : 1;
    n.cleanT = Math.min(c.maxTime.value, c.baseTime.value + (n.cleanSplats - 1) * c.extraPerSplat.value);
    this.pending.push({ type: 'signSplat', npc: n, splats: n.cleanSplats });
    return true;
  }

  /**
   * The selfie routine: on "1" the shot is taken and for a moment she looks only at the screen (her ice cream is open).
   * Emits `selfieClick` when the photo is taken, saying whether a gull is in the frame (the photobomb).
   */
  private selfieStep(n: Npc, gulls: readonly GullInfo[]): NpcEvent[] {
    const ev: NpcEvent[] = [];
    const sp = this.spawns.get(n.id);
    const facing = sp?.heading ?? n.heading;
    const st = selfieState(this.clock, n.id * 1.7);
    const was = n.selfie;
    n.selfie = st.phase;
    n.selfieCount = st.count;
    if (st.phase === 'open') {
      // eyes on the phone: she turns toward her camera, the hand stays up where it is, so the ice cream is free
      n.noiseX = n.x - Math.sin(facing) * 6;
      n.noiseZ = n.z - Math.cos(facing) * 6;
      n.distractT = Math.max(n.distractT, 0.3);
    }
    if (was === 'count' && st.phase === 'open') {
      const who = gulls.map((g, i) => (inFrame(n, facing, g) ? i : -1)).filter((i) => i >= 0);
      ev.push({ type: 'selfieClick', npc: n, inFrame: who.length > 0, framed: who.length, who });
    }
    return ev;
  }

  /** A tourist who wants something (sweets) picks it up when it lies close by, eats it, and reacts. */
  private wantedItems(n: Npc): NpcEvent[] {
    const ev: NpcEvent[] = [];
    const eat = this.eating.get(n.id);
    if (eat && this.clock >= eat.until) {
      this.eating.delete(n.id);
      if (n.holding === eat.prop.id) {
        const type = eat.prop.type;
        this.props.destroy(eat.prop);
        n.holding = null;
        n.holdType = null;
        if (type === 'salmiakki' || type === 'herring') ev.push(...startle(n, 'yuck'));
        if (type === 'herring') ev.push({ type: 'review', npc: n });
      }
    }
    const free = n.mode === 'idle' || n.mode === 'walk' || n.mode === 'recover';
    if (!n.wants.length || n.holding !== null || !free) return ev;
    for (const p of this.props.props) {
      if (p.broken || p.carried || p.heldBy !== null || p.ignoreGrab > 0 || !n.wants.includes(p.type)) continue;
      const t = p.body.translation();
      if (t.y > 1.2 || Math.hypot(t.x - n.x, t.z - n.z) > 2.0) continue;
      this.props.attach(p, n.id);
      p.stolen = false;
      n.holding = p.id;
      n.holdType = p.type;
      n.targetX = n.targetZ = null;
      ev.push({ type: 'tookItem', npc: n, propType: p.type });
      if (p.type === 'toy') {
        ev.push(...startle(n, 'cheer')); // the child hugs the teddy and keeps it
      } else {
        n.mode = 'eat';
        n.t = 0;
        n.nextT = 2.2;
        this.eating.set(n.id, { prop: p, until: this.clock + 2.2 });
      }
      break;
    }
    return ev;
  }

  /** Send whoever an item was snatched from to a place (e.g. the wrong ferry). Returns true if there was such a victim. */
  sendVictimTo(propId: number, x: number, z: number, name: string): boolean {
    const id = this.victimOf.get(propId) ?? this.firstHolder.get(propId);
    const n = this.npcs.find((o) => o.id === id);
    if (!n) return false;
    n.goal = { x, z, name };
    // whatever they were doing (even chasing the thief), they now head for the place, and the gull no longer catches their eye on the way
    if (n.mode === 'idle' || n.mode === 'recover' || n.mode === 'eat' || n.mode === 'chase' || n.mode === 'notice' || n.mode === 'shield') {
      n.mode = 'walk';
      n.t = 0;
      n.targetX = n.targetZ = null;
    }
    n.obliviousT = Math.max(n.obliviousT, 60);
    n.following = false;
    return true;
  }

  /** Tourists are solid for the gull: push it out sideways. Returns true if it bumped hard (dive). */
  pushGull(s: FlightState): boolean {
    let bumped = false;
    for (const n of this.npcs) {
      if (s.y - n.y < 0.2 || s.y - n.y > BODY_HEIGHT + 0.6) continue;
      const dx = s.x - n.x, dz = s.z - n.z;
      const d = Math.hypot(dx, dz);
      const min = BODY_RADIUS + 0.5;
      if (d >= min) continue;
      const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0;
      s.x = n.x + nx * min;
      s.z = n.z + nz * min;
      const vn = s.vx * nx + s.vz * nz;
      if (vn < 0) {
        if (-vn > 8) bumped = true;
        s.vx -= vn * nx;
        s.vz -= vn * nz;
      }
    }
    return bumped;
  }

  /** Prompt when the beak is close to an ice cream it cannot take: explains why. */
  blockedHint(beak: { x: number; y: number; z: number }): string | null {
    for (const n of this.npcs) {
      const st = snatchState(n, beak);
      if (st !== 'blocked') continue;
      const h = handPos(n);
      if (Math.hypot(beak.x - h.x, beak.y - h.y, beak.z - h.z) < 3.2) return 'Their body is in the way: distract them or come from the other side';
    }
    return null;
  }

  nearestDistance(g: { x: number; z: number }): number {
    let best = Infinity;
    for (const n of this.npcs) best = Math.min(best, Math.hypot(g.x - n.x, g.z - n.z));
    return best;
  }

  // ---- NpcHooks (used by Interaction) ----
  snatchCandidates(beak: { x: number; y: number; z: number }): GrabCandidate[] {
    const out: GrabCandidate[] = [];
    for (const n of this.npcs) {
      if (n.holding === null || !snatchable(n, beak)) continue;
      const prop = this.props.byId(n.holding);
      if (!prop || prop.def.grab === 'ground') continue; // only a tug takes this one
      const h = handPos(n);
      out.push({ id: prop.id, x: h.x, y: h.y, z: h.z, mass: prop.def.mass });
    }
    return out;
  }

  /** What a gull on the ground may start tugging: held items within reach of the hand whose kind allows a tug. */
  tugCandidates(beak: { x: number; y: number; z: number }): GrabCandidate[] {
    const out: GrabCandidate[] = [];
    const reach = tuning.tug.reach.value;
    for (const n of this.npcs) {
      if (n.holding === null || n.tugged || n.mode === 'panic' || n.mode === 'slip' || n.mode === 'yuck') continue;
      const prop = this.props.byId(n.holding);
      if (!prop || prop.def.grab === 'air') continue;
      const h = handPos(n);
      if (Math.hypot(beak.x - h.x, beak.z - h.z) > reach || Math.abs(beak.y - h.y) > 1.6) continue;
      out.push({ id: prop.id, x: h.x, y: h.y, z: h.z, mass: prop.def.mass });
    }
    return out;
  }

  /** The person pulls back: they hold on and face the gull until the tug ends. */
  onTugStart(propId: number): void {
    const n = this.npcs.find((x) => x.holding === propId);
    if (!n) return;
    n.tugged = true;
    if (n.mood === 'calm') setMood(n, 'annoyed', this.pending);
    this.addNoise(n.x, n.z, 0.7);
  }

  /** The tug is over (won, lost or given up): they let go of being tugged; if they won they are smug and watchful. */
  onTugEnd(propId: number, won: boolean): void {
    const n = this.npcs.find((x) => x.holding === propId) ?? this.npcs.find((x) => x.tugged);
    if (n) {
      n.tugged = false;
      if (!won && n.holding !== null) {
        n.mode = 'notice';
        n.t = 0;
        n.noticeCd = 0;
      }
    }
  }

  /** How hard the holder of this prop pulls right now. */
  pullOf(propId: number): number {
    const n = this.npcs.find((x) => x.holding === propId);
    return n ? npcPull(n) : 0;
  }

  /** Is anyone still holding this prop (and being tugged)? */
  isTugged(propId: number): boolean {
    return this.npcs.some((n) => n.tugged && n.holding === propId);
  }

  /** The gull picks up something a person dropped: someone who will not let go sets off after the thief. */
  onGroundPickup(propId: number): void {
    const id = this.droppedBy.get(propId);
    this.droppedBy.delete(propId);
    const n = this.npcs.find((o) => o.id === id);
    if (!n || !(n.relentless || n.hadComfort) || n.mode === 'chase') return;
    this.pending.push(...startle(n, 'snatched'));
  }

  onSnatched(propId: number): void {
    const n = this.npcs.find((x) => x.holding === propId);
    if (n) {
      n.tugged = false;
      this.victimOf.set(propId, n.id);
      if (n.role === 'cleaner' && n.cleanT > 0) this.pending.push({ type: 'cleanerRobbed', npc: n });
      // never saw it coming: calm, and not looking at the gull (approached from behind, from above, or while distracted)
      // (hasn't noticed you yet: still calm. Being in sight for a moment is not the same as being noticed)
      if (n.mode === 'idle' || n.mode === 'walk' || n.mode === 'eat') this.pending.push({ type: 'snatchUnseen', npc: n });
      this.pending.push(...startle(n, 'snatched'));
    }
  }

  /** Make a person let go of what is in their hand (it falls to the ground). */
  private dropHeld(n: Npc): void {
    const prop = n.holding !== null ? this.props.byId(n.holding) : undefined;
    if (!prop) return;
    this.props.release(prop, { x: (this.rng.next() - 0.5) * 1.5, y: 2, z: (this.rng.next() - 0.5) * 1.5 });
    prop.heldBy = null;
    prop.stolen = true; // dropped by someone: carrying it off still counts as getting away with it
    this.droppedBy.set(prop.id, n.id);
    n.holding = null;
    n.holdType = null;
  }

  /** A vendor's spray lands: everyone inside its cone and range is soaked: they drop what they hold and run. */
  soakCone(sx: number, sz: number, aimX: number, aimZ: number): Npc[] {
    const d = tuning.deter;
    const aim = Math.atan2(-(aimX - sx), -(aimZ - sz));
    const out: Npc[] = [];
    for (const n of this.npcs) {
      if (n.mode === 'panic') continue;
      const dist = Math.hypot(n.x - sx, n.z - sz);
      if (dist > d.sprayRange.value + 0.8 || dist < 0.2) continue;
      const diff = Math.atan2(Math.sin(Math.atan2(-(n.x - sx), -(n.z - sz)) - aim), Math.cos(Math.atan2(-(n.x - sx), -(n.z - sz)) - aim));
      if (Math.abs(diff) > (d.sprayConeDeg.value * Math.PI) / 360 + 0.15) continue;
      this.dropHeld(n);
      this.pending.push(...startle(n, 'pooped'));
      this.pending.push({ type: 'soaked', npc: n });
      out.push(n);
    }
    return out;
  }

  /** The plastic owl frightens calm people within `range` of it: they drop what they hold and run. */
  scareNear(x: number, z: number, range: number, carried: boolean): Npc[] {
    const out: Npc[] = [];
    for (const n of this.npcs) {
      if (!isCalm(n)) continue;
      if (Math.hypot(n.x - x, n.z - z) > range) continue;
      this.dropHeld(n);
      this.pending.push(...startle(n, 'pooped'));
      this.pending.push({ type: 'scared', npc: n, carried });
      out.push(n);
    }
    return out;
  }

  poopSpheres(): HitSphere[] {
    this.owners = [];
    const out: HitSphere[] = [];
    for (const n of this.npcs) {
      out.push({ x: n.x, y: n.y + 1.0, z: n.z, r: NPC_RADIUS_BODY, tag: 'tourist' }, { x: n.x, y: n.y + 1.75, z: n.z, r: 0.3, tag: 'tourist' });
      this.owners.push(n, n);
    }
    return out;
  }

  /** Returns the role of whoever was hit (for quests like the blind date). */
  onPooped(index: number): string | undefined {
    const n = this.owners[index];
    if (!n) return undefined;
    this.pending.push(...startle(n, 'pooped'));
    return n.role;
  }

  /** A tourist takes back their own stolen item if it lies close by (dropped in front of them) and they are calm. */
  private reclaim(n: Npc): NpcEvent[] {
    if (n.holding !== null || !(n.mode === 'idle' || n.mode === 'walk' || n.mode === 'recover')) return [];
    for (const [propId, owner] of this.victimOf) {
      if (owner !== n.id) continue;
      const p = this.props.byId(propId);
      if (!p || p.broken || p.carried || p.heldBy !== null || p.ignoreGrab > 0) continue;
      const t = p.body.translation();
      if (t.y > 1.2 || Math.hypot(t.x - n.x, t.z - n.z) > 2.2) continue;
      this.props.attach(p, n.id);
      p.stolen = false;
      p.lost = false;
      n.holding = p.id;
      n.holdType = p.type;
      return [{ type: 'reclaimed', npc: n, propType: p.type }];
    }
    return [];
  }

  /** Send everyone with this role off to places (the ruined date storms off in opposite directions). */
  sendRole(role: string, goals: { x: number; z: number; name: string }[]): void {
    let i = 0;
    for (const n of this.npcs) {
      if (n.role !== role) continue;
      const g = goals[i++ % goals.length];
      n.goal = { ...g };
      n.homeX = g.x; // sent somewhere, they stay around there (a fire drill crowd does not drift home)
      n.homeZ = g.z;
      n.stationary = false;
      n.follows = false; // sent off: no longer in the conga line
      n.followT = 0;
      n.following = false;
      if (n.mode === 'idle' || n.mode === 'recover' || n.mode === 'eat') {
        n.mode = 'walk';
        n.t = 0;
        n.targetX = n.targetZ = null;
      }
    }
  }

  /** Held items as dive-assist targets: diving at a tourist's ice cream (or map, or sweets) curves toward it. */
  handTargets(): Target[] {
    const out: Target[] = [];
    for (const n of this.npcs) {
      if (n.holding === null) continue;
      const h = handPos(n);
      let t = this.handTargetCache.get(n.id);
      if (!t) this.handTargetCache.set(n.id, (t = { x: 0, y: 0, z: 0, radius: 0.6, cooldown: 0 }));
      t.x = h.x;
      t.y = h.y;
      t.z = h.z;
      out.push(t);
    }
    return out;
  }

  /** Remove every person (loading another level). Their props are cleared separately. */
  clearAll(): void {
    for (const m of this.models.values()) this.parent.remove(m.root);
    for (const r of this.rings.values()) this.parent.remove(r);
    this.models.clear();
    this.rings.clear();
    this.spawns.clear();
    this.items.clear();
    this.eating.clear();
    this.victimOf.clear();
    this.droppedBy.clear();
    this.handTargetCache.clear();
    this.pending.length = 0;
    this.npcs.length = 0;
    this.nextId = 1;
    this.rng = createRng(this.seed);
  }

  private remote = new Map<number, NpcSnap>();

  /** Where the host says each person is and what they are doing (a guest does not simulate people). */
  setRemote(list: readonly NpcSnap[]): void {
    for (const s of list) {
      this.remote.set(s.id, s);
      const n = this.npcs.find((x) => x.id === s.id);
      if (!n) continue;
      n.mode = s.mode as Npc['mode'];
      n.holding = s.holding;
      n.handAngle = s.ha ?? n.handAngle;
      n.selfie = (s.sf as Npc['selfie']) ?? n.selfie;
      n.selfieCount = s.sc ?? n.selfieCount;
      n.cleanT = s.ct ?? n.cleanT;
      n.shieldFrom = s.sh ?? n.shieldFrom;
    }
  }

  /** One sim step on a guest: walk each person towards the host's news and animate the legs from how far they moved. */
  stepRemote(dt: number): void {
    for (const n of this.npcs) {
      const s = this.remote.get(n.id);
      if (!s) continue;
      const ox = n.x, oz = n.z;
      n.x = easeTo(n.x, s.p[0], dt, 14);
      n.z = easeTo(n.z, s.p[1], dt, 14);
      n.heading = easeAngle(n.heading, s.h, dt, 14);
      n.speed = Math.hypot(n.x - ox, n.z - oz) / Math.max(dt, 1e-4);
      n.moving = n.speed > 0.15;
      n.walkPhase += n.speed * dt * 2.2;
    }
  }

  reset(): void {
    this.rng = createRng(this.seed);
    for (const n of this.npcs) {
      const sp = this.spawns.get(n.id)!;
      const fresh = newNpc(n.id, sp);
      Object.assign(n, fresh);
      const prop = this.items.get(n.id);
      const holds = sp.holds ?? (sp.ice ? 'icecream' : undefined);
      if (holds && prop) {
        // Interaction.reset() already put the prop back; hand it to its owner again
        this.props.attach(prop, n.id);
        n.holding = prop.id;
        n.holdType = holds;
        this.props.setHoldTarget(prop, handPos(n));
      }
    }
    this.eating.clear();
    this.victimOf.clear();
    this.droppedBy.clear();
    this.pending.length = 0;
  }

  render(time: number, beak?: { x: number; y: number; z: number }, faceCamera?: THREE.Quaternion): void {
    for (const n of this.npcs) {
      this.models.get(n.id)!.apply(n, time);
      const ring = this.rings.get(n.id)!;
      const gs = guardState(n);
      const near = beak ? Math.hypot(beak.x - n.x, beak.z - n.z) < 28 : true;
      ring.visible = gs !== 'none' && near;
      if (!ring.visible) continue;
      const h = handPos(n);
      ring.position.set(h.x, h.y + 0.1, h.z);
      if (faceCamera) ring.quaternion.copy(faceCamera); // always a clear circle from the chase camera
      const pulse = 1 + Math.sin(time * 6) * (gs === 'open' ? 0.18 : 0.06);
      ring.scale.setScalar(pulse);
      (ring.material as THREE.MeshBasicMaterial).color.setHex(gs === 'guarded' ? RING_GUARDED : RING_OPEN);
    }
  }
}


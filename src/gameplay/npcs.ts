import { watchedGull } from './coopPlay';
import * as THREE from 'three';
import type { NpcSnap } from '../net/snapshot';
import { easeAngle, easeTo } from '../net/remote';
import { createRng, type Rng } from '../core/rng';
import { tuning } from '../core/tuning';
import type { PropType } from '../data/props';
import type { Target } from './targets';
import { BODY_HEIGHT, BODY_RADIUS, guardState, handPos, newNpc, snatchable, snatchState, startle, stepNpc, type GullInfo, type Noise, type Npc, type NpcEvent, type NpcSpawn, type Station } from './npc';
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
  private rng: Rng;
  private nextId = 1;
  private owners: Npc[] = [];
  /** Each tourist's own item in hand (so reset can hand it back after a snatch). */
  private items = new Map<number, Prop>();
  /** Who an item was snatched from (quests send the victim somewhere afterwards). */
  private victimOf = new Map<number, number>();
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
    const model = new NpcModel(sp.color, n.id, { hat: sp.hat, hatColor: sp.hatColor });
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
    if (!goods) {
      n.craves = type;
      n.mood = 'upset';
      return;
    }
    this.props.attach(goods, n.id);
    n.holding = goods.id;
    n.holdType = type;
    this.props.setHoldTarget(goods, handPos(n));
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
    for (const n of this.npcs) {
      if (n.role === 'selfie' || n.role === 'blogger') ev.push(...this.selfieStep(n, gulls)); // the blogger photographs her dish on the same rhythm
      if (n.role === 'cleaner') this.cleanStep(n, dt);
      const near = gulls.length === 1 ? gulls[0] : watchedGull(n, gulls);
      const stepped = stepNpc(n, near, this.noises, dt, ctx);
      for (const e of stepped) if (e.type === 'bought') this.serve(e.npc, e.station, e.propType);
      ev.push(...stepped);
      ev.push(...this.wantedItems(n));
      ev.push(...this.reclaim(n));
      // solid walls, counters and landmarks push the tourist out (horizontal only)
      const p = { x: n.x, y: 0.9, z: n.z };
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
    if (was === 'count' && st.phase === 'open') ev.push({ type: 'selfieClick', npc: n, inFrame: gulls.some((g) => inFrame(n, facing, g)), framed: gulls.filter((g) => inFrame(n, facing, g)).length });
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
    const id = this.victimOf.get(propId);
    const n = this.npcs.find((o) => o.id === id);
    if (!n) return false;
    n.goal = { x, z, name };
    if (n.mode === 'idle' || n.mode === 'recover' || n.mode === 'eat') {
      n.mode = 'walk';
      n.t = 0;
      n.targetX = n.targetZ = null;
    }
    return true;
  }

  /** Tourists are solid for the gull: push it out sideways. Returns true if it bumped hard (dive). */
  pushGull(s: FlightState): boolean {
    let bumped = false;
    for (const n of this.npcs) {
      if (s.y < 0.2 || s.y > BODY_HEIGHT + 0.6) continue;
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
      if (!prop) continue;
      const h = handPos(n);
      out.push({ id: prop.id, x: h.x, y: h.y, z: h.z, mass: prop.def.mass });
    }
    return out;
  }

  onSnatched(propId: number): void {
    const n = this.npcs.find((x) => x.holding === propId);
    if (n) {
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
      if (!(n.mode === 'idle' || n.mode === 'walk' || n.mode === 'eat')) continue;
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
      out.push({ x: n.x, y: 1.0, z: n.z, r: NPC_RADIUS_BODY, tag: 'tourist' }, { x: n.x, y: 1.75, z: n.z, r: 0.3, tag: 'tourist' });
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
      n.stationary = false;
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


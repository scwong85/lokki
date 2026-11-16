import * as THREE from 'three';
import { createRng, type Rng } from '../core/rng';
import { mods } from '../core/skillMods';
import { tuning } from '../core/tuning';
import { DEFENSE_ZONE as ZONE, LINES, LINE_POSTS, LINE_ZONE, NET_POSTS, NET_Y, NET_ZONE, VENDOR_SPAWNS, WARDEN_PATROL, WARDEN_SPAWN } from '../data/deterrents';
import { CityResponse, ZoneTracker, segmentHit, type DeterrentId, type GullHit } from './deterrents';
import { Heat, type HeatReason, type TierChange } from './heat';
import { newVendor, stepVendor, vendorPooped, type Vendor } from './vendor';
import { newDrone, stepDrone, type Drone } from './drone';
import { newWarden, stepWarden, umbrellaUp, wardenPooped, type Warden } from './warden';
import type { GullInfo, Noise } from './npc';
import { nearestGull, wardenTarget } from './focus';
import type { HitSphere } from './poop';
import type { DefenseSnap } from '../net/snapshot';
import type { FlightState } from '../gull/flight';
import type { World } from '../world/collision';
import { NpcModel, type NpcView } from '../world/npcModel';

export type DefenseEvent =
  | { type: 'tier'; tier: number; up: boolean }
  | { type: 'deployed'; id: DeterrentId; cause: 'heat' | 'learned' }
  | { type: 'learned'; id: DeterrentId }
  | { type: 'dodged'; id: DeterrentId; count: number; need: number }
  | { type: 'hit'; hit: GullHit; gull: number }
  | { type: 'noticed'; who: 'vendor' | 'warden' }
  | { type: 'spray'; x: number; z: number; aimX: number; aimZ: number }
  | { type: 'lunch'; on: boolean }
  | { type: 'vendorsScared'; count: number }
  | { type: 'vendorDistracted' }
  | { type: 'vendorWoke' }
  | { type: 'droneDodged' }
  | { type: 'droneBonk' }
  | { type: 'droneDown'; x: number; z: number }
  | { type: 'poopVendor' }
  | { type: 'poopWarden' }
  | { type: 'umbrella' };

/** One gull as the city's defence sees it. */
export interface DefenseGull {
  id: number;
  state: FlightState;
  /** Disguised: vendors and the Warden ignore it. */
  hidden?: boolean;
  /** Carrying stolen food (the Warden prefers this one). */
  suspicious?: boolean;
}

type Owner = { kind: 'vendor'; v: Vendor } | { kind: 'umbrella' } | { kind: 'warden' };

const LINE_COLOR = 0xffffff;
const HAWK_COLOR = 0xff9d2e;
const GULL_R = 0.5;

/** The city's response to mischief: heat, vendors with spray bottles, scare lines, nets, the Gull Warden, and their learning. */
export class CityDefense {
  readonly heat = new Heat();
  readonly response = new CityResponse();
  readonly group = new THREE.Group();
  vendors: Vendor[] = [];
  warden: Warden | null = null;
  /** The gull-hunting drone (a level may set it loose). */
  drone: Drone | null = null;
  private droneModel = new THREE.Group();
  private rotors: THREE.Mesh[] = [];

  private vendorModels: NpcModel[] = [];
  private wardenModel: NpcModel;
  private lineMeshes: THREE.Mesh[] = [];
  private netGroup = new THREE.Group();
  private netMat: THREE.MeshBasicMaterial;
  private netLines: THREE.LineSegments;
  private netPosts: THREE.Mesh[] = [];
  private lineMat: THREE.MeshBasicMaterial;
  private install: { lines: number; nets: number } = { lines: 0, nets: 0 };
  /** Per gull: the fly-through trackers and a hit cooldown (two gulls never share a near miss). */
  private perGull = new Map<number, { lines: ZoneTracker; nets: ZoneTracker; hitCd: number }>();
  private gullState(id: number) {
    let g = this.perGull.get(id);
    if (!g) this.perGull.set(id, (g = { lines: new ZoneTracker(LINE_ZONE), nets: new ZoneTracker(NET_ZONE), hitCd: 0 }));
    return g;
  }
  private hawkT = 0;
  private hawkCd = 0;
  /** The Warden's lunch break (a level may schedule one): from `from` to `to` seconds after the level started he sits at (x, z) with his umbrella down. */
  lunch: { x: number; z: number; from: number; to: number; repeat?: number } | null = null;
  /** The lines are only visible with hawk-eye (a level setting). */
  hiddenLines = false;
  private clock = 0;
  private lunchOn = false;
  private scareCd = 0;
  private pending: DefenseEvent[] = [];
  private owners: Owner[] = [];
  private rng: Rng;
  private sprayFx: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];
  /** Red fan on the ground while a vendor aims: that is where the spray will land. */
  private cones: { mesh: THREE.Mesh; deg: number }[] = [];
  private swatRing: THREE.Mesh;

  constructor(private world: World, parent: THREE.Object3D, private walkable: (x: number, z: number) => boolean, private seed = 77) {
    this.rng = createRng(seed);
    parent.add(this.group);

    VENDOR_SPAWNS.forEach((sp, i) => {
      this.vendors.push(newVendor(100 + i, sp.x, sp.z, sp.heading));
      const m = new NpcModel(sp.color, 7 + i, { hat: 'cap', hatColor: 0xffffff });
      m.root.visible = false;
      this.group.add(m.root);
      this.vendorModels.push(m);
    });

    // the drone: a flat dark body, four rotor discs and a red light
    const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.9), new THREE.MeshLambertMaterial({ color: 0x3d424d, flatShading: true }));
    this.droneModel.add(dBody, new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff4d4d })));
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 10), new THREE.MeshBasicMaterial({ color: 0xcfd6e0, transparent: true, opacity: 0.45 }));
      r.position.set(x, 0.2, z);
      this.droneModel.add(r);
      this.rotors.push(r);
    }
    this.droneModel.visible = false;
    this.group.add(this.droneModel);
    this.wardenModel = new NpcModel(0xd6f23c, 3, { hat: 'cap', hatColor: 0x2f3442, umbrella: true });
    this.wardenModel.root.visible = false;
    this.group.add(this.wardenModel.root);

    // scare lines: thin pale cylinders + poles (hidden until deployed)
    this.lineMat = new THREE.MeshBasicMaterial({ color: LINE_COLOR, transparent: true, opacity: 0.55 });
    for (const s of LINES) {
      const a = new THREE.Vector3(...s.a), b = new THREE.Vector3(...s.b);
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 5), this.lineMat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      m.visible = false;
      this.group.add(m);
      this.lineMeshes.push(m);
    }
    for (const [x, z] of LINE_POSTS) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, LINES[0].a[1], 6), new THREE.MeshLambertMaterial({ color: 0x8a8fa0 }));
      post.position.set(x, LINES[0].a[1] / 2, z);
      post.userData.post = true;
      post.visible = false;
      this.group.add(post);
      this.lineMeshes.push(post);
    }

    // net: translucent sheet with a grid
    const w = ZONE.maxX - ZONE.minX, d = ZONE.maxZ - ZONE.minZ;
    this.netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.netMat);
    sheet.rotation.x = -Math.PI / 2;
    const pts: number[] = [];
    for (let x = ZONE.minX; x <= ZONE.maxX + 0.01; x += 2) pts.push(x, 0, ZONE.minZ, x, 0, ZONE.maxZ);
    for (let z = ZONE.minZ; z <= ZONE.maxZ + 0.01; z += 2) pts.push(ZONE.minX, 0, z, ZONE.maxX, 0, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.netLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    this.netGroup.add(sheet, this.netLines);
    this.netGroup.position.set((ZONE.minX + ZONE.maxX) / 2, NET_Y, (ZONE.minZ + ZONE.maxZ) / 2);
    this.netLines.position.set(-(ZONE.minX + ZONE.maxX) / 2, 0, -(ZONE.minZ + ZONE.maxZ) / 2);
    this.netGroup.visible = false;
    this.group.add(this.netGroup);
    for (const [x, z] of NET_POSTS) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, NET_Y, 6), new THREE.MeshLambertMaterial({ color: 0x8a8fa0 }));
      post.position.set(x, NET_Y / 2, z);
      post.visible = false;
      this.group.add(post);
      this.netPosts.push(post);
    }

    const telegraphMat = () => new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
    VENDOR_SPAWNS.forEach(() => {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), telegraphMat());
      mesh.visible = false;
      this.group.add(mesh);
      this.cones.push({ mesh, deg: -1 });
    });
    this.swatRing = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), telegraphMat());
    this.swatRing.rotation.x = -Math.PI / 2;
    this.swatRing.visible = false;
    this.group.add(this.swatRing);

    const fxGeo = new THREE.SphereGeometry(0.13, 6, 5);
    const fxMat = new THREE.MeshBasicMaterial({ color: 0xa9dcff });
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(fxGeo, fxMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.sprayFx.push({ mesh, vel: new THREE.Vector3(), life: 0 });
    }
  }

  // ---------- heat in ----------
  addHeat(reason: HeatReason): DefenseEvent[] {
    return this.tierEvents(this.heat.add(reason));
  }

  /** Night market: vendors doze at their stalls (they wake at noise and close gulls). */
  setSleepy(on: boolean): void {
    for (const v of this.vendors) {
      v.sleepy = on;
      if (on) v.mode = 'asleep';
    }
  }

  spawnDrone(x: number, z: number): void {
    this.drone = newDrone(x, z);
  }

  removeDrone(): void {
    this.drone = null;
  }

  /** Put these deterrents up right away (a level's starting situation), without touching the heat. */
  deployNow(ids: readonly DeterrentId[]): DefenseEvent[] {
    const ev: DefenseEvent[] = [];
    for (const id of ids) if (this.response.deploy(id)) ev.push(...this.deployed(id, 'heat'));
    return ev;
  }

  /** A quest started: the city is at least this alert. */
  ensureHeat(min: number): DefenseEvent[] {
    return this.tierEvents(this.heat.raiseTo(min));
  }

  private tierEvents(c: TierChange | null): DefenseEvent[] {
    if (!c) return [];
    const ev: DefenseEvent[] = [{ type: 'tier', tier: c.to, up: c.to > c.from }];
    if (c.to > c.from) for (const id of this.response.onTier(c.to)) ev.push(...this.deployed(id, 'heat'));
    return ev;
  }

  private deployed(id: DeterrentId, cause: 'heat' | 'learned'): DefenseEvent[] {
    if (id === 'lines') {
      this.install.lines = 0;
      for (const g of this.perGull.values()) g.lines.reset();
    } else if (id === 'nets') {
      this.install.nets = 0;
      for (const g of this.perGull.values()) g.nets.reset();
    } else if (id === 'warden' && !this.warden) {
      this.warden = newWarden(WARDEN_SPAWN.x, WARDEN_SPAWN.z);
    }
    return [{ type: 'deployed', id, cause }];
  }

  private bypass(id: DeterrentId, ev: DefenseEvent[]): void {
    const r = this.response.onBypass(id);
    ev.push({ type: 'dodged', id, count: this.response.learned[id], need: this.response.need(id) });
    if (r.learnedNow) ev.push({ type: 'learned', id });
    if (r.deployed) ev.push(...this.deployed(r.deployed, 'learned'));
  }

  // ---------- one sim step ----------
  /** `hidden`: the gull is disguised as a pigeon, so the vendors and the Warden neither see nor target it. */
  /**
   * `gulls`: every gull in play (or just player 1's flight state). Vendors watch the nearest visible gull, the Warden
   * the most suspicious one; lines and nets catch any gull. Hits say which gull they hit.
   */
  update(dt: number, gulls: readonly DefenseGull[] | FlightState, noises: readonly Noise[], touristSees: boolean, hidden = false): DefenseEvent[] {
    const list: readonly DefenseGull[] = Array.isArray(gulls) ? gulls : [{ id: 0, state: gulls as FlightState, hidden }];
    const ev: DefenseEvent[] = this.pending.splice(0);
    const FAR: GullInfo = { x: 1e5, y: 60, z: 1e5, diving: false };
    const views = list.map((g) => ({ id: g.id, x: g.state.x, y: g.state.y, z: g.state.z, hidden: g.hidden, suspicious: g.suspicious, g }));
    const infoFor = (v: (typeof views)[number] | null): GullInfo => (v ? { x: v.x, y: v.y, z: v.z, diving: v.g.state.mode === 'dive' } : FAR);
    for (const g of list) this.gullState(g.id).hitCd = Math.max(0, this.gullState(g.id).hitCd - dt);
    this.hawkT = Math.max(0, this.hawkT - dt);
    this.hawkCd = Math.max(0, this.hawkCd - dt);
    const d = tuning.deter;
    if (this.response.deployed.has('lines')) this.install.lines = Math.min(1, this.install.lines + dt / d.installTime.value);
    if (this.response.deployed.has('nets')) this.install.nets = Math.min(1, this.install.nets + dt / d.installTime.value);

    // vendors
    const alert = this.heat.tier >= 1;
    if (this.response.deployed.has('vendors')) {
      for (const v of this.vendors) {
        const target = nearestGull(v, views);
        for (const e of stepVendor(v, infoFor(target), alert, dt, this.world, noises)) {
          if (e.type === 'noticed') ev.push({ type: 'noticed', who: 'vendor' });
          else if (e.type === 'woke') ev.push({ type: 'vendorWoke' });
          else if (e.type === 'distracted') ev.push({ type: 'vendorDistracted' });
          else if (e.type === 'spray') {
            ev.push({ type: 'spray', x: v.x, z: v.z, aimX: v.aimX, aimZ: v.aimZ });
            this.spawnSpray(v);
            if (e.hit && target) ev.push({ type: 'hit', gull: target.id, hit: { kind: 'spray', dx: e.dx, dz: e.dz, strength: this.response.strength('vendors') } });
          } else this.bypass('vendors', ev);
        }
      }
    }

    // the Warden's lunch break
    this.clock += dt;
    this.scareCd = Math.max(0, this.scareCd - dt);
    const lun = this.lunch;
    const inLunch = !!lun && this.clock >= lun.from && (lun.repeat ? (this.clock - lun.from) % lun.repeat < lun.to - lun.from : this.clock < lun.to);
    const lunchNow = inLunch && !!this.warden;
    if (lunchNow !== this.lunchOn) {
      this.lunchOn = lunchNow;
      ev.push({ type: 'lunch', on: lunchNow });
    }
    // the Warden
    const w = this.warden;
    if (w) {
      const ctx = { world: this.world, walkable: this.walkable, patrol: WARDEN_PATROL, rng: this.rng, lunch: lunchNow && this.lunch ? { x: this.lunch.x, z: this.lunch.z } : null };
      const target = wardenTarget(w, views, tuning.deter.wardenThiefRange.value);
      for (const e of stepWarden(w, infoFor(target), noises, dt, ctx)) {
        if (e.type === 'noticed') ev.push({ type: 'noticed', who: 'warden' });
        else if (e.type === 'swat' && e.hit && target) ev.push({ type: 'hit', gull: target.id, hit: { kind: 'swat', dx: e.dx, dz: e.dz, strength: this.response.strength('warden') } });
        else if (e.type === 'dodged') this.bypass('warden', ev);
      }
      // keep him out of walls and off the water
      const p = { x: w.x, y: 0.9, z: w.z };
      this.world.collide(p, 0.42);
      w.x = p.x;
      w.z = p.z;
    }

    // the drone
    if (this.drone) {
      const target = nearestGull(this.drone, views);
      for (const e of stepDrone(this.drone, { ...infoFor(target), y: target ? target.y : 60 }, dt)) {
        if (e.type === 'hit' && target) ev.push({ type: 'hit', gull: target.id, hit: { kind: 'drone', dx: e.dx, dz: e.dz, strength: 1 } });
        else if (e.type === 'dodged') ev.push({ type: 'droneDodged' });
        else if (e.type === 'bonk') ev.push({ type: 'droneBonk' });
        else if (e.type === 'landed') ev.push({ type: 'droneDown', x: e.x, z: e.z });
      }
    }

    // scare lines and nets (harmless until put up): any gull can get caught
    for (const { id, state: gull } of list) {
    const gs = this.gullState(id);
    if (this.install.lines >= 1 && this.response.deployed.has('lines')) {
      if (gs.hitCd <= 0) {
        for (const s of LINES) {
          const h = segmentHit(gull, GULL_R + 0.05, s);
          if (h) {
            ev.push({ type: 'hit', gull: id, hit: { kind: 'line', dx: h.dx, dz: h.dz, strength: this.response.strength('lines') } });
            gs.lines.markHit();
            gs.hitCd = 1.2;
            break;
          }
        }
      }
      if (gs.lines.update(gull.x, gull.y, gull.z) === 'bypass') this.bypass('lines', ev);
    }
    if (this.install.nets >= 1 && this.response.deployed.has('nets')) {
      const inFootprint = gull.x >= ZONE.minX && gull.x <= ZONE.maxX && gull.z >= ZONE.minZ && gull.z <= ZONE.maxZ;
      const descending = gull.vy < -0.5 || gull.mode === 'dive'; // the net stops gulls coming down; climbing out through the mesh is fine
      if (inFootprint && descending && gs.hitCd <= 0 && gull.y + GULL_R >= NET_Y && gull.y - GULL_R <= NET_Y + 0.6) {
        ev.push({ type: 'hit', gull: id, hit: { kind: 'net', dx: 0, dz: 0, strength: this.response.strength('nets') } });
        gs.nets.markHit();
        gs.hitCd = 1.2;
      }
      if (gs.nets.update(gull.x, gull.y, gull.z) === 'bypass') this.bypass('nets', ev);
    }
    }

    // heat falls only when nobody can see the gull
    const seen = touristSees || this.vendors.some((v) => v.seesGull && this.response.deployed.has('vendors')) || (w?.seesGull ?? false);
    ev.push(...this.tierEvents(this.heat.tick(dt, seen)));
    return ev;
  }

  private spawnSpray(v: Vendor): void {
    let n = 0;
    const dirx = -Math.sin(v.heading), dirz = -Math.cos(v.heading);
    for (const f of this.sprayFx) {
      if (f.life > 0) continue;
      f.life = 0.7;
      f.mesh.position.set(v.x + dirx * 0.8, 1.3, v.z + dirz * 0.8);
      f.vel.set(dirx * 9 + (Math.random() - 0.5) * 2, (Math.random() - 0.3) * 1.5, dirz * 9 + (Math.random() - 0.5) * 2);
      f.mesh.visible = true;
      if (++n >= 20) break;
    }
  }

  // ---------- hawk-eye hint ----------
  activateHawk(): boolean {
    if (this.hawkCd > 0 || this.hawkT > 0) return false;
    this.hawkT = tuning.deter.hawkTime.value * mods.hawkTime;
    this.hawkCd = tuning.deter.hawkCooldown.value * mods.hawkCooldown + this.hawkT;
    return true;
  }

  get hawkActive(): boolean {
    return this.hawkT > 0;
  }

  get hawkReady(): number {
    const total = tuning.deter.hawkCooldown.value * mods.hawkCooldown + tuning.deter.hawkTime.value * mods.hawkTime;
    return this.hawkCd > 0 ? 1 - this.hawkCd / total : 1;
  }

  // ---------- poop hooks (composed with the tourists in main) ----------
  poopSpheres(): HitSphere[] {
    this.owners = [];
    const out: HitSphere[] = [];
    if (this.response.deployed.has('vendors')) {
      for (const v of this.vendors) {
        // generous targets: a sleeping vendor slumps behind his counter and the level "Sweet dreams" needs a hit from above
        out.push({ x: v.x, y: 1.0, z: v.z, r: 0.75, tag: 'vendor' }, { x: v.x, y: 1.75, z: v.z, r: 0.5, tag: 'vendor' });
        this.owners.push({ kind: 'vendor', v }, { kind: 'vendor', v });
      }
    }
    const w = this.warden;
    if (w) {
      // listed first so a poop falling from above meets the umbrella before his head
      if (umbrellaUp(w)) {
        out.push({ x: w.x, y: 2.45, z: w.z, r: 0.95, tag: 'umbrella' });
        this.owners.push({ kind: 'umbrella' });
      }
      out.push({ x: w.x, y: 1.0, z: w.z, r: 0.5, tag: 'warden' }, { x: w.x, y: 1.75, z: w.z, r: 0.3, tag: 'warden' });
      this.owners.push({ kind: 'warden' }, { kind: 'warden' });
    }
    return out;
  }

  onPooped(index: number): void {
    const o = this.owners[index];
    if (!o) return;
    if (o.kind === 'vendor') {
      vendorPooped(o.v);
      this.pending.push({ type: 'poopVendor' });
    } else if (o.kind === 'umbrella') this.pending.push({ type: 'umbrella' });
    else if (this.warden) {
      wardenPooped(this.warden);
      this.pending.push({ type: 'poopWarden' }, ...this.tierEvents(this.heat.relieve(tuning.heat.wardenRelief.value)));
    }
  }

  /** Any tourist-style "someone sees the gull" for the HUD. */
  anyoneSees(): boolean {
    return this.vendors.some((v) => v.seesGull) || (this.warden?.seesGull ?? false);
  }

  // ---------- visuals ----------
  render(time: number, dt: number): void {
    const vend = this.response.deployed.has('vendors');
    this.vendors.forEach((v, i) => {
      const m = this.vendorModels[i];
      m.root.visible = vend;
      if (!vend) return;
      const view: NpcView = {
        x: v.x, z: v.z, heading: v.heading, moving: false, walkPhase: 0, t: v.t, holding: false, distracted: false,
        mode: v.mode === 'idle' || v.mode === 'asleep' ? 'idle' : v.mode === 'alert' ? 'notice' : v.mode === 'windup' ? 'shield' : 'recover',
        hand: v.mode === 'windup' ? { x: v.x - Math.sin(v.heading) * 0.9, y: 1.45, z: v.z - Math.cos(v.heading) * 0.9 } : undefined,
      };
      m.applyView(view, time);
    });

    // telegraph: the spray fan while a vendor aims, the swat circle while the Warden winds up
    const range = tuning.deter.sprayRange.value;
    const deg = tuning.deter.sprayConeDeg.value;
    this.vendors.forEach((v, i) => {
      const c = this.cones[i];
      const on = vend && v.mode === 'windup';
      c.mesh.visible = on;
      if (!on) return;
      if (c.deg !== deg) {
        const half = (deg * Math.PI) / 360;
        const pts: number[] = [0, 0.12, 0];
        const n = 14;
        for (let k = 0; k <= n; k++) {
          const a = -half + (2 * half * k) / n;
          pts.push(Math.sin(a) * range, 0.12, -Math.cos(a) * range);
        }
        const idx: number[] = [];
        for (let k = 1; k <= n; k++) idx.push(0, k, k + 1);
        c.mesh.geometry.dispose();
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        g.setIndex(idx);
        c.mesh.geometry = g;
        c.deg = deg;
      }
      c.mesh.position.set(v.x, 0, v.z);
      c.mesh.rotation.y = Math.atan2(-(v.aimX - v.x), -(v.aimZ - v.z)); // forward = (-sin h, -cos h)
      (c.mesh.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.2 * Math.abs(Math.sin(time * 14));
    });
    const sw = this.warden;
    const swinging = !!sw && sw.mode === 'swat';
    this.swatRing.visible = swinging;
    if (swinging && sw) {
      this.swatRing.position.set(sw.aimX, 0.13, sw.aimZ);
      (this.swatRing.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.2 * Math.abs(Math.sin(time * 14));
    }

    const w = this.warden;
    this.wardenModel.root.visible = !!w;
    if (w) {
      this.wardenModel.applyView(
        {
          x: w.x, z: w.z, heading: w.heading, moving: w.moving, walkPhase: w.walkPhase, t: w.t, holding: w.distractT > 0, distracted: w.distractT > 0,
          mode: w.mode === 'patrol' || w.mode === 'lunch' ? (w.moving ? 'walk' : w.mode === 'lunch' ? 'eat' : 'idle') : w.mode === 'alert' ? 'notice' : w.mode === 'hunt' ? 'walk' : w.mode === 'swat' ? 'shield' : 'recover',
          hand: w.mode === 'swat' ? { x: w.x - Math.sin(w.heading) * 1.4, y: 1.8, z: w.z - Math.cos(w.heading) * 1.4 } : undefined,
        },
        time,
      );
      this.wardenModel.setUmbrella(umbrellaUp(w));
    }

    this.droneModel.visible = !!this.drone;
    if (this.drone) {
      const dr = this.drone;
      this.droneModel.position.set(dr.x, dr.y, dr.z);
      this.droneModel.rotation.y += dt * 0.5;
      for (const r of this.rotors) r.visible = dr.mode !== 'down' || Math.sin(time * 40) > 0; // blades flicker, stop when it lands
    }
    const hawk = this.hawkT > 0;
    const lines = this.response.deployed.has('lines');
    const lf = this.install.lines;
    for (const m of this.lineMeshes) {
      m.visible = lines && (!this.hiddenLines || hawk);
      if (!m.userData.post) m.scale.set(hawk ? 3 : 1, lf, hawk ? 3 : 1); // grows into place while being installed
    }
    this.lineMat.color.setHex(hawk ? HAWK_COLOR : LINE_COLOR);
    // the lines glint now and then (a subtle hint even without hawk-eye)
    this.lineMat.opacity = hawk ? 1 : 0.42 + 0.2 * Math.max(0, Math.sin(time * 2.1 + 1)) ** 6;

    const nets = this.response.deployed.has('nets');
    this.netGroup.visible = nets;
    for (const p of this.netPosts) p.visible = nets;
    const nf = this.install.nets;
    this.netMat.opacity = (hawk ? 0.4 : 0.1) * nf;
    this.netMat.color.setHex(hawk ? HAWK_COLOR : 0xffffff);
    (this.netLines.material as THREE.LineBasicMaterial).opacity = (hawk ? 1 : 0.35) * nf;
    (this.netLines.material as THREE.LineBasicMaterial).color.setHex(hawk ? HAWK_COLOR : 0xffffff);

    for (const f of this.sprayFx) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.vel.y -= 6 * dt;
      if (f.life <= 0) f.mesh.visible = false;
    }
  }

  /** The plastic owl is near: vendors within `range` freeze up for a few seconds (their customers think it is real). */
  scareVendors(x: number, z: number, range: number): number {
    if (this.scareCd > 0 || !this.response.deployed.has('vendors')) return 0;
    let n = 0;
    for (const v of this.vendors) {
      if (Math.hypot(v.x - x, v.z - z) > range) continue;
      vendorPooped(v);
      n++;
    }
    if (n) this.scareCd = tuning.owl.cooldown.value;
    return n;
  }

  /** What a guest needs to draw the city's response. */
  remoteSnap(): DefenseSnap {
    const r = (v: number, k = 100) => Math.round(v * k) / k || 0;
    const w = this.warden;
    return {
      dep: [...this.response.deployed],
      inst: [r(this.install.lines), r(this.install.nets)],
      v: this.vendors.map((v) => [r(v.x), r(v.z), r(v.heading, 1000), v.mode, r(v.aimX), r(v.aimZ)]),
      w: w ? [r(w.x), r(w.z), r(w.heading, 1000), w.mode, w.moving ? 1 : 0, r(w.walkPhase), w.distractT > 0 ? 1 : 0, w.exposedT > 0 ? 1 : 0, r(w.aimX), r(w.aimZ)] : null,
      hawk: r(this.hawkT, 10),
      dr: this.drone ? [r(this.drone.x), r(this.drone.y), r(this.drone.z), ['hunt', 'windup', 'recover', 'down'].indexOf(this.drone.mode)] : null,
    };
  }

  /** A guest copies the host's response (nothing is decided here). */
  applyRemote(d: DefenseSnap, dt: number): void {
    this.response.deployed = new Set(d.dep as DeterrentId[]);
    this.install = { lines: d.inst[0], nets: d.inst[1] };
    d.v.forEach((s, i) => {
      const v = this.vendors[i];
      if (!v) return;
      v.x = s[0];
      v.z = s[1];
      v.heading = s[2];
      v.mode = s[3] as Vendor['mode'];
      v.aimX = s[4];
      v.aimZ = s[5];
      v.t += dt;
    });
    if (!d.w) this.warden = null;
    else {
      const w = this.warden ?? (this.warden = newWarden(d.w[0], d.w[1]));
      [w.x, w.z, w.heading] = [d.w[0], d.w[1], d.w[2]];
      w.mode = d.w[3] as Warden['mode'];
      w.moving = d.w[4] === 1;
      w.walkPhase = d.w[5];
      w.distractT = d.w[6];
      w.exposedT = d.w[7];
      w.aimX = d.w[8];
      w.aimZ = d.w[9];
      w.t += dt;
    }
    this.hawkT = d.hawk;
    if (d.dr) {
      const dr = this.drone ?? (this.drone = newDrone(d.dr[0], d.dr[2]));
      [dr.x, dr.y, dr.z] = [d.dr[0], d.dr[1], d.dr[2]];
      dr.mode = (['hunt', 'windup', 'recover', 'down'] as const)[d.dr[3]] ?? 'hunt';
    } else this.drone = null;
  }

  /** Take the vendors, lines and nets out of the scene (loading another level). */
  dispose(): void {
    this.group.removeFromParent();
  }

  /** Back to calm: no deterrents, no heat, nothing learned. */
  reset(): void {
    this.heat.reset();
    this.response.reset();
    this.warden = null;
    this.vendors.forEach((v, i) => {
      const sp = VENDOR_SPAWNS[i];
      Object.assign(v, newVendor(v.id, sp.x, sp.z, sp.heading));
    });
    this.install = { lines: 0, nets: 0 };
    this.perGull.clear();
    this.pending.length = 0;
    this.hawkT = 0;
    this.hawkCd = 0;
    this.drone = null;
    this.clock = 0;
    this.lunchOn = false;
    this.scareCd = 0;
    this.rng = createRng(this.seed);
  }
}

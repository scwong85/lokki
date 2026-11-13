import * as THREE from 'three';
import { createRng, type Rng } from '../core/rng';
import { tuning } from '../core/tuning';
import { LINES, LINE_POSTS, LINE_ZONE, NET_Y, NET_ZONE, STALL_ZONE, VENDOR_SPAWNS, WARDEN_PATROL, WARDEN_SPAWN } from '../data/deterrents';
import { CityResponse, ZoneTracker, segmentHit, type DeterrentId, type GullHit } from './deterrents';
import { Heat, type HeatReason, type TierChange } from './heat';
import { newVendor, stepVendor, vendorPooped, type Vendor } from './vendor';
import { newWarden, stepWarden, umbrellaUp, wardenPooped, type Warden } from './warden';
import type { GullInfo, Noise } from './npc';
import type { HitSphere } from './poop';
import type { FlightState } from '../gull/flight';
import type { World } from '../world/collision';
import { NpcModel, type NpcView } from '../world/npcModel';

export type DefenseEvent =
  | { type: 'tier'; tier: number; up: boolean }
  | { type: 'deployed'; id: DeterrentId; cause: 'heat' | 'learned' }
  | { type: 'learned'; id: DeterrentId }
  | { type: 'hit'; hit: GullHit }
  | { type: 'noticed'; who: 'vendor' | 'warden' }
  | { type: 'spray' }
  | { type: 'poopVendor' }
  | { type: 'poopWarden' }
  | { type: 'umbrella' };

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

  private vendorModels: NpcModel[] = [];
  private wardenModel: NpcModel;
  private lineMeshes: THREE.Mesh[] = [];
  private netGroup = new THREE.Group();
  private netMat: THREE.MeshBasicMaterial;
  private netLines: THREE.LineSegments;
  private lineMat: THREE.MeshBasicMaterial;
  private install: { lines: number; nets: number } = { lines: 0, nets: 0 };
  private zones = { lines: new ZoneTracker(LINE_ZONE), nets: new ZoneTracker(NET_ZONE) };
  private hitCd = 0;
  private hawkT = 0;
  private hawkCd = 0;
  private pending: DefenseEvent[] = [];
  private owners: Owner[] = [];
  private rng: Rng;
  private sprayFx: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

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
    const w = STALL_ZONE.maxX - STALL_ZONE.minX, d = STALL_ZONE.maxZ - STALL_ZONE.minZ;
    this.netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.netMat);
    sheet.rotation.x = -Math.PI / 2;
    const pts: number[] = [];
    for (let x = STALL_ZONE.minX; x <= STALL_ZONE.maxX + 0.01; x += 2) pts.push(x, 0, STALL_ZONE.minZ, x, 0, STALL_ZONE.maxZ);
    for (let z = STALL_ZONE.minZ; z <= STALL_ZONE.maxZ + 0.01; z += 2) pts.push(STALL_ZONE.minX, 0, z, STALL_ZONE.maxX, 0, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.netLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    this.netGroup.add(sheet, this.netLines);
    this.netGroup.position.set((STALL_ZONE.minX + STALL_ZONE.maxX) / 2, NET_Y, (STALL_ZONE.minZ + STALL_ZONE.maxZ) / 2);
    this.netLines.position.set(-(STALL_ZONE.minX + STALL_ZONE.maxX) / 2, 0, -(STALL_ZONE.minZ + STALL_ZONE.maxZ) / 2);
    this.netGroup.visible = false;
    this.group.add(this.netGroup);

    const fxGeo = new THREE.SphereGeometry(0.07, 5, 4);
    const fxMat = new THREE.MeshBasicMaterial({ color: 0xa9dcff });
    for (let i = 0; i < 16; i++) {
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

  private tierEvents(c: TierChange | null): DefenseEvent[] {
    if (!c) return [];
    const ev: DefenseEvent[] = [{ type: 'tier', tier: c.to, up: c.to > c.from }];
    if (c.to > c.from) for (const id of this.response.onTier(c.to)) ev.push(...this.deployed(id, 'heat'));
    return ev;
  }

  private deployed(id: DeterrentId, cause: 'heat' | 'learned'): DefenseEvent[] {
    if (id === 'lines') {
      this.install.lines = 0;
      this.zones.lines.reset();
    } else if (id === 'nets') {
      this.install.nets = 0;
      this.zones.nets.reset();
    } else if (id === 'warden' && !this.warden) {
      this.warden = newWarden(WARDEN_SPAWN.x, WARDEN_SPAWN.z);
    }
    return [{ type: 'deployed', id, cause }];
  }

  private bypass(id: DeterrentId, ev: DefenseEvent[]): void {
    const r = this.response.onBypass(id);
    if (r.learnedNow) ev.push({ type: 'learned', id });
    if (r.deployed) ev.push(...this.deployed(r.deployed, 'learned'));
  }

  // ---------- one sim step ----------
  update(dt: number, gull: FlightState, noises: readonly Noise[], touristSees: boolean): DefenseEvent[] {
    const ev: DefenseEvent[] = this.pending.splice(0);
    const info: GullInfo = { x: gull.x, y: gull.y, z: gull.z, diving: gull.mode === 'dive' };
    this.hitCd = Math.max(0, this.hitCd - dt);
    this.hawkT = Math.max(0, this.hawkT - dt);
    this.hawkCd = Math.max(0, this.hawkCd - dt);
    const d = tuning.deter;
    if (this.response.deployed.has('lines')) this.install.lines = Math.min(1, this.install.lines + dt / d.installTime.value);
    if (this.response.deployed.has('nets')) this.install.nets = Math.min(1, this.install.nets + dt / d.installTime.value);

    // vendors
    const alert = this.heat.tier >= 1;
    if (this.response.deployed.has('vendors')) {
      for (const v of this.vendors) {
        for (const e of stepVendor(v, info, alert, dt, this.world)) {
          if (e.type === 'noticed') ev.push({ type: 'noticed', who: 'vendor' });
          else if (e.type === 'spray') {
            ev.push({ type: 'spray' });
            this.spawnSpray(v);
            if (e.hit) ev.push({ type: 'hit', hit: { kind: 'spray', dx: e.dx, dz: e.dz, strength: this.response.strength('vendors') } });
          } else this.bypass('vendors', ev);
        }
      }
    }

    // the Warden
    const w = this.warden;
    if (w) {
      const ctx = { world: this.world, walkable: this.walkable, patrol: WARDEN_PATROL, rng: this.rng };
      for (const e of stepWarden(w, info, noises, dt, ctx)) {
        if (e.type === 'noticed') ev.push({ type: 'noticed', who: 'warden' });
        else if (e.type === 'swat' && e.hit) ev.push({ type: 'hit', hit: { kind: 'swat', dx: e.dx, dz: e.dz, strength: this.response.strength('warden') } });
        else if (e.type === 'dodged') this.bypass('warden', ev);
      }
      // keep him out of walls and off the water
      const p = { x: w.x, y: 0.9, z: w.z };
      this.world.collide(p, 0.42);
      w.x = p.x;
      w.z = p.z;
    }

    // scare lines and nets (harmless until put up)
    if (this.install.lines >= 1 && this.response.deployed.has('lines')) {
      if (this.hitCd <= 0) {
        for (const s of LINES) {
          const h = segmentHit(gull, GULL_R + 0.05, s);
          if (h) {
            ev.push({ type: 'hit', hit: { kind: 'line', dx: h.dx, dz: h.dz, strength: this.response.strength('lines') } });
            this.zones.lines.markHit();
            this.hitCd = 1.2;
            break;
          }
        }
      }
      if (this.zones.lines.update(gull.x, gull.y, gull.z) === 'bypass') this.bypass('lines', ev);
    }
    if (this.install.nets >= 1 && this.response.deployed.has('nets')) {
      const inFootprint = gull.x >= STALL_ZONE.minX && gull.x <= STALL_ZONE.maxX && gull.z >= STALL_ZONE.minZ && gull.z <= STALL_ZONE.maxZ;
      if (inFootprint && this.hitCd <= 0 && gull.y + GULL_R >= NET_Y && gull.y - GULL_R <= NET_Y + 0.6) {
        ev.push({ type: 'hit', hit: { kind: 'net', dx: 0, dz: 0, strength: this.response.strength('nets') } });
        this.zones.nets.markHit();
        this.hitCd = 1.2;
      }
      if (this.zones.nets.update(gull.x, gull.y, gull.z) === 'bypass') this.bypass('nets', ev);
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
      f.life = 0.45;
      f.mesh.position.set(v.x + dirx * 0.8, 1.3, v.z + dirz * 0.8);
      f.vel.set(dirx * 9 + (Math.random() - 0.5) * 2, (Math.random() - 0.3) * 1.5, dirz * 9 + (Math.random() - 0.5) * 2);
      f.mesh.visible = true;
      if (++n >= 12) break;
    }
  }

  // ---------- hawk-eye hint ----------
  activateHawk(): boolean {
    if (this.hawkCd > 0 || this.hawkT > 0) return false;
    this.hawkT = tuning.deter.hawkTime.value;
    this.hawkCd = tuning.deter.hawkCooldown.value + tuning.deter.hawkTime.value;
    return true;
  }

  get hawkActive(): boolean {
    return this.hawkT > 0;
  }

  get hawkReady(): number {
    return this.hawkCd > 0 ? 1 - this.hawkCd / (tuning.deter.hawkCooldown.value + tuning.deter.hawkTime.value) : 1;
  }

  // ---------- poop hooks (composed with the tourists in main) ----------
  poopSpheres(): HitSphere[] {
    this.owners = [];
    const out: HitSphere[] = [];
    if (this.response.deployed.has('vendors')) {
      for (const v of this.vendors) {
        out.push({ x: v.x, y: 1.0, z: v.z, r: 0.5 }, { x: v.x, y: 1.75, z: v.z, r: 0.3 });
        this.owners.push({ kind: 'vendor', v }, { kind: 'vendor', v });
      }
    }
    const w = this.warden;
    if (w) {
      // listed first so a poop falling from above meets the umbrella before his head
      if (umbrellaUp(w)) {
        out.push({ x: w.x, y: 2.45, z: w.z, r: 0.95 });
        this.owners.push({ kind: 'umbrella' });
      }
      out.push({ x: w.x, y: 1.0, z: w.z, r: 0.5 }, { x: w.x, y: 1.75, z: w.z, r: 0.3 });
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
        mode: v.mode === 'idle' ? 'idle' : v.mode === 'alert' ? 'notice' : v.mode === 'windup' ? 'shield' : 'recover',
        hand: v.mode === 'windup' ? { x: v.x - Math.sin(v.heading) * 0.9, y: 1.45, z: v.z - Math.cos(v.heading) * 0.9 } : undefined,
      };
      m.applyView(view, time);
    });

    const w = this.warden;
    this.wardenModel.root.visible = !!w;
    if (w) {
      this.wardenModel.applyView(
        {
          x: w.x, z: w.z, heading: w.heading, moving: w.moving, walkPhase: w.walkPhase, t: w.t, holding: false, distracted: w.distractT > 0,
          mode: w.mode === 'patrol' ? (w.moving ? 'walk' : 'idle') : w.mode === 'alert' ? 'notice' : w.mode === 'hunt' ? 'walk' : w.mode === 'swat' ? 'shield' : 'recover',
          hand: w.mode === 'swat' ? { x: w.x - Math.sin(w.heading) * 1.4, y: 1.8, z: w.z - Math.cos(w.heading) * 1.4 } : undefined,
        },
        time,
      );
      this.wardenModel.setUmbrella(umbrellaUp(w));
    }

    const hawk = this.hawkT > 0;
    const lines = this.response.deployed.has('lines');
    const lf = this.install.lines;
    for (const m of this.lineMeshes) {
      m.visible = lines;
      if (!m.userData.post) m.scale.set(hawk ? 3 : 1, lf, hawk ? 3 : 1); // grows into place while being installed
    }
    this.lineMat.color.setHex(hawk ? HAWK_COLOR : LINE_COLOR);
    // the lines glint now and then (a subtle hint even without hawk-eye)
    this.lineMat.opacity = hawk ? 1 : 0.42 + 0.2 * Math.max(0, Math.sin(time * 2.1 + 1)) ** 6;

    const nets = this.response.deployed.has('nets');
    this.netGroup.visible = nets;
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
    this.zones.lines.reset();
    this.zones.nets.reset();
    this.pending.length = 0;
    this.hitCd = 0;
    this.hawkT = 0;
    this.hawkCd = 0;
    this.rng = createRng(this.seed);
  }
}

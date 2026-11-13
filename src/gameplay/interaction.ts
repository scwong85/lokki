import * as THREE from 'three';
import { tuning } from '../core/tuning';
import type { FlightState } from '../gull/flight';
import { pickGrabTarget, type GrabCandidate } from './grab';
import { spawnPoopAssisted, stepPoop, predictPoop, type HitSphere, type PoopState, type PoopHit } from './poop';
import { PropManager, type Prop } from './props';
import type { PhysicsWorld } from '../physics/physics';
import type { World } from '../world/collision';
import { DecalPool } from '../render/decals';
import { Debris } from '../render/debris';

/** What the NPC system offers the interaction layer. */
export interface NpcHooks {
  snatchCandidates(beak: { x: number; y: number; z: number }): GrabCandidate[];
  blockedHint(beak: { x: number; y: number; z: number }): string | null;
  onSnatched(propId: number): void;
  poopSpheres(): HitSphere[];
  onPooped(index: number): void;
}

export interface InteractionInput {
  grab: boolean; // E: grab / drop
  toss: boolean; // Q
  poop: boolean; // F / click
}

export type GagEvent =
  | { type: 'grab'; prop: Prop }
  | { type: 'snatch'; prop: Prop }
  | { type: 'poopNpc' }
  | { type: 'drop'; prop: Prop }
  | { type: 'toss'; prop: Prop }
  | { type: 'heavy'; prop: Prop }
  | { type: 'poopDrop' }
  | { type: 'splat'; x: number; z: number }
  | { type: 'poopProp'; prop: Prop }
  | { type: 'break'; prop: Prop }
  | { type: 'clatter'; prop: Prop; speed: number; quiet: boolean }
  | { type: 'tipped'; prop: Prop };

interface LivePoop {
  state: PoopState;
  mesh: THREE.Mesh;
}

const poopGeo = new THREE.SphereGeometry(0.14, 8, 6);
const poopMat = new THREE.MeshLambertMaterial({ color: 0xfbfaf4, flatShading: true });
const blobGeo = new THREE.SphereGeometry(0.09, 7, 5);

/** Grab / carry / drop / toss, poop, decals and prop gags. Runs inside the fixed sim step. */
export class Interaction {
  readonly props: PropManager;
  readonly decals = new DecalPool();
  readonly debris = new Debris();
  readonly group = new THREE.Group();
  carried: Prop | null = null;
  poopCd = 0;
  private grabCd = 0;
  private poops: LivePoop[] = [];

  npcs: NpcHooks | null = null;
  /** Ring around the prop E would grab (so you can see what is in reach). */
  private ring: THREE.Mesh;

  constructor(private phys: PhysicsWorld, private world: World, parent: THREE.Object3D) {
    this.props = new PropManager(phys, this.group);
    this.group.add(this.decals.group, this.debris.group);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide }),
    );
    this.ring.renderOrder = 12;
    this.ring.visible = false;
    this.group.add(this.ring);
    parent.add(this.group);
  }

  get carriedMass(): number {
    return this.carried?.def.mass ?? 0;
  }

  /** Where the beak holds things. */
  beakPos(s: FlightState): { x: number; y: number; z: number } {
    return { x: s.x - Math.sin(s.heading) * 0.85, y: s.y + 0.05, z: s.z - Math.cos(s.heading) * 0.85 };
  }

  private takeInBeak(p: Prop, ev: GagEvent[]): void {
    const fromNpc = p.heldBy !== null;
    if (fromNpc) this.npcs?.onSnatched(p.id);
    this.props.grab(p);
    this.carried = p;
    this.grabCd = tuning.interaction.grabCooldown.value;
    ev.push({ type: 'grab', prop: p });
    if (fromNpc) ev.push({ type: 'snatch', prop: p });
  }

  /** What the beak would take right now (props on the ground and ice creams in reach), with the same rules for the prompt and for E. */
  private pick(s: FlightState): { prop: Prop; tooHeavy: boolean } | null {
    const it = tuning.interaction;
    const beak = this.beakPos(s);
    const cands = [...this.props.candidates(), ...(this.npcs?.snatchCandidates(beak) ?? [])];
    const pick = pickGrabTarget(beak, s.heading, cands, it.grabRange.value, it.grabConeDeg.value, it.carryMax.value, it.closeRange.value, { x: s.x, y: s.y, z: s.z });
    if (!pick) return null;
    const prop = this.props.byId(pick.id);
    return prop ? { prop, tooHeavy: pick.tooHeavy } : null;
  }

  /** Text for the on-screen prompt: what E would do right now. */
  grabPrompt(s: FlightState): string {
    if (this.carried) return `E drop · Q toss ${this.carried.def.name}`;
    const pick = this.pick(s);
    if (!pick) return this.npcs?.blockedHint(this.beakPos(s)) ?? '';
    return pick.tooHeavy ? `${pick.prop.def.name}: too heavy` : `E grab ${pick.prop.def.name}`;
  }

  /** Landing spot of a poop dropped right now (aim reticle). */
  poopPrediction(s: FlightState, time: number): PoopHit | null {
    const { spheres: ps } = this.props.hitSpheres();
    const npcSpheres = this.npcs?.poopSpheres() ?? [];
    const spheres = [...ps, ...npcSpheres];
    return predictPoop({ x: s.x, y: s.y, z: s.z }, { x: s.vx, y: s.vy, z: s.vz }, time, this.world, spheres, npcSpheres.filter((n) => n.tag !== 'umbrella'));
  }

  update(s: FlightState, inp: InteractionInput, dt: number, time: number): GagEvent[] {
    const ev: GagEvent[] = [];
    const it = tuning.interaction;
    this.grabCd = Math.max(0, this.grabCd - dt);
    this.poopCd = Math.max(0, this.poopCd - dt);
    const stunned = s.stunT > 0;
    const forward = { x: -Math.sin(s.heading), z: -Math.cos(s.heading) };

    // ---- grab / drop / toss ----
    if (!stunned && this.grabCd <= 0) {
      if (inp.grab) {
        if (this.carried) {
          const p = this.carried;
          this.props.release(p, { x: s.vx * 0.6 + forward.x, y: s.vy * 0.6, z: s.vz * 0.6 + forward.z });
          this.carried = null;
          this.grabCd = it.grabCooldown.value;
          ev.push({ type: 'drop', prop: p });
        } else {
          const pick = this.pick(s);
          if (pick) {
            if (pick.tooHeavy) ev.push({ type: 'heavy', prop: pick.prop });
            else this.takeInBeak(pick.prop, ev);
          }
        }
      } else if (!this.carried && s.mode === 'dive') {
        // diving at a held ice cream snatches it without pressing anything
        const hit = this.npcs?.snatchCandidates(this.beakPos(s))[0];
        if (hit) this.takeInBeak(this.props.byId(hit.id)!, ev);
      } else if (inp.toss && this.carried) {
        const p = this.carried;
        this.props.release(p, {
          x: s.vx * 0.5 + forward.x * it.tossSpeed.value,
          y: s.vy * 0.5 + it.tossUp.value,
          z: s.vz * 0.5 + forward.z * it.tossSpeed.value,
        });
        this.carried = null;
        this.grabCd = it.grabCooldown.value;
        ev.push({ type: 'toss', prop: p });
      }
    }
    if (this.carried) this.props.setCarryTarget(this.carried, this.beakPos(s), s.heading);

    // ---- poop ----
    if (inp.poop && !stunned && this.poopCd <= 0) {
      this.poopCd = tuning.poop.cooldown.value;
      const { spheres: pSpheres } = this.props.hitSpheres();
      const nSpheres = this.npcs?.poopSpheres() ?? [];
      const state = spawnPoopAssisted({ x: s.x, y: s.y, z: s.z }, { x: s.vx, y: s.vy, z: s.vz }, time, this.world, [...pSpheres, ...nSpheres], nSpheres.filter((n) => n.tag !== 'umbrella'));
      const mesh = new THREE.Mesh(poopGeo, poopMat);
      mesh.position.set(state.x, state.y, state.z);
      this.group.add(mesh);
      this.poops.push({ state, mesh });
      ev.push({ type: 'poopDrop' });
    }
    const { spheres: propSpheres, props } = this.props.hitSpheres();
    const npcSpheres = this.npcs?.poopSpheres() ?? [];
    const spheres = [...propSpheres, ...npcSpheres];
    for (let i = this.poops.length - 1; i >= 0; i--) {
      const lp = this.poops[i];
      const hit = stepPoop(lp.state, dt, time, this.world, spheres);
      lp.mesh.position.set(lp.state.x, lp.state.y, lp.state.z);
      if (!hit) continue;
      this.group.remove(lp.mesh);
      this.poops.splice(i, 1);
      if (hit.prop !== null && hit.prop >= propSpheres.length) {
        this.npcs?.onPooped(hit.prop - propSpheres.length);
        this.decals.add({ x: hit.x, y: 0, z: hit.z }, { x: 0, y: 1, z: 0 }, 0.5);
        ev.push({ type: 'poopNpc' });
      } else if (hit.prop !== null) {
        const p = props[hit.prop];
        p.dirty++;
        const blob = new THREE.Mesh(blobGeo, poopMat);
        blob.userData.blob = true;
        blob.scale.set(1, 0.5, 1);
        blob.position.copy(p.mesh.worldToLocal(new THREE.Vector3(hit.x, hit.y, hit.z)));
        p.mesh.add(blob);
        ev.push({ type: 'poopProp', prop: p });
      } else {
        this.decals.add(hit, { x: hit.nx, y: hit.ny, z: hit.nz });
        ev.push({ type: 'splat', x: hit.x, z: hit.z });
      }
    }

    // ---- physics ----
    this.props.beforeStep(dt);
    this.phys.moveGull(s.x, s.y, s.z);
    this.phys.step();
    for (const e of this.props.afterStep()) {
      if (e.type === 'break') {
        const t = e.prop.body.translation();
        this.debris.burst(t, 0x9bd8b0);
        this.props.destroy(e.prop);
        if (this.carried === e.prop) this.carried = null;
        ev.push({ type: 'break', prop: e.prop });
      } else if (e.type === 'clatter') ev.push({ type: 'clatter', prop: e.prop, speed: e.speed, quiet: e.quiet });
      else ev.push({ type: 'tipped', prop: e.prop });
    }
    this.debris.update(dt);
    return ev;
  }

  /** Something knocked the item out of the beak (spray, swat, net...). */
  dropCarried(s: FlightState): Prop | null {
    const p = this.carried;
    if (!p) return null;
    this.props.release(p, { x: s.vx * 0.3, y: 2, z: s.vz * 0.3 });
    this.carried = null;
    this.grabCd = 0.5;
    return p;
  }

  /** Put every prop back and wipe the splats (R). */
  reset(): void {
    if (this.carried) this.carried = null;
    for (const p of this.props.props) this.props.reset(p);
    this.decals.clear();
    for (const lp of this.poops) this.group.remove(lp.mesh);
    this.poops = [];
  }

  render(alpha: number, s?: FlightState, time = 0, faceCamera?: THREE.Quaternion): void {
    this.props.syncVisuals(alpha);
    const pick = s && !this.carried && s.stunT === 0 ? this.pick(s) : null;
    this.ring.visible = !!pick && !pick.tooHeavy && pick.prop.heldBy === null;
    if (this.ring.visible && pick) {
      const t = pick.prop.mesh.position;
      this.ring.position.set(t.x, t.y + 0.05, t.z);
      if (faceCamera) this.ring.quaternion.copy(faceCamera);
      this.ring.scale.setScalar(Math.max(0.6, pick.prop.def.radius * 2.2) * (1 + Math.sin(time * 7) * 0.1));
    }
  }
}


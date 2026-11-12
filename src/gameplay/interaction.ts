import * as THREE from 'three';
import { tuning } from '../core/tuning';
import type { FlightState } from '../gull/flight';
import { pickGrabTarget } from './grab';
import { spawnPoop, stepPoop, predictPoop, type PoopState, type PoopHit } from './poop';
import { PropManager, type Prop } from './props';
import type { PhysicsWorld } from '../physics/physics';
import type { World } from '../world/collision';
import { DecalPool } from '../render/decals';
import { Debris } from '../render/debris';

export interface InteractionInput {
  grab: boolean; // E: grab / drop
  toss: boolean; // Q
  poop: boolean; // F / click
}

export type GagEvent =
  | { type: 'grab'; prop: Prop }
  | { type: 'drop'; prop: Prop }
  | { type: 'toss'; prop: Prop }
  | { type: 'heavy'; prop: Prop }
  | { type: 'poopDrop' }
  | { type: 'splat' }
  | { type: 'poopProp'; prop: Prop }
  | { type: 'break'; prop: Prop }
  | { type: 'clatter'; prop: Prop; speed: number }
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

  constructor(private phys: PhysicsWorld, private world: World, parent: THREE.Object3D) {
    this.props = new PropManager(phys, this.group);
    this.group.add(this.decals.group, this.debris.group);
    parent.add(this.group);
  }

  get carriedMass(): number {
    return this.carried?.def.mass ?? 0;
  }

  /** Where the beak holds things. */
  beakPos(s: FlightState): { x: number; y: number; z: number } {
    return { x: s.x - Math.sin(s.heading) * 0.85, y: s.y + 0.05, z: s.z - Math.cos(s.heading) * 0.85 };
  }

  /** Text for the on-screen prompt: what E would do right now. */
  grabPrompt(s: FlightState): string {
    if (this.carried) return `E drop · Q toss ${this.carried.def.name}`;
    const it = tuning.interaction;
    const pick = pickGrabTarget(this.beakPos(s), s.heading, this.props.candidates(), it.grabRange.value, it.grabConeDeg.value, it.carryMax.value);
    if (!pick) return '';
    const p = this.props.byId(pick.id)!;
    return pick.tooHeavy ? `${p.def.name}: too heavy` : `E grab ${p.def.name}`;
  }

  /** Landing spot of a poop dropped right now (aim reticle). */
  poopPrediction(s: FlightState, time: number): PoopHit | null {
    const { spheres } = this.props.hitSpheres();
    return predictPoop({ x: s.x, y: s.y, z: s.z }, { x: s.vx, y: s.vy, z: s.vz }, time, this.world, spheres);
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
          const pick = pickGrabTarget(this.beakPos(s), s.heading, this.props.candidates(), it.grabRange.value, it.grabConeDeg.value, it.carryMax.value);
          if (pick) {
            const p = this.props.byId(pick.id)!;
            if (pick.tooHeavy) ev.push({ type: 'heavy', prop: p });
            else {
              this.props.grab(p);
              this.carried = p;
              this.grabCd = it.grabCooldown.value;
              ev.push({ type: 'grab', prop: p });
            }
          }
        }
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
      const state = spawnPoop({ x: s.x, y: s.y, z: s.z }, { x: s.vx, y: s.vy, z: s.vz });
      const mesh = new THREE.Mesh(poopGeo, poopMat);
      mesh.position.set(state.x, state.y, state.z);
      this.group.add(mesh);
      this.poops.push({ state, mesh });
      ev.push({ type: 'poopDrop' });
    }
    const { spheres, props } = this.props.hitSpheres();
    for (let i = this.poops.length - 1; i >= 0; i--) {
      const lp = this.poops[i];
      const hit = stepPoop(lp.state, dt, time, this.world, spheres);
      lp.mesh.position.set(lp.state.x, lp.state.y, lp.state.z);
      if (!hit) continue;
      this.group.remove(lp.mesh);
      this.poops.splice(i, 1);
      if (hit.prop !== null) {
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
        ev.push({ type: 'splat' });
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
      } else if (e.type === 'clatter') ev.push({ type: 'clatter', prop: e.prop, speed: e.speed });
      else ev.push({ type: 'tipped', prop: e.prop });
    }
    this.debris.update(dt);
    return ev;
  }

  /** Put every prop back and wipe the splats (R). */
  reset(): void {
    if (this.carried) this.carried = null;
    for (const p of this.props.props) this.props.reset(p);
    this.decals.clear();
    for (const lp of this.poops) this.group.remove(lp.mesh);
    this.poops = [];
  }

  render(alpha: number): void {
    this.props.syncVisuals(alpha);
  }
}


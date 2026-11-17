import type { PropSnap } from '../net/snapshot';
import * as THREE from 'three';
import { floatVy, halfHeight, waterDrag } from './buoyancy';
import type { Collider, RigidBody } from '@dimforge/rapier3d-compat';
import { PROPS, classifyImpact, type PropDef, type PropType, type Shape } from '../data/props';
import { GROUPS, type PhysicsWorld } from '../physics/physics';
import { createPropMesh } from '../world/propMeshes';
import { tuning } from '../core/tuning';
import type { GrabCandidate } from './grab';
import type { HitSphere } from './poop';

export interface PropSpawn {
  type: PropType;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  /** Marks a special prop for quests ('statueCap', 'stallBun'). */
  tag?: string;
}

export interface Prop {
  id: number;
  type: PropType;
  /** Quest tag from its spawn. */
  tag?: string;
  def: PropDef;
  spawn: PropSpawn;
  body: RigidBody;
  collider: Collider;
  mesh: THREE.Group;
  carried: boolean;
  /** Id of the NPC holding it (kinematic, follows the hand). */
  heldBy: number | null;
  /** Snatched from an NPC. */
  stolen: boolean;
  /** Knocked out of the beak by a spray, swat or net: shown with a marker until picked up again. */
  lost: boolean;
  broken: boolean;
  dirty: number;
  tipped: boolean;
  impactCd: number;
  ignoreGrab: number;
  prev: { p: THREE.Vector3; q: THREE.Quaternion };
  cur: { p: THREE.Vector3; q: THREE.Quaternion };
  lastVel: THREE.Vector3;
}

export type PropEvent =
  | { type: 'break'; prop: Prop; speed: number }
  | { type: 'clatter'; prop: Prop; speed: number; quiet: boolean }
  | { type: 'tipped'; prop: Prop };

const yawQuat = (a: number) => ({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) });

function colliderFor(R: PhysicsWorld['R'], s: Shape, mass: number) {
  const d =
    s.kind === 'ball' ? R.ColliderDesc.ball(s.r)
    : s.kind === 'box' ? R.ColliderDesc.cuboid(s.hx, s.hy, s.hz)
    : s.kind === 'cyl' ? R.ColliderDesc.cylinder(s.hh, s.r)
    : R.ColliderDesc.capsule(s.hh, s.r);
  return d.setMass(mass).setFriction(tuning.physics.friction.value).setRestitution(tuning.physics.restitution.value).setCollisionGroups(GROUPS.PROP);
}

const tmpQ = new THREE.Quaternion();
const rockQ = new THREE.Quaternion();
const rockE = new THREE.Euler();

/** Owns every prop: Rapier bodies, meshes, carry state and impact detection. */
export class PropManager {
  readonly props: Prop[] = [];
  private nextId = 1;

  /** Is there sea under this spot? (set by the game; without it nothing floats) */
  isWater: ((x: number, z: number) => boolean) | null = null;
  /** A current that carries message bottles (tag 'note') toward this spot while they float. */
  drift: { x: number; z: number } | null = null;
  private time = 0;

  constructor(private phys: PhysicsWorld, private parent: THREE.Object3D) {}

  spawn(sp: PropSpawn): Prop {
    const R = this.phys.R;
    const def = PROPS[sp.type];
    const body = this.phys.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(sp.x, sp.y, sp.z)
        .setRotation(yawQuat(sp.rotY ?? 0))
        .setLinearDamping(def.floats ? 2 : 0.05)
        .setAngularDamping(0.3)
        .setGravityScale(def.floats ? 0.03 : 1)
        .setCcdEnabled(def.mass < 1),
    );
    const collider = this.phys.world.createCollider(colliderFor(R, def.shape, def.mass), body);
    const mesh = createPropMesh(sp.type);
    mesh.position.set(sp.x, sp.y, sp.z);
    // only the bigger props cast shadow-map shadows (each caster is another draw call in the shadow pass)
    const bigProp = def.mass >= 1;
    mesh.traverse((c) => {
      c.castShadow = bigProp;
      c.receiveShadow = true;
    });
    this.parent.add(mesh);
    const prop: Prop = {
      id: this.nextId++, type: sp.type, tag: sp.tag, def, spawn: sp, body, collider, mesh,
      carried: false, heldBy: null, stolen: false, lost: false, broken: false, dirty: 0, tipped: false, impactCd: 0.3, ignoreGrab: 0,
      prev: { p: new THREE.Vector3(sp.x, sp.y, sp.z), q: new THREE.Quaternion() },
      cur: { p: new THREE.Vector3(sp.x, sp.y, sp.z), q: new THREE.Quaternion() },
      lastVel: new THREE.Vector3(),
    };
    this.props.push(prop);
    return prop;
  }

  /** Remove every prop (loading another level). */
  clearAll(): void {
    for (const p of this.props) {
      this.parent.remove(p.mesh);
      if (!p.broken) this.phys.world.removeRigidBody(p.body);
    }
    this.props.length = 0;
    this.nextId = 1;
  }

  byId(id: number): Prop | undefined {
    return this.props.find((p) => p.id === id);
  }

  /** Props that can be grabbed or shoved: alive and not in the beak. */
  free(): Prop[] {
    return this.props.filter((p) => !p.broken && !p.carried && p.heldBy === null);
  }

  candidates(): GrabCandidate[] {
    return this.free().filter((p) => p.ignoreGrab <= 0).map((p) => {
      const t = p.body.translation();
      return { id: p.id, x: t.x, y: t.y, z: t.z, mass: p.def.mass, r: p.def.radius };
    });
  }

  hitSpheres(): { spheres: HitSphere[]; props: Prop[] } {
    const props = this.free();
    return {
      props,
      spheres: props.map((p) => {
        const t = p.body.translation();
        return { x: t.x, y: t.y, z: t.z, r: p.def.radius };
      }),
    };
  }

  // ---- carrying ----
  /** An NPC takes the prop in hand: kinematic, no collisions, follows the hand. */
  attach(p: Prop, npcId: number): void {
    p.heldBy = npcId;
    p.body.setBodyType(this.phys.R.RigidBodyType.KinematicPositionBased, true);
    p.collider.setCollisionGroups(GROUPS.CARRIED);
  }

  setHoldTarget(p: Prop, at: { x: number; y: number; z: number }): void {
    p.body.setNextKinematicTranslation(at);
  }

  grab(p: Prop): void {
    if (p.heldBy !== null) p.stolen = true;
    p.lost = false;
    p.heldBy = null;
    p.carried = true;
    p.body.setBodyType(this.phys.R.RigidBodyType.KinematicPositionBased, true);
    p.collider.setCollisionGroups(GROUPS.CARRIED);
    p.tipped = false;
  }

  /** Something falls out of a person's hand (a slip, full hands): it is theirs no more, and not stolen either. */
  drop(p: Prop, vel: { x: number; y: number; z: number }): void {
    p.heldBy = null;
    this.release(p, vel);
  }

  release(p: Prop, vel: { x: number; y: number; z: number }): void {
    p.carried = false;
    p.ignoreGrab = 0.6;
    p.impactCd = 0.4;
    p.body.setBodyType(this.phys.R.RigidBodyType.Dynamic, true);
    p.collider.setCollisionGroups(GROUPS.PROP);
    p.body.setLinvel(vel, true);
    p.body.setAngvel({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 6 }, true);
  }

  setCarryTarget(p: Prop, at: { x: number; y: number; z: number }, heading: number): void {
    p.body.setNextKinematicTranslation(at);
    p.body.setNextKinematicRotation(yawQuat(heading));
  }

  // ---- stepping ----
  /** Call right before the physics step: remembers poses for render interpolation. */
  beforeStep(dt: number): void {
    this.time += dt;
    const w = tuning.water;
    for (const p of this.props) {
      p.prev.p.copy(p.cur.p);
      p.prev.q.copy(p.cur.q);
      p.impactCd = Math.max(0, p.impactCd - dt);
      p.ignoreGrab = Math.max(0, p.ignoreGrab - dt);
      // things in the sea float and bob instead of lying on the sea floor out of sight
      if (!this.isWater || p.broken || p.carried || p.heldBy !== null) continue;
      const t = p.body.translation();
      if (t.y > 1.2 || !this.isWater(t.x, t.z)) continue;
      const floatY = w.floatHeight.value + halfHeight(p.def.shape) * 0.5 + Math.sin(this.time * w.bobSpeed.value + p.id) * w.bobHeight.value;
      const v = p.body.linvel();
      const k = waterDrag(w.drag.value, dt);
      let vx = v.x * k, vz = v.z * k;
      if (this.drift && p.tag === 'note') {
        const dx = this.drift.x - t.x, dz = this.drift.z - t.z, dl = Math.hypot(dx, dz);
        if (dl > 1.5) {
          vx += (dx / dl) * w.driftSpeed.value * (1 - k); // settles at driftSpeed
          vz += (dz / dl) * w.driftSpeed.value * (1 - k);
        }
      }
      p.body.setLinvel({ x: vx, y: floatVy(t.y, v.y, floatY, tuning.physics.gravity.value, w.buoyancy.value, w.drag.value, dt), z: vz }, true);
      const av = p.body.angvel();
      p.body.setAngvel({ x: av.x * k, y: av.y * k, z: av.z * k }, true);
    }
  }

  /** Call right after the physics step: read poses, detect impacts / tipping / strays. */
  afterStep(): PropEvent[] {
    const ev: PropEvent[] = [];
    const { breakSpeed, noiseSpeed, thumpSpeed } = tuning.physics;
    for (const p of this.props) {
      if (p.broken) continue;
      const t = p.body.translation();
      const r = p.body.rotation();
      p.cur.p.set(t.x, t.y, t.z);
      p.cur.q.set(r.x, r.y, r.z, r.w);
      if (p.carried || p.heldBy !== null) {
        p.lastVel.set(0, 0, 0);
        continue;
      }
      if (t.y < -20 || Math.abs(t.x) > 700 || Math.abs(t.z) > 700) {
        this.reset(p);
        continue;
      }
      const v = p.body.linvel();
      const dv = Math.hypot(v.x - p.lastVel.x, v.y - p.lastVel.y, v.z - p.lastVel.z);
      p.lastVel.set(v.x, v.y, v.z);
      if (p.impactCd <= 0) {
        const res = classifyImpact(p.type, dv, breakSpeed.value, noiseSpeed.value, thumpSpeed.value);
        if (res === 'break') ev.push({ type: 'break', prop: p, speed: dv });
        else if (res === 'noise' || res === 'thump') {
          p.impactCd = 0.25;
          ev.push({ type: 'clatter', prop: p, speed: dv, quiet: res === 'thump' });
        }
      }
      // tipped over (bins, chairs...): up vector of the body points sideways or down
      const upY = 1 - 2 * (r.x * r.x + r.z * r.z);
      if (p.def.tags.includes('container') || p.def.tags.includes('stackable')) {
        if (!p.tipped && upY < 0.5) {
          p.tipped = true;
          ev.push({ type: 'tipped', prop: p });
        } else if (p.tipped && upY > 0.9) p.tipped = false;
      }
    }
    return ev;
  }

  /** Remove a prop's body and mesh (shattered). */
  destroy(p: Prop): void {
    p.broken = true;
    p.mesh.visible = false;
    this.phys.world.removeRigidBody(p.body);
  }

  /** Put a prop back at its spawn point (also revives broken ones). */
  reset(p: Prop): void {
    const sp = p.spawn;
    if (p.broken) {
      // recreate the body
      const R = this.phys.R;
      p.body = this.phys.world.createRigidBody(
        R.RigidBodyDesc.dynamic().setTranslation(sp.x, sp.y, sp.z).setRotation(yawQuat(sp.rotY ?? 0)).setLinearDamping(0.05).setAngularDamping(0.3).setCcdEnabled(p.def.mass < 1),
      );
      p.collider = this.phys.world.createCollider(colliderFor(R, p.def.shape, p.def.mass), p.body);
      p.broken = false;
      p.mesh.visible = true;
    } else {
      if (p.carried) this.release(p, { x: 0, y: 0, z: 0 });
      p.body.setTranslation({ x: sp.x, y: sp.y, z: sp.z }, true);
      p.body.setRotation(yawQuat(sp.rotY ?? 0), true);
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      p.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    p.carried = false;
    p.heldBy = null;
    p.stolen = false;
    p.lost = false;
    p.tipped = false;
    p.impactCd = 0.5;
    p.cur.p.set(sp.x, sp.y, sp.z);
    p.prev.p.copy(p.cur.p);
    p.cur.q.set(0, 0, 0, 1);
    p.prev.q.copy(p.cur.q);
    for (const c of [...p.mesh.children]) if (c.userData.blob) p.mesh.remove(c);
    p.dirty = 0;
  }

  /** Where the host says each prop is (a guest does not simulate props). */
  private remote = new Map<number, PropSnap>();

  setRemote(list: readonly PropSnap[]): void {
    for (const s of list) {
      this.remote.set(s.id, s);
      const p = this.byId(s.id);
      if (!p) continue;
      p.carried = s.by !== null;
      p.heldBy = s.held;
      if (s.broken && !p.broken) {
        p.broken = true;
        p.mesh.visible = false;
      } else if (!s.broken && p.broken) {
        p.broken = false;
        p.mesh.visible = true;
      }
    }
  }

  /** One sim step on a guest: ease every prop towards the host's news. */
  stepRemote(dt: number): void {
    const k = 1 - Math.exp(-18 * dt);
    for (const p of this.props) {
      const s = this.remote.get(p.id);
      if (!s || p.broken) continue;
      p.prev.p.copy(p.cur.p);
      p.prev.q.copy(p.cur.q);
      p.cur.p.set(p.cur.p.x + (s.p[0] - p.cur.p.x) * k, p.cur.p.y + (s.p[1] - p.cur.p.y) * k, p.cur.p.z + (s.p[2] - p.cur.p.z) * k);
      p.cur.q.slerp(tmpQ.set(s.q[0], s.q[1], s.q[2], s.q[3]), k);
    }
  }

  /** Interpolated mesh poses for rendering. */
  syncVisuals(alpha: number): void {
    for (const p of this.props) {
      if (p.broken) continue;
      p.mesh.position.lerpVectors(p.prev.p, p.cur.p, alpha);
      p.mesh.quaternion.slerpQuaternions(p.prev.q, p.cur.q, alpha);
      // floating on the sea: the mesh rocks gently with the waves (looks only; the body keeps its own pose)
      if (this.isWater && !p.carried && p.heldBy === null && p.cur.p.y < 0.7 && this.isWater(p.cur.p.x, p.cur.p.z)) {
        const w = tuning.water;
        const t = this.time * w.bobSpeed.value * 0.8 + p.id * 1.7;
        rockE.set(Math.sin(t) * w.rock.value, 0, Math.cos(t * 1.3) * w.rock.value * 0.8);
        p.mesh.quaternion.multiply(rockQ.setFromEuler(rockE));
      }
    }
  }
}

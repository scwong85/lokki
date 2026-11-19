import type { Collider, RigidBody, World } from '@dimforge/rapier3d-compat';
import { tuning } from '../core/tuning';

/** The Rapier module (loaded lazily so the first paint is not blocked by the WASM). */
export type Rapier = (typeof import('@dimforge/rapier3d-compat'))['default'];

/** Collision layers: membership << 16 | filter. */
const group = (member: number, filter: number) => ((member << 16) | filter) >>> 0;
export const GROUPS = {
  STATIC: group(0x1, 0x2), // static world only meets props
  PROP: group(0x2, 0x1 | 0x2 | 0x4), // props meet static world, other props and the gull
  GULL: group(0x4, 0x2), // gull body only meets props (its own flight collision handles the world)
  CARRIED: group(0x8, 0x0), // carried props collide with nothing
};

/** Thin wrapper: one Rapier world stepped at the fixed sim rate, plus static city geometry. */
export class PhysicsWorld {
  readonly world: World;
  private gull: RigidBody | null = null;

  constructor(readonly R: Rapier, readonly dt = 1 / 60) {
    this.world = new R.World({ x: 0, y: -tuning.physics.gravity.value, z: 0 });
    this.world.timestep = dt;
    // ground: a big slab whose top face is y = 0
    const ground = R.ColliderDesc.cuboid(5000, 1, 5000).setTranslation(0, -1, 0).setCollisionGroups(GROUPS.STATIC).setFriction(tuning.physics.friction.value);
    this.world.createCollider(ground);
  }

  setGravity(g: number): void {
    this.world.gravity = { x: 0, y: -g, z: 0 };
  }

  /** Static triangle mesh (buildings, landmarks). */
  addStaticMesh(vertices: Float32Array, indices: Uint32Array): Collider {
    const desc = this.R.ColliderDesc.trimesh(vertices, indices).setCollisionGroups(GROUPS.STATIC).setFriction(tuning.physics.friction.value);
    return this.world.createCollider(desc);
  }

  /** A solid box (a table): props rest on it. Remove it with `removeCollider` when the level goes. */
  addStaticBox(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number): Collider {
    const desc = this.R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz).setCollisionGroups(GROUPS.STATIC).setFriction(tuning.physics.friction.value);
    return this.world.createCollider(desc);
  }

  removeCollider(c: Collider): void {
    this.world.removeCollider(c, false);
  }

  /** Kinematic body that follows the gull so dives and shoves push props around. */
  createGullBody(radius: number, x: number, y: number, z: number): RigidBody {
    const body = this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
    this.world.createCollider(this.R.ColliderDesc.ball(radius).setCollisionGroups(GROUPS.GULL), body);
    this.gull = body;
    return body;
  }

  moveGull(x: number, y: number, z: number): void {
    this.gull?.setNextKinematicTranslation({ x, y, z });
  }

  step(): void {
    this.world.step();
  }
}

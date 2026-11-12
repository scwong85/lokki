import * as THREE from 'three';
import { createRng, type Rng } from '../core/rng';
import { BODY_HEIGHT, BODY_RADIUS, handPos, newNpc, snatchable, startle, stepNpc, type GullInfo, type Noise, type Npc, type NpcEvent, type NpcSpawn } from './npc';
import type { GrabCandidate } from './grab';
import type { HitSphere } from './poop';
import type { NpcHooks } from './interaction';
import type { Prop, PropManager } from './props';
import type { World } from '../world/collision';
import type { FlightState } from '../gull/flight';
import { NpcModel } from '../world/npcModel';

const NPC_RADIUS_BODY = 0.5;

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
  /** Each tourist's own ice cream (so reset can hand it back after a snatch). */
  private ice = new Map<number, Prop>();

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
    const model = new NpcModel(sp.color, n.id);
    this.parent.add(model.root);
    this.models.set(n.id, model);
    if (sp.ice) this.giveIceCream(n);
    this.npcs.push(n);
    return n;
  }

  private giveIceCream(n: Npc): void {
    const h = handPos(n);
    const prop = this.props.spawn({ type: 'icecream', x: h.x, y: h.y, z: h.z });
    this.props.attach(prop, n.id);
    n.holding = prop.id;
    this.ice.set(n.id, prop);
  }

  /** A sound the tourists can hear (clatter, crash, tipped bin...). */
  addNoise(x: number, z: number, loud = 1): void {
    this.noises.push({ x, z, loud });
  }

  /** One fixed sim step. Returns brain events (noticed, panic, chase...). */
  update(dt: number, gull: GullInfo): NpcEvent[] {
    const ev: NpcEvent[] = this.pending.splice(0);
    const ctx = { world: this.world, walkable: this.walkable, rng: this.rng };
    for (const n of this.npcs) {
      ev.push(...stepNpc(n, gull, this.noises, dt, ctx));
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
    if (n) this.pending.push(...startle(n, 'snatched'));
  }

  poopSpheres(): HitSphere[] {
    this.owners = [];
    const out: HitSphere[] = [];
    for (const n of this.npcs) {
      out.push({ x: n.x, y: 1.0, z: n.z, r: NPC_RADIUS_BODY }, { x: n.x, y: 1.75, z: n.z, r: 0.3 });
      this.owners.push(n, n);
    }
    return out;
  }

  onPooped(index: number): void {
    const n = this.owners[index];
    if (n) this.pending.push(...startle(n, 'pooped'));
  }

  reset(): void {
    this.rng = createRng(this.seed);
    for (const n of this.npcs) {
      const sp = this.spawns.get(n.id)!;
      const fresh = newNpc(n.id, sp);
      Object.assign(n, fresh);
      const prop = this.ice.get(n.id);
      if (sp.ice && prop) {
        // Interaction.reset() already put the prop back; hand it to its owner again
        this.props.attach(prop, n.id);
        n.holding = prop.id;
        this.props.setHoldTarget(prop, handPos(n));
      }
    }
    this.pending.length = 0;
  }

  render(time: number): void {
    for (const n of this.npcs) this.models.get(n.id)!.apply(n, time);
  }
}


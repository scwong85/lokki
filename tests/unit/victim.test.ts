import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import { newNpc, stepNpc, type NpcCtx, type NpcEvent } from '../../src/gameplay/npc';
import { createRng } from '../../src/core/rng';

const DT = 1 / 60;
const far = { x: 900, y: 20, z: 900, diving: false };
beforeAll(async () => {
  await RAPIER.init();
});

describe('sent somewhere', () => {
  it('somebody who cannot get all the way there (a wall at the shore) still arrives once they stop getting closer', () => {
    const ctx: NpcCtx = { world: new World(), walkable: (x) => x < 10, rng: createRng(4) };
    const n = newNpc(1, { x: 0, z: 0, color: 1 });
    n.goal = { x: 12, z: 0, name: 'ferry' }; // 2 m past the last walkable spot
    const ev: NpcEvent[] = [];
    for (let i = 0; i < 60 * 40 && !ev.some((e) => e.type === 'arrived'); i++) ev.push(...stepNpc(n, far, [], DT, ctx));
    expect(ev.some((e) => e.type === 'arrived' && e.goal === 'ferry')).toBe(true);
    expect(n.goal).toBeNull();
  });
  it('a far-off stuck person does not count as arrived', () => {
    const ctx: NpcCtx = { world: new World(), walkable: (x) => x < 3, rng: createRng(4) };
    const n = newNpc(1, { x: 0, z: 0, color: 1 });
    n.goal = { x: 60, z: 0, name: 'ferry' };
    const ev: NpcEvent[] = [];
    for (let i = 0; i < 60 * 30; i++) ev.push(...stepNpc(n, far, [], DT, ctx));
    expect(ev.some((e) => e.type === 'arrived')).toBe(false);
  });
  it('the map victim is found even if the theft was never recorded (the fallback is whoever held it first)', () => {
    const phys = new PhysicsWorld(RAPIER);
    const group = new THREE.Group();
    const props = new PropManager(phys, group);
    const npcs = new NpcManager(new World(), props, group, () => true, 3);
    const n = npcs.spawn({ x: 0, z: 0, color: 1, holds: 'map' });
    const map = props.props.find((p) => p.type === 'map')!;
    props.release(map, { x: 0, y: 0, z: 0 }); // it left his hand without being snatched (tug, slam, a bump)
    expect(npcs.sendVictimTo(map.id, 30, 0, 'ferry')).toBe(true);
    expect(n.goal?.name).toBe('ferry');
    expect(npcs.sendVictimTo(9999, 30, 0, 'ferry')).toBe(false);
  });
});

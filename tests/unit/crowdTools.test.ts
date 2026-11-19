import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import { TriggerSystem } from '../../src/gameplay/triggers';
import type { NpcEvent, NpcSpawn } from '../../src/gameplay/npc';
import { LEVELS } from '../../src/data/levels';

const DT = 1 / 60;
const far = { x: 900, y: 20, z: 900, diving: false };
beforeAll(async () => {
  await RAPIER.init();
});

function setup(spawns: NpcSpawn[]) {
  const phys = new PhysicsWorld(RAPIER);
  const group = new THREE.Group();
  const props = new PropManager(phys, group);
  const npcs = new NpcManager(new World(), props, group, () => true, 4);
  for (const s of spawns) npcs.spawn(s);
  const run = (secs: number, gull = far): NpcEvent[] => {
    const ev: NpcEvent[] = [];
    for (let i = 0; i < Math.round(secs / DT); i++) {
      props.beforeStep(DT);
      phys.step();
      props.afterStep();
      ev.push(...npcs.update(DT, gull));
    }
    return ev;
  };
  return { npcs, props, run };
}
const at = (x: number, z: number, extra: Partial<NpcSpawn> = {}): NpcSpawn => ({ x, z, heading: 0, color: 1, role: 'bystander', ...extra });

describe('shoo (a honk sends free people away)', () => {
  it('free people walk about ten metres away from the gull; the stationary cast does not', () => {
    const { npcs, run } = setup([at(2, 0), at(-2, 1), at(0, 3, { stationary: true })]);
    run(0.5);
    npcs.honk(0, 0, 20);
    run(12);
    const [a, b, c] = npcs['npcs'];
    expect(Math.hypot(a.x, a.z)).toBeGreaterThan(6.5);
    expect(Math.hypot(b.x, b.z)).toBeGreaterThan(6.5);
    expect(Math.hypot(c.x, c.z - 3)).toBeLessThan(2);
  });
});

describe('crumbs (food draws free people)', () => {
  it('somebody close walks to a bun lying about and eats it; a tagged bun (a puzzle item) is left alone', () => {
    const { npcs, props, run } = setup([at(6, 0)]);
    npcs.crumbs = ['bun'];
    props.spawn({ type: 'bun', x: 0, y: 0.1, z: 0 });
    props.spawn({ type: 'bun', x: 0, y: 0.1, z: 3, tag: 'benchBun' });
    const ev = run(15);
    expect(ev.filter((e) => e.type === 'crumb')).toHaveLength(1);
    expect(props.props.filter((p) => p.type === 'bun' && !p.broken)).toHaveLength(1);
    expect(props.props.find((p) => p.type === 'bun' && !p.broken)!.tag).toBe('benchBun');
    expect(npcs.crumbsEaten).toBe(1);
  });
  it('a trail leads one person after another, and they stay around where they ate', () => {
    const { npcs, props, run } = setup([at(8, 0), at(-8, 0), at(0, 9)]);
    npcs.crumbs = ['bun'];
    for (const [x, z] of [[0, 0], [1, 0.5], [-1, 0.5]]) props.spawn({ type: 'bun', x, y: 0.1, z });
    run(30);
    expect(npcs.crumbsEaten).toBe(3);
    for (const n of npcs['npcs']) expect(Math.hypot(n.homeX, n.homeZ)).toBeLessThan(3);
  });
  it('somebody 15 m away still spots it (and shows it), but not somebody 40 m away', () => {
    const { npcs, props, run } = setup([at(15, 0), at(40, 0)]);
    npcs.crumbs = ['bun'];
    props.spawn({ type: 'bun', x: 0, y: 0.1, z: 0 });
    const ev = run(1.5);
    expect(ev.filter((e) => e.type === 'crumbCall')).toHaveLength(1);
    expect(npcs['npcs'][0].goal?.name).toBe('crumb');
    expect(npcs['npcs'][1].goal).toBeNull();
  });
  it('nothing happens when the level has no crumbs', () => {
    const { npcs, props, run } = setup([at(2, 0)]);
    props.spawn({ type: 'bun', x: 0, y: 0.1, z: 0 });
    run(10);
    expect(npcs.crumbsEaten).toBe(0);
  });
});

describe('the clear-the-zone trigger', () => {
  const zone = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
  const t = () => new TriggerSystem([{ id: 'c', kind: 'npcsClear', event: 'clear', role: '*', zone, min: 3, max: 0 }]);
  const ctx = (npcs: { role: string; x: number; z: number }[]) => ({ props: [], gull: { x: 0, y: 0, z: 0, grounded: true }, carried: null, npcs, isLand: () => true });
  const crowd = [0, 1, 2, 3].map((i) => ({ role: 'x', x: i - 1, z: 0 }));
  it('does not fire for an empty square, fires once it has been full and then emptied', () => {
    const s = t();
    expect(s.update(ctx([]), new Set(['clear']))).toEqual([]);
    expect(s.update(ctx(crowd), new Set(['clear']))).toEqual([]);
    expect(s.update(ctx(crowd.slice(0, 1)), new Set(['clear']))).toEqual([]);
    expect(s.update(ctx([]), new Set(['clear']))).toEqual(['clear']);
  });
  it('any role counts with *, and the showcase levels exist', () => {
    expect(LEVELS.find((l) => l.id === 'shoo')!.extraTriggers![0].kind).toBe('npcsClear');
    expect(LEVELS.find((l) => l.id === 'breadcrumbs')!.crumbs).toEqual(['bun']);
  });
});

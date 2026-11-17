import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import type { NpcEvent, NpcSpawn } from '../../src/gameplay/npc';
import type { FlightState } from '../../src/gull/flight';
import { LEVELS } from '../../src/data/levels';
import { npcPose } from '../../src/gameplay/npcPose';

const DT = 1 / 60;
const far = { x: 500, y: 20, z: 500, diving: false };
beforeAll(async () => {
  await RAPIER.init();
});

function setup(spawns: NpcSpawn[]) {
  const phys = new PhysicsWorld(RAPIER);
  const group = new THREE.Group();
  const props = new PropManager(phys, group);
  const npcs = new NpcManager(new World(), props, group, () => true, 5);
  for (const s of spawns) npcs.spawn(s);
  const run = (secs: number): NpcEvent[] => {
    const ev: NpcEvent[] = [];
    for (let i = 0; i < Math.round(secs / DT); i++) {
      props.beforeStep(DT);
      phys.step();
      props.afterStep();
      ev.push(...npcs.update(DT, far));
    }
    return ev;
  };
  return { npcs, run };
}
const line = (n: number, gap: number): NpcSpawn[] => Array.from({ length: n }, (_, i) => ({ x: i * gap, z: 0, heading: 0, ice: true, role: 'q', stationary: true, color: 0 }));

describe('contagion', () => {
  it('a fright runs down a queue, one person to the next, and counts the cascade', () => {
    const { npcs, run } = setup(line(6, 1.5));
    const ev: NpcEvent[] = [];
    npcs.onPooped(0 as never); // no owners yet: harmless
    // splat the first person directly
    (npcs as unknown as { pending: NpcEvent[] }).pending.push({ type: 'panic', npc: npcs.npcs[0] });
    ev.push(...run(4));
    const spreads = ev.filter((e) => e.type === 'spread') as { count: number }[];
    expect(Math.max(...spreads.map((s) => s.count))).toBeGreaterThanOrEqual(4);
    expect(npcs.npcs[3].infectedT).toBeGreaterThan(0); // it reached the fourth person
    expect(npcs.npcs[1].holding).toBeNull(); // dropped their cone
  });
  it('does not reach people standing far apart', () => {
    const { npcs, run } = setup(line(3, 8));
    (npcs as unknown as { pending: NpcEvent[] }).pending.push({ type: 'panic', npc: npcs.npcs[0] });
    const ev = run(3);
    expect(ev.some((e) => e.type === 'spread')).toBe(false);
  });
});

describe('slam', () => {
  const dive = (x: number, z: number, vz: number): FlightState => ({ x, y: 0.9, z, vx: 0, vy: 0, vz, mode: 'dive' } as unknown as FlightState);
  it('a fast dive knocks a person down, and they knock down the next ones', () => {
    const { npcs, run } = setup(line(6, 1.2));
    const g = dive(0, 3, -20);
    g.z = 0.4;
    expect(npcs.slam(g)).toBe(true);
    expect(Math.abs(g.vz)).toBeLessThan(20); // the gull loses speed
    const ev = run(3);
    const k = ev.filter((e) => e.type === 'knockdown') as { count: number }[];
    expect(Math.max(...k.map((e) => e.count))).toBeGreaterThanOrEqual(4);
    expect(ev.some((e) => e.type === 'slam')).toBe(true);
  });
  it('a slow dive does nothing', () => {
    const { npcs } = setup(line(2, 1.2));
    expect(npcs.slam(dive(0, 0.4, -5))).toBe(false);
  });
});

describe('jukebox', () => {
  it('makes calm people nearby dance, delighted, with open hands', () => {
    const { npcs, run } = setup(line(4, 2));
    const ev = npcs.danceNear(3, 0, 20, 5);
    expect(ev.find((e) => e.type === 'dancing')).toMatchObject({ count: 4 });
    expect(npcs.npcs.every((n) => n.mode === 'dance' && n.mood === 'delighted')).toBe(true);
    run(6);
    expect(npcs.npcs.every((n) => n.mode !== 'dance')).toBe(true);
  });
  it('has a dance pose with arms up', () => {
    const p = npcPose({ mode: 'dance', moving: false, walkPhase: 0, time: 1, holding: false, distracted: false } as never);
    expect(p.armRaise).toBeGreaterThan(0.5);
  });
});

describe('the new levels', () => {
  it('exist, are reachable and have a chain', () => {
    for (const id of ['rush-hour', 'strike', 'jukebox-hero']) {
      const l = LEVELS.find((x) => x.id === id)!;
      expect(l).toBeTruthy();
      expect(l.extraQuests?.[0].chain).toBe(true);
    }
    expect(LEVELS.find((x) => x.id === 'jukebox-hero')!.switches?.[0].effect).toBe('dance');
  });
});

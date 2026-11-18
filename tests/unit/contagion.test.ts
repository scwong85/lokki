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

describe('hiding and BOO', () => {
  it('a hidden gull is invisible beyond arm length, a visible one is not', async () => {
    const { canSee } = await import('../../src/gameplay/npc');
    const n = { x: 0, z: 0, heading: 0, mode: 'idle' };
    const g = { x: 0, y: 1, z: -4, diving: false };
    expect(canSee(n, g, new World())).toBe(true);
    expect(canSee(n, { ...g, hidden: true }, new World())).toBe(false);
  });
  it('BOO makes everyone close drop their cone and panic', () => {
    const { npcs } = setup(line(3, 1.5));
    const ev = npcs.boo(1.5, 0, 5);
    expect(ev.filter((e) => e.type === 'boo').length).toBe(3);
    expect(npcs.npcs.every((n) => n.holding === null && n.mode === 'panic')).toBe(true);
  });
});

describe('playtest fixes', () => {
  it('people who are watching the gull (notice, shield) still catch a fright and still dance', () => {
    const { npcs, run } = setup(line(4, 1.5));
    for (const n of npcs.npcs.slice(1)) n.mode = 'shield';
    (npcs as unknown as { pending: NpcEvent[] }).pending.push({ type: 'panic', npc: npcs.npcs[0] });
    const ev = run(2);
    expect(Math.max(...(ev.filter((e) => e.type === 'spread') as { count: number }[]).map((e) => e.count))).toBeGreaterThanOrEqual(3);
    const b = setup(line(3, 1.5));
    for (const n of b.npcs.npcs) n.mode = 'notice';
    expect(b.npcs.danceNear(1.5, 0, 20, 5).find((e) => e.type === 'dancing')).toMatchObject({ count: 3 });
  });
  it('a knocked-down line walks back to its places and takes its cones back', () => {
    const spawns = line(4, 1.2).map((s) => ({ ...s, post: true }));
    const { npcs, run } = setup(spawns);
    const g = { x: 0, y: 0.9, z: 0.4, vx: 0, vy: 0, vz: -20, mode: 'dive' } as unknown as FlightState;
    expect(npcs.slam(g)).toBe(true);
    run(3);
    expect(npcs.npcs.some((n) => n.holding === null)).toBe(true);
    run(14);
    npcs.npcs.forEach((n, i) => {
      expect(Math.hypot(n.x - i * 1.2, n.z)).toBeLessThan(0.6);
      expect(n.holding).not.toBeNull();
    });
  });
});

describe('M56 toys', () => {
  it('a falling domino knocks over the people it lands on, and they knock over their neighbours', () => {
    const { npcs, run } = setup(line(5, 1.2));
    expect(npcs.knockAt(0, 0, 1.1, { x: 1, z: 0 })).toBe(1);
    const ev = run(3);
    expect(Math.max(...(ev.filter((e) => e.type === 'knockdown') as { count: number }[]).map((e) => e.count))).toBeGreaterThanOrEqual(3);
  });
  it('a dog called by a honk runs to the spot', async () => {
    const { Dog } = await import('../../src/gameplay/dogs');
    const d = new Dog(0, 0, 0, 0);
    d.summon(20, 0);
    for (let i = 0; i < 240; i++) d.update(DT, [], []);
    expect(d.x).toBeGreaterThan(12);
  });
  it('nobody sees a disguised gull', async () => {
    const { canSee } = await import('../../src/gameplay/npc');
    expect(canSee({ x: 0, z: 0, heading: 0, mode: 'idle' }, { x: 0, y: 1, z: -2, diving: false, disguise: true }, new World())).toBe(false);
  });
  it('the new levels exist', () => {
    for (const id of ['leaf-blower', 'domino-rally', 'captain-gull', 'hush-puppy', 'tablecloth', 'service-bell']) expect(LEVELS.some((l) => l.id === id)).toBe(true);
  });
});

describe('dog fixes', () => {
  it('a chasing or called dog stops short of the gull instead of merging with it', async () => {
    const { Dog } = await import('../../src/gameplay/dogs');
    const d = new Dog(0, 0, 0, 0);
    d.summon(10, 0);
    for (let i = 0; i < 400; i++) d.update(DT, [], []);
    expect(Math.hypot(10 - d.x, d.z)).toBeGreaterThan(1.0);
    const c = new Dog(0, 0, 0, 0);
    for (let i = 0; i < 400; i++) c.update(DT, [{ x: 6, y: 0.5, z: 0, grounded: true }], []);
    expect(Math.hypot(6 - c.x, c.z)).toBeGreaterThan(1.0);
  });
});

describe('gates on the NPC systems', () => {
  it('locked contagion, slam and slip do nothing', () => {
    const { npcs, run } = setup(line(5, 1.2));
    npcs.gates = { contagion: false, slam: false, slip: false };
    expect(npcs.slam({ x: 0, y: 0.9, z: 0.4, vx: 0, vy: 0, vz: -20, mode: 'dive' } as unknown as FlightState)).toBe(false);
    (npcs as unknown as { pending: NpcEvent[] }).pending.push({ type: 'panic', npc: npcs.npcs[0] });
    expect(run(2).some((e) => e.type === 'spread')).toBe(false);
  });
});

describe('victims sent somewhere', () => {
  it('a person chasing the thief drops the chase and walks to the place, not noticing the gull', () => {
    const { npcs, run } = setup([{ x: 0, z: 0, heading: 0, holds: 'map', role: 'mapper', color: 0 }]);
    const n = npcs.npcs[0];
    (npcs as unknown as { victimOf: Map<number, number> }).victimOf.set(77, n.id);
    n.mode = 'chase';
    expect(npcs.sendVictimTo(77, 30, 0, 'ferry')).toBe(true);
    expect(n.mode).toBe('walk');
    expect(n.obliviousT).toBeGreaterThan(30);
    run(4);
    expect(n.x).toBeGreaterThan(2); // walked towards (30, 0)
  });
});

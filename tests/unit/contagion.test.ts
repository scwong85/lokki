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

describe('photos: who is in the picture', () => {
  it('the click names the gulls in front of the photographer', () => {
    const { npcs } = setup([{ x: 0, z: 0, heading: 0, role: 'selfie', stationary: true, color: 0 }]);
    const gulls = [{ x: 0.4, y: 1, z: -2, diving: false }, { x: -0.4, y: 1, z: -2.5, diving: false }, { x: 30, y: 1, z: 30, diving: false }];
    let who: number[] | null = null;
    for (let i = 0; i < 60 * 40 && !who; i++) for (const e of npcs.update(DT, gulls)) if (e.type === 'selfieClick' && e.inFrame) who = e.who;
    expect(who).toEqual([0, 1]);
  });
});

describe('stage 2.2 class: panic spreads', () => {
  it('a splat on one photographer reaches at least two others', () => {
    const def = LEVELS.find((l) => l.id === 'a2s2')!;
    const { npcs, run } = setup(def.extraTourists!.map((t) => ({ ...t })));
    const src = npcs.npcs.find((n) => n.role === 'selfie')!;
    (npcs as unknown as { pending: NpcEvent[] }).pending.push({ type: 'panic', npc: src });
    const ev = run(4);
    expect(Math.max(...(ev.filter((e) => e.type === 'spread') as { count: number }[]).map((e) => e.count))).toBeGreaterThanOrEqual(2);
  });
});

describe('the graduate who dropped his cap', () => {
  it('chases the gull that picks it up off the floor (relentless people only)', () => {
    const { npcs } = setup([
      { x: 0, z: 0, heading: 0, holds: 'cap', role: 'graduate', relentless: true, color: 0 },
      { x: 10, z: 0, heading: 0, holds: 'cap', role: 'other', color: 0 },
    ]);
    const [grad, other] = npcs.npcs;
    const gp = grad.holding!, op = other.holding!;
    npcs.soakRadius(0, 0, 1);
    npcs.soakRadius(10, 0, 1); // both are frightened and drop their caps
    expect(grad.holding).toBeNull();
    npcs.onGroundPickup(gp);
    npcs.onGroundPickup(op);
    expect(grad.mode).toBe('chase'); // at once, before the next step
    const ev: NpcEvent[] = [];
    for (let i = 0; i < 10; i++) ev.push(...npcs.update(DT, { x: 20, y: 1, z: 0, diving: false }));
    expect(grad.mode).toBe('chase');
    expect(grad.mood).toBe('angry');
    expect(other.mode).not.toBe('chase');
    expect(ev.some((e) => e.type === 'chase' && e.npc === grad)).toBe(true);
  });
});

describe('stage 2.2 graduate really runs after the thief (the real cast)', () => {
  it('knocked down by a dive, his cap taken off the floor, he chases the gull across the square', () => {
    const def = LEVELS.find((l) => l.id === 'a2s2')!;
    const { npcs } = setup(def.extraTourists!.map((t) => ({ ...t })));
    const grad = npcs.npcs.find((n) => n.role === 'graduate')!;
    const capId = grad.holding!;
    // a fast dive through him
    expect(npcs.slam({ x: grad.x, y: 0.9, z: grad.z + 0.6, vx: 0, vy: 0, vz: -24, mode: 'dive' } as unknown as FlightState)).toBe(true);
    expect(grad.holding).toBeNull();
    npcs.onGroundPickup(capId);
    expect(grad.mode).toBe('chase');
    const x0 = grad.x, z0 = grad.z;
    const gull = { x: grad.x + 8, y: 2, z: grad.z - 8, diving: false };
    const evs: NpcEvent[] = [];
    for (let i = 0; i < 60 * 4; i++) evs.push(...(npcs.update(DT, gull) as NpcEvent[]));
    expect(Math.hypot(grad.x - x0, grad.z - z0)).toBeGreaterThan(5); // he ran a good way
    expect(grad.mode).toBe('chase');
    expect(evs.some((e) => e.type === 'chase' && e.npc === grad)).toBe(true);
  });
});

describe('hard hat soft heart: the flowers on the floor', () => {
  it('a person who has just bought comfort food chases whoever picks it up off the floor', () => {
    const { npcs } = setup([{ x: 0, z: 0, heading: 0, holds: 'flowers', role: 'hardhat', color: 0 }]);
    const n = npcs.npcs[0];
    const flowers = n.holding!;
    n.hadComfort = true; // he has just bought them
    npcs.soakRadius(0, 0, 1); // knocked over, they fall
    npcs.onGroundPickup(flowers);
    expect(n.mode).toBe('chase');
    expect(n.mood).toBe('angry');
  });
  it('someone who bought nothing does not (an ordinary dropped item)', () => {
    const { npcs } = setup([{ x: 0, z: 0, heading: 0, holds: 'flowers', role: 'x', color: 0 }]);
    const n = npcs.npcs[0];
    const flowers = n.holding!;
    npcs.soakRadius(0, 0, 1);
    npcs.onGroundPickup(flowers);
    expect(n.mode).not.toBe('chase');
  });
});

describe('a dive at the hand snatches, a dive at the body bowls over', () => {
  const fast = (x: number, z: number, heading: number, diveAngle = 0.9): FlightState => ({ x, y: 1.1, z, vx: 0, vy: 0, vz: -24, heading, mode: 'dive', diveAngle } as unknown as FlightState);
  it('a steep dive does not bowl over someone whose hand the beak is about to take', () => {
    const { npcs } = setup([{ x: 0, z: 0, heading: 0, holds: 'icecream', role: 'a', color: 0 }]);
    const n = npcs.npcs[0];
    const beakAtHand = { x: n.x - Math.sin(n.handAngle) * 0.5, z: n.z - Math.cos(n.handAngle) * 0.5 };
    // the gull's beak is 0.85 ahead of it (heading 0 faces -z), so put the gull behind the hand
    expect(npcs.slam(fast(beakAtHand.x, beakAtHand.z + 0.85, 0))).toBe(false);
    expect(n.mode).not.toBe('slip');
    expect(n.holding).not.toBeNull();
  });
  it('a shallow dive skims through and bowls them over even with the hand in reach', () => {
    const { npcs } = setup([{ x: 0, z: 0, heading: 0, holds: 'icecream', role: 'a', color: 0 }]);
    const n = npcs.npcs[0];
    expect(npcs.slam(fast(n.x - Math.sin(n.handAngle) * 0.5, n.z - Math.cos(n.handAngle) * 0.5 + 0.85, 0, 0.1))).toBe(true);
  });
  it('still bowls over someone it hits on the body, or who holds nothing', () => {
    const { npcs } = setup([{ x: 0, z: 0, heading: 0, role: 'a', color: 0 }]);
    expect(npcs.slam(fast(0, 0.6, 0))).toBe(true);
  });
});

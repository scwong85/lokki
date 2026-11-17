import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { World } from '../../src/world/collision';
import { SLIP_SECONDS, newNpc, slip, stepNpc, type GullInfo, type Npc, type NpcCtx, type NpcEvent } from '../../src/gameplay/npc';
import { npcPose } from '../../src/gameplay/npcPose';
import { LEVELS } from '../../src/data/levels';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
const ctx = (): NpcCtx => ({ world: new World(), walkable: () => true, rng: createRng(5) });
const far: GullInfo = { x: 500, y: 20, z: 500, diving: false };
function run(n: Npc, g: GullInfo, secs: number, c: NpcCtx = ctx()): NpcEvent[] {
  const evs: NpcEvent[] = [];
  for (let i = 0; i < Math.round(secs / DT); i++) evs.push(...stepNpc(n, g, [], DT, c));
  return evs;
}

describe('slip', () => {
  it('drops what they hold, slides on, is angrier, and gets up after a moment', () => {
    const n = newNpc(1, { x: 0, z: 0, heading: 0, holds: 'bun', role: 'inspector', color: 0 });
    n.holding = 5;
    n.mode = 'walk';
    const ev: NpcEvent[] = [];
    slip(n, ev);
    expect(n.mode).toBe('slip');
    expect(n.holding).toBeNull();
    expect(n.mood).toBe('annoyed');
    expect(ev.some((e) => e.type === 'slipped')).toBe(true);
    const z0 = n.z;
    run(n, far, 1);
    expect(n.z).toBeLessThan(z0 - 0.5); // heading 0 faces -z: slid forward
    run(n, far, SLIP_SECONDS + 0.2);
    expect(n.mode).toBe('recover');
  });
  it('slipping twice makes them furious', () => {
    const n = newNpc(2, { x: 0, z: 0, heading: 0, role: 'x', color: 0 });
    slip(n, []);
    slip(n, []);
    expect(n.mood).toBe('angry');
  });
  it('lies on the ground in the animation (leaning right back, arms up)', () => {
    const p = npcPose({ mode: 'slip', moving: false, walkPhase: 0, time: 0, holding: false, distracted: false } as never);
    expect(p.lean).toBeLessThan(-1);
    expect(p.armRaise).toBe(1);
  });
});

describe('the conga line', () => {
  const follower = (x = 0, z = 0): Npc => newNpc(3, { x, z, heading: 0, follows: true, role: 'bored', color: 0 });
  it('a follower walks towards a taunting gull and stops at its gap', () => {
    const n = follower(0, 0);
    n.followGap = 4;
    run(n, { x: 0, y: 1, z: -15, diving: false, taunt: true }, 6);
    expect(n.following).toBe(true);
    expect(n.z).toBeLessThan(-5); // came forward
    expect(Math.hypot(n.x, n.z + 15)).toBeLessThan(5.5);
    expect(Math.hypot(n.x, n.z + 15)).toBeGreaterThan(3); // did not bump into it
  });
  it('keeps following for a few seconds after the taunt stops, then wanders off', () => {
    const n = follower(0, 0);
    run(n, { x: 0, y: 1, z: -15, diving: false, taunt: true }, 2);
    run(n, { x: 0, y: 1, z: -15, diving: false }, tuning.mood.followHold.value - 1);
    expect(n.following).toBe(true);
    run(n, { x: 0, y: 1, z: -15, diving: false }, 3);
    expect(n.following).toBe(false);
  });
  it('ignores a taunt from too far away, and people who do not follow ignore it altogether', () => {
    const n = follower(0, 0);
    run(n, { x: 0, y: 1, z: -(tuning.mood.followRange.value + 10), diving: false, taunt: true }, 2);
    expect(n.following).toBe(false);
    const plain = newNpc(4, { x: 0, z: 0, heading: 0, role: 'x', color: 0 });
    run(plain, { x: 0, y: 1, z: -8, diving: false, taunt: true }, 2);
    expect(plain.following).toBe(false);
  });
});

describe('patrol', () => {
  it('walks its route back and forth', () => {
    const n = newNpc(5, { x: 0, z: 0, heading: 0, role: 'inspector', color: 0, patrol: [{ x: 10, z: 0 }, { x: 0, z: 0 }] });
    let maxX = 0, minAfter = 99;
    for (let i = 0; i < 60 * 60; i++) {
      stepNpc(n, far, [], DT, ctx());
      maxX = Math.max(maxX, n.x);
      if (maxX > 9) minAfter = Math.min(minAfter, n.x);
    }
    expect(maxX).toBeGreaterThan(9);
    expect(minAfter).toBeLessThan(1.5);
  });
});

describe('mischief levels', () => {
  it('Wet Floor has an inspector who patrols with a lunch, and a zone along the route', () => {
    const l = LEVELS.find((x) => x.id === 'wet-floor')!;
    const insp = l.extraTourists!.find((t) => t.role === 'inspector')!;
    expect(insp.patrol!.length).toBe(2);
    expect(insp.holds).toBe('bun');
    expect(insp.holdTag).toBe('inspLunch');
    const z = l.splatZones![0].zone;
    for (const p of insp.patrol!) {
      expect(p.z).toBeGreaterThan(z.minZ - 0.01);
      expect(p.z).toBeLessThan(z.maxZ + 0.01); // the route runs through the zone
    }
    expect(z.maxZ - z.minZ).toBeLessThanOrEqual(3.4); // narrow enough that a splat in it is always within the puddle's reach of his path
  });
  it('Pied Piper has six followers and stops that need four', () => {
    const l = LEVELS.find((x) => x.id === 'pied-piper')!;
    expect(l.extraTourists!.filter((t) => t.follows).length).toBe(6);
    expect(l.parade!.stops.every((s) => s.need === 4)).toBe(true);
    expect(l.parade!.stops.map((s) => s.event)).toEqual(['piperGather', 'piperWest', 'piperEast', 'piperFerry']);
  });
});

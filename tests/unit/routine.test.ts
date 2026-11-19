import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { World } from '../../src/world/collision';
import { lingerSeconds, pickRoutine, standingSpot, type Poi } from '../../src/gameplay/routine';
import { newNpc, stepNpc, startle, type NpcCtx } from '../../src/gameplay/npc';
import { npcPose } from '../../src/gameplay/npcPose';
import { strollerSpawns } from '../../src/gameplay/crowd';
import { poisFor } from '../../src/data/pois';

const DT = 1 / 60;
const far = { x: 900, y: 20, z: 900, diving: false };
const A: Poi = { x: 20, z: 0, kind: 'photo', stand: 4 };
const B: Poi = { x: -20, z: 10, kind: 'watch', stand: 4 };
const ctx = (): NpcCtx => ({ world: new World(), walkable: () => true, rng: createRng(8) });

describe('routine', () => {
  it('picks different stops, never more than there are', () => {
    const r = pickRoutine([A, B], createRng(1), 5);
    expect(r).toHaveLength(2);
    expect(new Set(r).size).toBe(2);
  });
  it('people stand on a ring round the landmark, face it, and differ from each other', () => {
    const a = standingSpot(A, 1), b = standingSpot(A, 2);
    expect(Math.hypot(a.x - A.x, a.z - A.z)).toBeGreaterThanOrEqual(4);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.5);
    // heading convention: facing (dx, dz) is atan2(-dx, -dz)
    expect(a.heading).toBeCloseTo(Math.atan2(-(A.x - a.x), -(A.z - a.z)));
    expect(lingerSeconds('rest', createRng(1))).toBeGreaterThan(lingerSeconds('photo', createRng(1)) - 1);
  });
  it('a walker goes to a stop, takes the pose and lingers, then goes on to the next stop', () => {
    const c = ctx();
    const n = newNpc(3, { x: 0, z: 0, color: 1, routine: [A, B] });
    const seen: string[] = [];
    let atFirst = false;
    for (let i = 0; i < 60 * 120; i++) {
      stepNpc(n, far, [], DT, c);
      if (n.stance !== 'none' && seen[seen.length - 1] !== n.stance) seen.push(n.stance);
      if (n.stance === 'photo' && Math.hypot(n.x - A.x, n.z - A.z) < 8) atFirst = true;
    }
    expect(atFirst).toBe(true);
    expect(seen.slice(0, 2)).toEqual(['photo', 'watch']);
  });
  it('a fright ends the pose; the walk picks up again afterwards', () => {
    const c = ctx();
    const n = newNpc(3, { x: 19, z: 3, color: 1, routine: [A, B] });
    for (let i = 0; i < 60 * 40 && n.stance === 'none'; i++) stepNpc(n, far, [], DT, c);
    expect(n.stance).toBe('photo');
    startle(n, 'pooped');
    stepNpc(n, far, [], DT, c);
    expect(n.stance).toBe('none');
  });
  it('the pose shows: a raised phone for a photo, and nothing odd for people who are just standing', () => {
    const base = { mode: 'idle' as const, moving: false, walkPhase: 0, t: 0, time: 1, holding: false };
    expect(npcPose({ ...base, stance: 'photo' }).armRaise).toBeGreaterThan(0.5);
    expect(npcPose({ ...base, stance: 'none' }).armRaise).toBe(0);
    expect(npcPose({ ...base, mode: 'walk', stance: 'photo' }).armRaise).toBe(0); // walking is walking
  });
  it('strollers of a district get stops from its landmarks; a district without any keeps the plain wander', () => {
    const k = strollerSpawns('a1s1', { x: 0, z: 0 }, 4, () => true, [], poisFor('kauppatori'));
    expect(k.every((s) => (s.routine?.length ?? 0) >= 2)).toBe(true);
    expect(strollerSpawns('e1', { x: 0, z: 0 }, 4, () => true, [], poisFor('esplanadi')).every((s) => s.routine === undefined)).toBe(true);
    expect(poisFor('senaatintori').length).toBeGreaterThanOrEqual(4);
  });
});

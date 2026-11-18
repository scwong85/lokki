import { describe, it, expect } from 'vitest';
import { strollerSpawns, strollerCount } from '../../src/gameplay/crowd';
import { World } from '../../src/world/collision';
import { newNpc, stepNpc, type NpcCtx, type GullInfo } from '../../src/gameplay/npc';
import { createRng } from '../../src/core/rng';

const open = () => true;

describe('strollers', () => {
  it('are seeded by the level, walkable, apart from the cast and from each other', () => {
    const a = strollerSpawns('a1s1', { x: 0, z: 0 }, 6, open, [{ x: 5, z: 5 }]);
    const b = strollerSpawns('a1s1', { x: 0, z: 0 }, 6, open, [{ x: 5, z: 5 }]);
    expect(a).toEqual(b);
    expect(a).toHaveLength(6);
    expect(a.every((s) => s.role === 'stroller' && !s.stationary)).toBe(true);
    expect(strollerSpawns('a1s2', { x: 0, z: 0 }, 6, open)[0]).not.toEqual(a[0]);
    for (const s of a) expect(Math.hypot(s.x - 5, s.z - 5)).toBeGreaterThanOrEqual(3);
  });
  it('only use standing room, and give up gracefully when there is none', () => {
    expect(strollerSpawns('x', { x: 0, z: 0 }, 5, () => false)).toEqual([]);
    expect(strollerSpawns('x', { x: 0, z: 0 }, 5, (x) => x > 0).every((s) => s.x > 0)).toBe(true);
  });
  it('stages get the default crowd, playground levels none unless asked', () => {
    expect(strollerCount({ arc: 1 })).toBeGreaterThan(0);
    expect(strollerCount({})).toBe(0);
    expect(strollerCount({ arc: 1, sandbox: true })).toBe(0);
    expect(strollerCount({ strollers: 3 })).toBe(3);
    expect(strollerCount({ arc: 1, strollers: 0 })).toBe(0);
  });
});

describe('roaming', () => {
  it('a stationary person with roam strolls but stays inside the leash; without it stays put', () => {
    const ctx: NpcCtx = { rng: createRng(5), walkable: () => true, world: new World() };
    const gull: GullInfo = { x: 500, y: 20, z: 500, diving: false };
    const run = (roam: number | undefined) => {
      const n = newNpc(1, { x: 0, z: 0, color: 1, stationary: true, roam });
      let far = 0;
      for (let i = 0; i < 60 * 90; i++) {
        stepNpc(n, gull, [], 1 / 60, ctx);
        far = Math.max(far, Math.hypot(n.x, n.z));
      }
      return far;
    };
    expect(run(undefined)).toBe(0);
    const far = run(3);
    expect(far).toBeGreaterThan(0.5);
    expect(far).toBeLessThanOrEqual(3.5);
  });
});

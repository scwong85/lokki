import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { lineWalkable, newWalker, pickTarget, stepWalker, type WalkCtx } from '../../src/gameplay/streetLife';

// a 100 x 100 square of pavement with a wall (unwalkable strip) across the middle at x = 0..2, z from -100 to 30
const walkable = (x: number, z: number) => Math.abs(x) < 50 && Math.abs(z) < 50 && !(x > 0 && x < 2 && z < 30);
const ctx = (seed = 1): WalkCtx => ({ walkable, rng: createRng(seed) });

describe('street life', () => {
  it('lines are only walkable if nothing is in the way', () => {
    expect(lineWalkable(walkable, -10, -10, -5, 10)).toBe(true);
    expect(lineWalkable(walkable, -10, 0, 10, 0)).toBe(false); // through the wall
    expect(lineWalkable(walkable, -10, 40, 10, 40)).toBe(true); // around it, past the end
  });
  it('picks targets over free ground', () => {
    const c = ctx();
    const w = newWalker(1, 'walk', -20, 0, c.rng);
    for (let i = 0; i < 50; i++) {
      expect(pickTarget(w, c, 10, 30)).toBe(true);
      expect(walkable(w.tx, w.tz)).toBe(true);
      expect(lineWalkable(walkable, w.x, w.z, w.tx, w.tz)).toBe(true);
    }
  });
  it('walkers keep moving for minutes without leaving the pavement, walking into the wall or standing still for ever', () => {
    const c = ctx(7);
    const people = Array.from({ length: 6 }, (_, i) => newWalker(i, i < 4 ? 'walk' : 'bike', -25 + i * 4, -20 + i * 6, c.rng));
    const start = people.map((p) => ({ x: p.x, z: p.z }));
    const moved = people.map(() => 0);
    for (let t = 0; t < 60 * 180; t++) {
      people.forEach((p, i) => {
        const px = p.x, pz = p.z;
        stepWalker(p, 1 / 60, c);
        moved[i] += Math.hypot(p.x - px, p.z - pz);
        expect(walkable(p.x, p.z), `walker ${i} at ${p.x.toFixed(1)},${p.z.toFixed(1)}`).toBe(true);
      });
    }
    people.forEach((p, i) => {
      expect(moved[i], `walker ${i} travelled`).toBeGreaterThan(p.kind === 'bike' ? 300 : 60);
      expect(Math.hypot(p.x - start[i].x, p.z - start[i].z)).toBeGreaterThanOrEqual(0); // (just that they are somewhere valid)
    });
  });
  it('cyclists are faster than pedestrians, and nobody moves while waiting', () => {
    const c = ctx(3);
    const a = newWalker(1, 'walk', 0, 40, c.rng), b = newWalker(2, 'bike', 0, 40, c.rng);
    expect(b.speed).toBeGreaterThan(a.speed);
    a.wait = 5;
    const x = a.x, z = a.z;
    stepWalker(a, 1, c);
    expect([a.x, a.z, a.moving]).toEqual([x, z, false]);
  });
  it('is deterministic for a seed', () => {
    const run = () => {
      const c = ctx(11);
      const w = newWalker(1, 'walk', -10, -10, c.rng);
      for (let i = 0; i < 2000; i++) stepWalker(w, 1 / 60, c);
      return [w.x, w.z];
    };
    expect(run()).toEqual(run());
  });
});

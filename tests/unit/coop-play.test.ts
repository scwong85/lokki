import { describe, expect, it } from 'vitest';
import { PassTracker, Tangle, decoyCovers, spotterHit, watchedGull } from '../../src/gameplay/coopPlay';
import { Squash } from '../../src/gameplay/squash';
import { Puffs } from '../../src/render/puffs';
import { Emotes } from '../../src/render/emotes';
import { makeSnapshot } from '../../src/net/snapshot';

describe('taunt: decoy and thief', () => {
  it('people watch the nearest gull, unless another one is taunting nearby', () => {
    const near = { x: 1, z: 0 }, far = { x: 8, z: 0, taunt: true };
    expect(watchedGull({ x: 0, z: 0 }, [near, { x: 8, z: 0 }])).toBe(near);
    expect(watchedGull({ x: 0, z: 0 }, [near, far])).toBe(far);
    expect(watchedGull({ x: 0, z: 0 }, [near, { x: 90, z: 0, taunt: true }])).toBe(near); // too far to matter
  });
  it('a snatch is covered only by the OTHER gull taunting close by', () => {
    const at = { x: 0, z: 0 };
    expect(decoyCovers(0, at, [{ x: 0, z: 0 }, { x: 6, z: 0, taunt: true }])).toBe(true);
    expect(decoyCovers(0, at, [{ x: 0, z: 0, taunt: true }, { x: 6, z: 0 }])).toBe(false);
    expect(decoyCovers(0, at, [{ x: 0, z: 0 }, { x: 80, z: 0, taunt: true }])).toBe(false);
  });
});

describe('mid-air pass', () => {
  it('a catch by the other gull in flight is a pass; chains count', () => {
    const p = new PassTracker();
    p.released(7, 0, 10);
    expect(p.autoCatch(7, 1, 10.1, 1, true)).toBe(false); // too soon after the throw
    expect(p.autoCatch(7, 1, 10.6, 1, true)).toBe(true);
    expect(p.autoCatch(7, 0, 10.6, 1, true)).toBe(false); // not your own throw
    expect(p.autoCatch(7, 1, 10.6, 9, true)).toBe(false); // too far
    expect(p.autoCatch(7, 1, 10.6, 1, false)).toBe(false); // standing on the ground
    expect(p.grabbed(7, 1, 10.6, true)).toBe(true);
    expect(p.chain).toBe(1);
    p.released(7, 1, 12);
    expect(p.grabbed(7, 0, 12.8, true)).toBe(true);
    expect(p.chain).toBe(2);
  });
  it('picking up your own throw, a stale throw or a ground pick-up is not a pass', () => {
    const p = new PassTracker();
    p.released(1, 0, 0);
    expect(p.grabbed(1, 0, 0.5, true)).toBe(false);
    p.released(2, 0, 0);
    expect(p.grabbed(2, 1, 9, true)).toBe(false);
    p.released(3, 0, 0);
    expect(p.grabbed(3, 1, 1, false)).toBe(false);
    p.released(4, 0, 0);
    expect(p.fresh(1)).toEqual([4]);
    expect(p.fresh(60)).toEqual([]);
  });
});

describe('spotter and rescue', () => {
  it('a splat near the partner\'s lock is spotted', () => {
    expect(spotterHit({ x: 0, y: 1, z: 0 }, { x: 1, z: 1 })).toBe(true);
    expect(spotterHit({ x: 0, y: 1, z: 0 }, { x: 10, z: 1 })).toBe(false);
    expect(spotterHit(null, { x: 0, z: 0 })).toBe(false);
  });
  it('a caught gull stays stuck until the partner is close, or time runs out', () => {
    const t = new Tangle();
    t.caught(0);
    expect(t.stuck(0)).toBe(true);
    expect(t.update(0.1, [{ x: 0, y: 1, z: 0 }, { x: 20, y: 1, z: 0 }])).toEqual([]);
    expect(t.update(0.1, [{ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }])).toEqual([[0, 1]]);
    expect(t.stuck(0)).toBe(false);
    t.caught(1);
    for (let i = 0; i < 600; i++) t.update(1 / 60, [{ x: 50, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }]);
    expect(t.stuck(1)).toBe(false);
  });
});

describe('juice', () => {
  it('squash springs back to 1 and keeps the volume', () => {
    const s = new Squash();
    s.kick(-0.25);
    s.update(0.03);
    expect(s.y).toBeLessThan(1);
    expect(s.xz).toBeGreaterThan(1);
    for (let i = 0; i < 300; i++) s.update(1 / 60);
    expect(s.y).toBeCloseTo(1, 2);
  });
  it('puffs spawn, fall and die; disabled puffs do nothing', () => {
    const p = new Puffs(64);
    p.burst('stars', { x: 0, y: 1, z: 0 });
    expect(p.active).toBeGreaterThan(5);
    for (let i = 0; i < 300; i++) p.update(1 / 60);
    expect(p.active).toBe(0);
    p.enabled = false;
    p.burst('confetti', { x: 0, y: 1, z: 0 });
    expect(p.active).toBe(0);
  });
  it('emotes replace the one over the same head and expire', () => {
    const e = new Emotes(4);
    const head = {};
    e.show('alert', head, () => ({ x: 0, y: 2, z: 0 }), 1);
    e.show('anger', head, () => ({ x: 0, y: 2, z: 0 }), 1);
    expect(e.active).toBe(1);
    e.update(2);
    expect(e.active).toBe(0);
  });
});

describe('snapshot carries the district cast and co-op flags', () => {
  it('round-trips', () => {
    const s = makeSnapshot({
      time: 1, heat: 0, props: [], npcs: [], quests: [],
      gulls: [{ id: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'air', carry: null, taunt: true }, { id: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground', carry: null, tangled: true }],
      x: { tr: [-150, 1, 0], pg: 1, sb: [0, 1], dg: [[1, 2, 0.5, 1]], sp: 3.5 },
    });
    const back = JSON.parse(JSON.stringify(s));
    expect(back.gulls[0].tn).toBe(1);
    expect(back.gulls[1].tg).toBe(1);
    expect(back.gulls[0].tg).toBeUndefined();
    expect(back.x).toEqual({ tr: [-150, 1, 0], pg: 1, sb: [0, 1], dg: [[1, 2, 0.5, 1]], sp: 3.5 });
  });
});

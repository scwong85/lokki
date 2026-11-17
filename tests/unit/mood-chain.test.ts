import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { World } from '../../src/world/collision';
import { angrier, newNpc, setMood, startle, stepNpc, type GullInfo, type Npc, type NpcCtx, type NpcEvent, type Station } from '../../src/gameplay/npc';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
const STALL: Station = { id: 'iceStall', x: 0, z: -10, r: 5, sells: 'icecream' };
const ctx = (stations: Station[] = [STALL]): NpcCtx => ({ world: new World(), walkable: () => true, rng: createRng(3), stations });
const far: GullInfo = { x: 500, y: 20, z: 500, diving: false };
function run(n: Npc, g: GullInfo, secs: number, c: NpcCtx = ctx()): NpcEvent[] {
  const evs: NpcEvent[] = [];
  for (let i = 0; i < Math.round(secs / DT); i++) evs.push(...stepNpc(n, g, [], DT, c));
  return evs;
}
const mapper = (x = 0, z = 0): Npc => {
  const n = newNpc(1, { x, z, heading: 0, holds: 'map', craves: 'icecream', role: 'mapper', color: 0 });
  n.holding = 7;
  return n;
};

describe('mood', () => {
  it('a snatch makes them angry, a splat annoys and a second splat angers, yuck upsets, a cheer delights', () => {
    const a = mapper();
    expect(startle(a, 'snatched').some((e) => e.type === 'mood' && e.mood === 'angry')).toBe(true);
    const b = mapper();
    startle(b, 'pooped');
    expect(b.mood).toBe('annoyed');
    startle(b, 'pooped');
    expect(b.mood).toBe('angry');
    const c = mapper();
    startle(c, 'yuck');
    expect(c.mood).toBe('upset');
    const d = mapper();
    startle(d, 'cheer');
    expect(d.mood).toBe('delighted');
    expect(angrier('calm')).toBe('annoyed');
    expect(angrier('annoyed')).toBe('angry');
    expect(angrier('angry')).toBe('angry');
  });
  it('says so once when the mood changes, and fades back to calm', () => {
    const n = mapper();
    const ev: NpcEvent[] = [];
    setMood(n, 'angry', ev);
    setMood(n, 'angry', ev);
    expect(ev.filter((e) => e.type === 'mood')).toHaveLength(1);
    n.holding = null;
    n.craves = null;
    n.mode = 'idle';
    const evs = run(n, far, tuning.mood.time.value + 1);
    expect(n.mood).toBe('calm');
    expect(evs.some((e) => e.type === 'mood' && e.mood === 'calm')).toBe(true);
  });
});

describe('splatting the same person twice', () => {
  it('annoys, then angers; an angry person who craves comfort chases instead of running', () => {
    const n = mapper();
    startle(n, 'pooped');
    expect(n.mood).toBe('annoyed');
    expect(n.mode).toBe('panic');
    const ev = startle(n, 'pooped');
    expect(n.mood).toBe('angry');
    expect(n.mode).toBe('chase');
    expect(ev.some((e) => e.type === 'mood' && e.mood === 'angry')).toBe(true);
    expect(ev.some((e) => e.type === 'chase')).toBe(false); // that event means "snatched from them"
  });
  it('someone who craves nothing just panics, however often', () => {
    const n = newNpc(3, { x: 0, z: 0, heading: 0, role: 'plain', color: 0 });
    startle(n, 'pooped');
    startle(n, 'pooped');
    expect(n.mood).toBe('angry');
    expect(n.mode).toBe('panic');
  });
  it('the second splat has to come soon after the first: the first is forgiven', () => {
    const n = mapper();
    startle(n, 'pooped');
    n.holding = null;
    run(n, far, tuning.mood.time.value + 2, ctx([]));
    expect(n.mood).toBe('calm');
    startle(n, 'pooped');
    expect(n.mood).toBe('annoyed');
  });
});

describe('the lure', () => {
  it('an angry chaser gives up after a while, but keeps following a taunting gull', () => {
    const plain = mapper();
    startle(plain, 'snatched');
    run(plain, { x: 0, y: 1, z: -20, diving: false }, tuning.npc.chaseTime.value + 1.5, ctx([]));
    expect(plain.mode).not.toBe('chase');
    const lured = mapper();
    startle(lured, 'snatched');
    run(lured, { x: 0, y: 1, z: -20, diving: false, taunt: true }, tuning.npc.chaseTime.value + 8, ctx([]));
    expect(lured.mode).toBe('chase');
  });
});

describe('the grudge and the re-lure (a stuck level was reported)', () => {
  it('an angry person who still wants comfort stays angry far longer than the mood time', () => {
    const n = mapper();
    n.holding = null;
    n.holdType = null;
    setMood(n, 'angry');
    n.mode = 'idle';
    run(n, far, tuning.mood.time.value * 3, ctx([]));
    expect(n.mood).toBe('angry');
  });
  it('after they gave up the chase, taunting makes them follow again, from a distance', () => {
    const n = mapper();
    startle(n, 'snatched');
    run(n, { x: 0, y: 1, z: -20, diving: false }, tuning.npc.chaseTime.value + tuning.npc.recoverTime.value + 6, ctx([]));
    expect(n.mode).not.toBe('chase'); // gave up
    expect(n.mood).toBe('angry'); // but still furious
    run(n, { x: 0, y: 1, z: -40, diving: false, taunt: true }, 1, ctx([]));
    expect(n.mode).toBe('chase');
  });
  it('a calm person, or one who has bought their treat, is not lured', () => {
    const calm = mapper();
    run(calm, { x: 0, y: 1, z: -20, diving: false, taunt: true }, 2, ctx([]));
    expect(calm.mode).not.toBe('chase');
    const fed = mapper();
    setMood(fed, 'angry');
    fed.craves = null;
    fed.holding = null;
    run(fed, { x: 0, y: 1, z: -20, diving: false, taunt: true }, 2, ctx([]));
    expect(fed.mode).not.toBe('chase');
  });
});

describe('stations (comfort food)', () => {
  it('an angry person who craves a treat and is at the stall goes and buys it, then is delighted', () => {
    const n = mapper(0, -8);
    n.holding = null; // the map is gone
    n.holdType = null;
    setMood(n, 'angry');
    const evs = run(n, far, tuning.mood.buyTime.value + 6);
    expect(evs.some((e) => e.type === 'atStation' && e.station === 'iceStall')).toBe(true);
    const bought = evs.find((e) => e.type === 'bought');
    expect(bought && bought.type === 'bought' && bought.propType).toBe('icecream');
    expect(n.mood).toBe('delighted');
    expect(n.craves).toBeNull(); // they have what they wanted
  });
  it('someone with their hands full (a cap, a fish) still goes and buys', () => {
    const n = mapper(0, -8); // holds the map
    setMood(n, 'angry');
    const evs = run(n, far, tuning.mood.buyTime.value + 6);
    expect(evs.some((e) => e.type === 'bought')).toBe(true);
  });
  it('a calm person walking past, or someone angry but far from the stall, buys nothing', () => {
    const calm = mapper(0, -8);
    calm.holding = null;
    expect(run(calm, far, 5).some((e) => e.type === 'atStation')).toBe(false);
    const farAngry = mapper(0, 40);
    farAngry.holding = null;
    setMood(farAngry, 'angry');
    expect(run(farAngry, far, 3).some((e) => e.type === 'atStation')).toBe(false);
  });
  it('someone who craves nothing, or a stall that sells something else, does not buy', () => {
    const n = newNpc(2, { x: 0, z: -8, heading: 0, role: 'x', color: 0 });
    setMood(n, 'angry');
    expect(run(n, far, 4).some((e) => e.type === 'atStation')).toBe(false);
    const m = mapper(0, -8);
    m.holding = null;
    setMood(m, 'angry');
    expect(run(m, far, 4, ctx([{ ...STALL, sells: 'bun' }])).some((e) => e.type === 'atStation')).toBe(false);
  });
  it('a delighted person does not notice the gull (so the cone can be snatched)', () => {
    const n = mapper(0, 0);
    n.heading = 0;
    setMood(n, 'delighted');
    const g: GullInfo = { x: 0, y: 1.6, z: -6, diving: false }; // right in front of him
    run(n, g, 6);
    expect(n.mode === 'notice' || n.mode === 'shield').toBe(false);
  });
});

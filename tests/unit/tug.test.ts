import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { World } from '../../src/world/collision';
import { PROPS } from '../../src/data/props';
import { LEVELS } from '../../src/data/levels';
import { newNpc, setMood, stepNpc, honkAt, type GullInfo, type NpcCtx } from '../../src/gameplay/npc';
import { Tug, npcPull } from '../../src/gameplay/tug';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
const calm = { mode: 'idle', mood: 'calm', distractT: 0 } as const;

/** Run a tug until it ends; `mashEvery` seconds between presses (0 = never), returns the result and how long it took. */
function tug(pull: number, mashEvery: number, held = true, secs = 12): { result: string; t: number } {
  const t = new Tug(1);
  let since = 0;
  for (let i = 0; i < secs / DT; i++) {
    since += DT;
    let mash = 0;
    if (mashEvery > 0 && since >= mashEvery) { mash = 1; since = 0; }
    const r = t.step(DT, { held, mash, pull, interrupted: false });
    if (r !== 'none') return { result: r, t: i * DT };
  }
  return { result: 'none', t: secs };
}

describe('tug of war', () => {
  it('holding alone beats a calm person, slowly', () => {
    const r = tug(npcPull(calm), 0);
    expect(r.result).toBe('won');
    expect(r.t).toBeGreaterThan(1.5);
    expect(r.t).toBeLessThan(6);
  });
  it('mashing E is much faster', () => {
    const slow = tug(npcPull(calm), 0).t;
    const fast = tug(npcPull(calm), 0.12).t;
    expect(fast).toBeLessThan(slow / 2);
  });
  it('someone on guard cannot be beaten by holding alone, only by mashing', () => {
    const guard = npcPull({ mode: 'shield', mood: 'calm', distractT: 0 });
    expect(tug(guard, 0, true, 8).result).toBe('lost'); // holding alone: the meter drains
    expect(tug(guard, 0.1).result).toBe('won'); // mashing wins
  });
  it('an angry guard pulls hardest, a honk or a noise makes them let go', () => {
    const guard = npcPull({ mode: 'shield', mood: 'calm', distractT: 0 });
    expect(npcPull({ mode: 'shield', mood: 'angry', distractT: 0 })).toBeGreaterThan(guard);
    expect(npcPull({ mode: 'startle', mood: 'annoyed', distractT: 0 })).toBeLessThan(0.05);
    expect(npcPull({ mode: 'shield', mood: 'calm', distractT: 2 })).toBeLessThan(guard / 2);
    expect(tug(npcPull({ mode: 'startle', mood: 'annoyed', distractT: 0 }), 0).t).toBeLessThan(4);
  });
  it('letting go ends it, a tap keeps it alive for a moment (phones), and a spray makes you lose', () => {
    expect(tug(0.1, 0, false, 2).result).toBe('cancelled');
    const t = new Tug(1);
    expect(t.step(DT, { held: false, mash: 1, pull: 0.1, interrupted: false })).toBe('none'); // tapped
    let r = 'none';
    for (let i = 0; i < 40 / 60 / DT * 1; i++) r = t.step(DT, { held: false, mash: 0, pull: 0.1, interrupted: false });
    expect(r).toBe('cancelled'); // the tap ran out
    expect(new Tug(1).step(DT, { held: true, mash: 0, pull: 0.1, interrupted: true })).toBe('lost');
  });
  it('starts part of the way, so a hopeless tug is lost quickly rather than dragging on', () => {
    expect(new Tug(1).progress).toBe(tuning.tug.start.value);
    expect(tug(0.9, 0, true, 6).t).toBeLessThan(1.5);
  });
});

describe('what can be taken how', () => {
  it('some items are air-only, some ground-only, the rest both', () => {
    for (const t of ['balloon', 'cap', 'tophat', 'scarf'] as const) expect(PROPS[t].grab, t).toBe('air');
    for (const t of ['soup', 'herring'] as const) expect(PROPS[t].grab, t).toBe('ground');
    for (const t of ['icecream', 'bun', 'map', 'flowers'] as const) expect(PROPS[t].grab ?? 'both', t).toBe('both');
  });
  it('Tug of War uses one of each: ground-only soup, air-only balloon, a bun either way, and vendors', () => {
    const l = LEVELS.find((x) => x.id === 'tug-of-war')!;
    const by = Object.fromEntries(l.extraTourists!.filter((t) => t.holdTag).map((t) => [t.holdTag!, t.holds!]));
    expect(PROPS[by.tugSoup].grab).toBe('ground');
    expect(PROPS[by.tugBalloon].grab).toBe('air');
    expect(PROPS[by.tugBun].grab ?? 'both').toBe('both');
    expect(l.deploy).toContain('vendors');
    expect(l.requires).toBeUndefined();
  });
});

describe('the person being tugged', () => {
  const ctx: NpcCtx = { world: new World(), walkable: () => true, rng: createRng(1) };
  const g: GullInfo = { x: 0, y: 1, z: -1.2, diving: false };
  it('stops wandering, faces the gull and does not notice anything else', () => {
    const n = newNpc(1, { x: 0, z: 0, heading: 1, holds: 'soup', color: 0 });
    n.holding = 3;
    n.tugged = true;
    for (let i = 0; i < 120; i++) stepNpc(n, g, [], DT, ctx);
    expect(n.x).toBe(0);
    expect(n.z).toBe(0);
    expect(Math.cos(n.heading)).toBeGreaterThan(0.9); // heading 0 faces -z, towards the gull at z -1.2
    expect(n.mode).not.toBe('walk');
  });
  it('a honk still startles them, so they let go', () => {
    const n = newNpc(2, { x: 0, z: 0, heading: 0, holds: 'soup', color: 0 });
    n.holding = 3;
    n.tugged = true;
    setMood(n, 'annoyed');
    expect(honkAt(n, 0, -3, [])).not.toBeNull();
    expect(n.mode).toBe('startle');
    for (let i = 0; i < 30; i++) stepNpc(n, g, [], DT, ctx);
    expect(npcPull(n)).toBeLessThan(0.05);
  });
});

describe('team tug', () => {
  it('two gulls halve the pull each, so the same fight is won sooner', () => {
    const run = (pull: number): number => {
      const t = new Tug(1);
      for (let i = 0; i < 60 * 20; i++) {
        const r = t.step(1 / 60, { held: true, mash: i % 8 === 0 ? 1 : 0, pull, interrupted: false });
        if (r === 'won') return i;
        if (r === 'lost' || r === 'cancelled') return 1e9;
      }
      return 1e9;
    };
    expect(run(0.4 / 2)).toBeLessThan(run(0.4));
  });
});

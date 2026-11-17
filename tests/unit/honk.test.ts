import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { World } from '../../src/world/collision';
import { honkAt, newNpc, stepNpc, type GullInfo, type Npc, type NpcCtx, type NpcEvent } from '../../src/gameplay/npc';
import { TapHold } from '../../src/gameplay/tapHold';
import { distanceGain } from '../../src/core/spatial';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
const ctx = (): NpcCtx => ({ world: new World(), walkable: () => true, rng: createRng(2) });
const far: GullInfo = { x: 500, y: 20, z: 500, diving: false };
const run = (n: Npc, secs: number): void => { for (let i = 0; i < Math.round(secs / DT); i++) stepNpc(n, far, [], DT, ctx()); };
/** A tourist at the origin facing -z (heading 0) with an ice cream in hand. */
const tourist = (): Npc => { const n = newNpc(1, { x: 0, z: 0, heading: 0, ice: true, color: 0 }); n.holding = 9; return n; };

describe('honk', () => {
  it('from behind they jump and drop what they hold', () => {
    const n = tourist();
    const ev: NpcEvent[] = [];
    expect(honkAt(n, 0, 6, ev)).toBe('drop'); // the gull is at +z: behind someone facing -z
    expect(n.mode).toBe('startle');
    expect(ev.some((e) => e.type === 'startled' && e.dropped)).toBe(true);
    expect(n.mood).toBe('annoyed');
  });
  it('from the front they only flinch (they were watching)', () => {
    const n = tourist();
    const ev: NpcEvent[] = [];
    expect(honkAt(n, 0, -6, ev)).toBe('flinch');
    expect(ev.some((e) => e.type === 'startled' && !e.dropped)).toBe(true);
  });
  it('a honk behind someone with empty hands is a flinch too', () => {
    const n = newNpc(2, { x: 0, z: 0, heading: 0, color: 0 });
    expect(honkAt(n, 0, 6, [])).toBe('flinch');
  });
  it('people who are busy are not reached: scared, slipping, chasing, buying, in a conga line', () => {
    for (const mode of ['panic', 'slip', 'chase', 'notice', 'shield'] as const) {
      const n = tourist();
      n.mode = mode;
      expect(honkAt(n, 0, 6, []), mode).toBeNull();
    }
    const buying = tourist();
    buying.buyT = 1;
    expect(honkAt(buying, 0, 6, [])).toBeNull();
    const line = newNpc(3, { x: 0, z: 0, heading: 0, follows: true, color: 0 });
    line.following = true;
    expect(honkAt(line, 0, 6, [])).toBeNull();
  });
  it('the flailing ends and they recover', () => {
    const n = tourist();
    honkAt(n, 0, 6, []);
    run(n, tuning.honk.startleTime.value + 0.2);
    expect(n.mode).toBe('recover');
  });
});

describe('T: tap = honk, hold = taunt', () => {
  const th = () => new TapHold(() => 0.25, () => 1.5);
  const press = (t: TapHold, secs: number) => { let holding = false; for (let i = 0; i < Math.round(secs / DT); i++) holding = t.update(true, DT).holding; return { holding, tap: t.update(false, DT).tap }; };
  it('a quick press honks on release and never taunts', () => {
    expect(press(th(), 0.1)).toEqual({ holding: false, tap: true });
  });
  it('holding past the tap time taunts and does not honk on release', () => {
    expect(press(th(), 0.6)).toEqual({ holding: true, tap: false });
  });
  it('the honk has a cooldown', () => {
    const t = th();
    expect(press(t, 0.1).tap).toBe(true);
    expect(press(t, 0.1).tap).toBe(false); // too soon
    for (let i = 0; i < 100; i++) t.update(false, DT);
    expect(press(t, 0.1).tap).toBe(true);
  });
});

describe('distance gain', () => {
  it('is full near, fades to the floor far away, and is never below the floor', () => {
    expect(distanceGain(5, 10, 100, 0)).toBe(1);
    expect(distanceGain(55, 10, 100, 0)).toBeCloseTo(0.5, 5);
    expect(distanceGain(200, 10, 100, 0)).toBe(0);
    expect(distanceGain(500, 30, 450, 0.4)).toBe(0.4); // a church bell is always faintly heard
    expect(distanceGain(240, 30, 450, 0.4)).toBeGreaterThan(0.6);
  });
});

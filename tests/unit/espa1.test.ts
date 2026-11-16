import { describe, expect, it } from 'vitest';
import { Sunbathers, shadowOf } from '../../src/gameplay/sunbathers';
import { Dog } from '../../src/gameplay/dogs';
import { Sprinklers } from '../../src/gameplay/sprinklers';
import { LEVELS, DONT_BLOCK_MY_SUN, GOOD_BOY, SPLASH_ZONE } from '../../src/data/levels';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';

describe('shadow and sunbathers', () => {
  it('the shadow lies north-west and fades with height', () => {
    const low = shadowOf({ x: 0, y: 4, z: 0, cloud: false }, 4);
    expect(low.x).toBeLessThan(0);
    expect(low.z).toBeLessThan(0);
    expect(shadowOf({ x: 0, y: 40, z: 0, cloud: false }, 40).r).toBe(0);
    expect(shadowOf({ x: 0, y: 12, z: 0, cloud: true }, 12).r).toBeLessThan(shadowOf({ x: 0, y: 12, z: 0, cloud: false }, 12).r);
  });
  it('wakes when the shadow crosses a face, sits up, and lies down again', () => {
    const s = new Sunbathers([{ x: 0, z: 0 }]);
    // a gull directly above their face wakes them (the shadow is offset by the sun direction, so stand off to the south-east)
    const g = { x: 3, y: 5, z: 2, cloud: false };
    const sh = shadowOf(g, 5);
    const gull = { ...g, x: g.x - (sh.x - 0), z: g.z - (sh.z - 0) };
    const r = s.update(0.1, [gull]);
    expect(r.events.some((e) => e.type === 'woke')).toBe(true);
    expect(s.list[0].state).toBe('awake');
    expect(r.events.some((e) => e.type === 'allAwake')).toBe(true);
    let lay = false;
    for (let i = 0; i < 60 * 20; i++) if (s.update(1 / 60, []).events.some((e) => e.type === 'lay')) lay = true;
    expect(lay).toBe(true);
    expect(s.list[0].state).toBe('asleep');
  });
  it('a far-away or very high gull wakes nobody', () => {
    const s = new Sunbathers([{ x: 0, z: 0 }]);
    s.update(0.1, [{ x: 30, y: 5, z: 30, cloud: false }, { x: 0, y: 60, z: 0, cloud: false }]);
    expect(s.list[0].state).toBe('asleep');
  });
});

describe('dog', () => {
  it('chases a gull on the ground but not one in the air', () => {
    const d = new Dog(0, 0, 10, 0);
    d.update(0.1, [{ x: 5, y: 0.4, z: 0, grounded: true }], []);
    expect(d.mode).toBe('chase');
    const d2 = new Dog(0, 0, 10, 0);
    d2.update(0.1, [{ x: 5, y: 8, z: 0, grounded: false }], []);
    expect(d2.mode).toBe('idle');
  });
  it('fetches a ball and drops it at the owner\'s feet', () => {
    const d = new Dog(0, 0, 20, 0);
    const events: string[] = [];
    for (let i = 0; i < 60 * 12; i++) for (const e of d.update(1 / 60, [], d.carrying === null ? [{ id: 1, x: -15, y: 0.2, z: 0 }] : [])) events.push(e.type);
    expect(events).toContain('pickup');
    expect(events).toContain('drop');
  });
  it('runs fast and straight through whatever is in the way', () => {
    const d = new Dog(0, 0, 20, 0);
    let runningThrough = 0;
    for (let i = 0; i < 60 * 3; i++) {
      d.update(1 / 60, [], [{ id: 1, x: -15, y: 0.2, z: 0 }]);
      if (d.running && d.x < -2 && d.x > -8) runningThrough++;
    }
    expect(runningThrough).toBeGreaterThan(5);
  });
});

describe('sprinklers', () => {
  it('start, run for a while, then stop; wet only inside a zone while running', () => {
    const sp = new Sprinklers([{ x: 0, z: 0, r: 5 }]);
    expect(sp.wetAt(0, 0)).toBe(-1);
    expect(sp.start().map((e) => e.type)).toEqual(['on']);
    expect(sp.start()).toEqual([]);
    expect(sp.wetAt(1, 1)).toBe(0);
    expect(sp.wetAt(9, 9)).toBe(-1);
    let off = false;
    for (let i = 0; i < 60 * 60; i++) if (sp.update(1 / 60).some((e) => e.type === 'off')) off = true;
    expect(off).toBe(true);
    expect(sp.running).toBe(false);
  });
});

describe('levels E1-E3', () => {
  it('chain after the Senate Square finale', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(ids.slice(ids.indexOf('key-to-the-city'), ids.indexOf('key-to-the-city') + 4)).toEqual(['key-to-the-city', 'dont-block-my-sun', 'good-boy', 'splash-zone']);
    for (const l of [DONT_BLOCK_MY_SUN, GOOD_BOY, SPLASH_ZONE]) {
      expect(l.district).toBe('esplanadi');
      const s = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS);
      expect(s.main.length + s.secret.size).toBeLessThanOrEqual(4);
      expect(s.secret.size).toBe(1);
    }
    expect(DONT_BLOCK_MY_SUN.sunbathers!.length).toBe(4);
    expect(GOOD_BOY.dogs!.length).toBe(1);
    expect(SPLASH_ZONE.sprinklers!.zones.length).toBeGreaterThan(0);
  });
});

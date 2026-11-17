import { describe, expect, it } from 'vitest';
import { LEVELS, levelById } from '../../src/data/levels';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { skillById } from '../../src/data/skills';
import { newVendor, stepVendor } from '../../src/gameplay/vendor';
import { World } from '../../src/world/collision';

const ids = ['the-rival', 'night-market', 'the-drone', 'grand-finale'];
const DT = 1 / 60;

describe('Act 3, themed days (part 2)', () => {
  it('follow level 18 in order, each unlocked by the one before; the finale is last before free play', () => {
    expect(LEVELS.filter((l) => l.arc === undefined).map((l) => l.id).slice(18, 22)).toEqual(ids);
    expect(LEVELS[LEVELS.length - 1].sandbox).toBe(true);
    ids.forEach((id, i) => {
      const l = levelById(id);
      expect(l.requires).toBe(i === 0 ? 'frozen-harbour' : ids[i - 1]);
      expect(skillById(l.reward!)).toBeTruthy();
    });
  });
  it('build from data: 2-4 main to-dos, one hidden, a co-op twist; the finale needs no seven quests', () => {
    for (const id of ids) {
      const l = levelById(id);
      const solo = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS);
      const duo = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS, true);
      expect(solo.main.length, id).toBeGreaterThanOrEqual(2);
      expect(solo.main.length, id).toBeLessThanOrEqual(4);
      expect(solo.secret.size, id).toBe(1);
      expect(duo.quests.length, id).toBe(solo.quests.length + 1);
    }
    const finale = levelSetup(levelById('grand-finale'), QUESTS, TRIGGERS, TOURIST_SPAWNS).quests.find((q) => q.id === 'finale')!;
    expect(finale.requires).toBeUndefined();
    expect(finale.startOn).toEqual(['finaleStart']);
  });
  it('set up their situations', () => {
    expect(levelById('the-rival').kalle?.goal).toBe(3);
    expect(levelById('the-rival').extraProps!.length).toBeGreaterThanOrEqual(6); // plenty of free snacks
    expect(levelById('night-market').night).toBe(true);
    expect(levelById('night-market').sleepingVendors).toBe(true);
    expect(levelById('the-drone').drone).toBeTruthy();
    expect(levelById('grand-finale').deploy).toEqual(['vendors', 'lines', 'nets', 'warden']);
    expect(levelById('grand-finale').endingNote).toMatch(/mascot/);
  });
});

describe('sleeping vendors', () => {
  const gull = { x: 0, y: 6, z: 20, diving: false };
  it('ignore a gull flying past, wake at a loud noise nearby or a gull right beside them, and doze off again', () => {
    const v = newVendor(1, 0, 0, Math.PI);
    v.sleepy = true;
    v.mode = 'asleep';
    const w = new World();
    for (let i = 0; i < 120; i++) stepVendor(v, { ...gull, z: 5, y: 2 }, true, DT, w);
    expect(v.mode).toBe('asleep'); // a gull a few metres off does not wake him
    const ev = stepVendor(v, gull, true, DT, w, [{ x: 4, z: 0, loud: 1 }]);
    expect(ev.some((e) => e.type === 'woke')).toBe(true);
    expect(v.mode).toBe('idle');
    for (let i = 0; i < 60 * 12; i++) stepVendor(v, gull, true, DT, w);
    expect(v.mode).toBe('asleep'); // quiet: back to sleep
    const near = stepVendor(v, { x: 1, y: 1, z: 1, diving: false }, true, DT, w);
    expect(near.some((e) => e.type === 'woke')).toBe(true);
  });
  it('a soft noise does not wake them', () => {
    const v = newVendor(1, 0, 0, Math.PI);
    v.mode = 'asleep';
    const ev = stepVendor(v, gull, true, DT, new World(), [{ x: 3, z: 0, loud: 0.2 }]);
    expect(ev.length).toBe(0);
    expect(v.mode).toBe('asleep');
  });
});

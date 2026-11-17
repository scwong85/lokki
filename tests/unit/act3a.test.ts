import { describe, expect, it } from 'vitest';
import { LEVELS, levelById } from '../../src/data/levels';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { PROPS } from '../../src/data/props';
import { skillById } from '../../src/data/skills';

const ids = ['vappu-eve', 'herring-market', 'wedding-bells', 'frozen-harbour'];

describe('Act 3, themed days (part 1)', () => {
  it('follow level 14 in order, each unlocked by the one before, with a real reward', () => {
    expect(LEVELS.filter((l) => l.arc === undefined).map((l) => l.id).slice(14, 18)).toEqual(ids);
    ids.forEach((id, i) => {
      const l = levelById(id);
      expect(l.requires).toBe(i === 0 ? 'thermal-express' : ids[i - 1]);
      expect(skillById(l.reward!)).toBeTruthy();
    });
  });
  it('build from data: 1-4 main to-dos (a chain is one), one hidden, a co-op twist, every quest and trigger resolves', () => {
    for (const id of ids) {
      const l = levelById(id);
      const solo = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS);
      const duo = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS, true);
      expect(solo.main.length, id).toBeGreaterThanOrEqual(1);
      expect(solo.main.length, id).toBeLessThanOrEqual(4);
      expect(solo.secret.size, id).toBe(1);
      expect(duo.quests.length, id).toBe(solo.quests.length + 1);
    }
  });
  it('the themed days set up their situation', () => {
    expect(levelById('frozen-harbour').winter).toBe(true);
    expect(levelById('vappu-eve').deploy).toEqual(['warden']);
    expect(levelById('vappu-eve').wardenLunch?.repeat).toBeGreaterThan(60);
    expect(levelById('vappu-eve').extraProps!.filter((p) => p.type === 'balloon').length).toBe(7);
    expect(levelById('herring-market').extraProps!.filter((p) => p.type === 'soup').length).toBeGreaterThanOrEqual(2); // the stall's goods
    expect(levelById('wedding-bells').extraProps!.filter((p) => p.type === 'flowers').length).toBe(2);
    expect(levelById('frozen-harbour').extraProps!.filter((p) => p.tag === 'munkki').length).toBe(2);
  });
  it('balloons float and ring boxes are shiny', () => {
    expect(PROPS.balloon.floats).toBe(true);
    expect(PROPS.balloon.mass).toBeLessThan(0.2);
    expect(PROPS.ring.tags).toContain('shiny');
  });
});

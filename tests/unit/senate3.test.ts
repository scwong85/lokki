import { describe, expect, it } from 'vitest';
import { LEVELS, CONCERT_NIGHT, CHRISTMAS_MARKET, LIBRARY_RULE, KEY_TO_THE_CITY, levelById } from '../../src/data/levels';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';

describe('levels S7-S10', () => {
  it('chain after S6 and end the district', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(ids.slice(ids.indexOf('new-look'), ids.indexOf('new-look') + 5)).toEqual(['new-look', 'concert-night', 'christmas-market', 'library-rule', 'key-to-the-city']);
    for (const l of [CONCERT_NIGHT, CHRISTMAS_MARKET, LIBRARY_RULE, KEY_TO_THE_CITY]) {
      expect(l.district).toBe('senaatintori');
      expect(levelById(l.id)).toBe(l);
      const s = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS);
      expect(s.main.length + s.secret.size).toBeLessThanOrEqual(4);
      expect(s.secret.size).toBe(1);
    }
  });
  it('use the new level mechanics', () => {
    expect(CONCERT_NIGHT.quietBreaks!.every).toBeGreaterThan(CONCERT_NIGHT.quietBreaks!.duration);
    expect(CONCERT_NIGHT.skills).toContain('mimic');
    expect(CHRISTMAS_MARKET.winter).toBe(true);
    expect(LIBRARY_RULE.quiet!.r).toBeGreaterThan(5);
    expect(KEY_TO_THE_CITY.tram && KEY_TO_THE_CITY.pigeons && KEY_TO_THE_CITY.bells).toBeTruthy();
  });
});

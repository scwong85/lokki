import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { ARCS, STAGES_PER_ARC, previousStage, stageId, stagesOf, playgroundOf } from '../../src/data/arcs';
import { levelSetup, levelUnlocked, levelProgress, mergeRecord, blankRecord } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { introducedAt, isUnlocked } from '../../src/gameplay/mechanics';
import { orderLevels, levelGroup } from '../../src/ui/menus';

const setup = (id: string, coop = false) => levelSetup(LEVELS.find((l) => l.id === id)!, QUESTS, TRIGGERS, TOURIST_SPAWNS, coop);

describe('arcs and stages', () => {
  it('four arcs of five stages', () => {
    expect(ARCS.length).toBe(4);
    expect(STAGES_PER_ARC).toBe(5);
    expect(stageId(1, 3)).toBe('a1s3');
  });
  it('a stage is opened by the one before; an act opens after the finale of the act before', () => {
    expect(previousStage(1, 1)).toBeNull();
    expect(previousStage(1, 4)).toEqual({ arc: 1, stage: 3 });
    expect(previousStage(2, 1)).toEqual({ arc: 1, stage: 5 });
  });
  it('stages come first in the list, then the Playground', () => {
    const ids = LEVELS.map((l) => l.id);
    const staged = stagesOf(LEVELS);
    expect(staged.length).toBeGreaterThan(0);
    expect(ids.slice(0, staged.length)).toEqual(staged.map((l) => l.id));
    expect(playgroundOf(LEVELS).length + staged.length).toBe(LEVELS.length);
  });
  it('stage 1 is open at the start and the next stage waits for it', () => {
    const first = LEVELS.find((l) => l.id === 'a1s1')!;
    expect(levelUnlocked(first, {})).toBe(true);
    const second = { ...first, id: 'a1s2', requires: 'a1s1' };
    expect(levelUnlocked(second, {})).toBe(false);
    expect(levelUnlocked(second, { a1s1: mergeRecord(blankRecord(), [true, false, false], 100) })).toBe(true);
  });
  it('stage 1 has only flying, snatching and carrying', () => {
    expect(introducedAt({ arc: 1, stage: 1 })).toEqual([]);
    expect(isUnlocked('poop', { arc: 1, stage: 1 })).toBe(false);
  });
  it('solo play skips the co-op objectives; two gulls must finish them too', () => {
    const solo = setup('a1s1');
    const duo = setup('a1s1', true);
    expect(solo.main).toEqual(['map', 'breakfast', 'neighbours']);
    expect(duo.main).toEqual(['map', 'breakfast', 'neighbours', 'handoverCoop', 'twoBirds']);
    const won = (ids: string[]) => ids.map((id) => ({ id, status: 'won' }));
    const def = LEVELS.find((l) => l.id === 'a1s1')!;
    expect(levelProgress(def, duo, won(['map', 'breakfast', 'neighbours'])).cleared).toBe(false);
    expect(levelProgress(def, duo, won(duo.main)).cleared).toBe(true);
    expect(levelProgress(def, solo, won(solo.main)).cleared).toBe(true);
  });
  it('every chain objective names a trigger or event source that exists', () => {
    const s = setup('a1s1', true);
    const have = new Set(s.triggers.map((t) => ('event' in t ? t.event : '')));
    expect(have.has('feast') && have.has('quayLand') && have.has('bunFerry')).toBe(true);
  });
  it('the level list groups stages under their act and the rest under the Playground', () => {
    const rows = orderLevels([
      { id: 'x', name: 'x', blurb: '', stars: 0, current: false, district: 'kauppatori' },
      { id: 'a1s2', name: 'b', blurb: '', stars: 0, current: false, arc: 1, stage: 2 },
      { id: 'a1s1', name: 'a', blurb: '', stars: 0, current: false, arc: 1, stage: 1 },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['a1s1', 'a1s2', 'x']);
    expect(levelGroup(rows[0])).toContain('Act 1');
    expect(levelGroup(rows[2])).toContain('Playground');
  });
});

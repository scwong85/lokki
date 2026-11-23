import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { levelSetup } from '../../src/gameplay/level';
import { QuestLog } from '../../src/gameplay/quest';
import { ResumeStore, applyResume, captureResume, resumeSummary, worthResuming } from '../../src/gameplay/resume';
import { Flyover } from '../../src/gameplay/flyover';
import { playtestReport } from '../../src/gameplay/report';

const memStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe('resume a stage (M121)', () => {
  const setup = levelSetup(LEVELS.find((l) => l.id === 'a1s1')!, QUESTS, TRIGGERS, TOURIST_SPAWNS, false);
  it('saves the steps and the things on the roof, and puts them back into a fresh quest log', () => {
    const log = new QuestLog(setup.quests);
    log.onEvent('picnic:cone');
    log.onEvent('picnic:lunch');
    const d = captureResume('a1s1', log.quests, ['selfieCone', 'dockLunch'], [1], 1000);
    expect(worthResuming(d)).toBe(true);
    expect(resumeSummary(d)).toBe('2 things on the roof');
    const fresh = new QuestLog(setup.quests);
    applyResume(fresh.quests, d);
    const p = fresh.quests.find((q) => q.id === 'picnic')!;
    expect(p.objectives.filter((o) => o.done).map((o) => o.id)).toEqual(['cone', 'lunch']);
    // and play goes on from there: the second course is open
    fresh.onEvent('picnic:thermos');
    expect(p.objectives.find((o) => o.id === 'thermos')!.done).toBe(true);
  });
  it('the store keeps one run, for its level, and forgets it when cleared or when nothing was done', () => {
    const s = new ResumeStore(memStore());
    const log = new QuestLog(setup.quests);
    expect(s.load('a1s1')).toBeNull();
    s.save(captureResume('a1s1', log.quests, [], []));
    expect(s.load('a1s1')).toBeNull(); // nothing done yet
    log.onEvent('picnic:cone');
    s.save(captureResume('a1s1', log.quests, ['selfieCone'], []));
    expect(s.load('a1s1')!.rows).toEqual(['selfieCone']);
    expect(s.load('a1s2')).toBeNull();
    s.clear();
    expect(s.load('a1s1')).toBeNull();
    expect(new ResumeStore(null).load('a1s1')).toBeNull();
  });
});

describe('the flyover (M121)', () => {
  it('shows each spot in turn from above, then ends; a skip ends it at once', () => {
    const f = new Flyover();
    f.start([{ x: 10, z: 0 }, { x: -10, z: 0 }], 2, 20, 15);
    expect(f.active).toBe(true);
    expect(f.shot()!.look).toMatchObject({ x: 10, z: 0 });
    expect(f.shot()!.pos.y).toBe(20);
    f.update(2.1);
    expect(f.shot()!.look).toMatchObject({ x: -10, z: 0 });
    f.update(2);
    expect(f.active).toBe(false);
    expect(f.shot()).toBeNull();
    f.start([{ x: 1, z: 1 }], 2, 20, 15);
    f.skip();
    expect(f.active).toBe(false);
  });
});

describe('the playtest report (M121)', () => {
  it('says the stage, the time, the rows, where the player was stuck, misses, setbacks and help used', () => {
    const text = playtestReport({
      level: 'a1s3', name: '1.3 Market Day Heist', date: '2026-11-23', seconds: 754, cleared: false, rows: { done: 4, total: 6 },
      rowLines: ['Time per row (in the order you did them):', 'Something cold (the Peekers): 2:10, +2:10'],
      tally: { nearMiss: 3, 'nearMiss:body': 2, snatch: 4, 'setback:whistle': 1, compass: 2, flyBack: 1 },
      longestStuck: { seconds: 190, x: -96.4, z: -62.2 },
      options: { easy: false, hints: 'ladder', device: 'keyboard and mouse' },
    });
    expect(text).toContain('1.3 Market Day Heist (a1s3)');
    expect(text).toContain('Played 12:34 · not cleared · rows 4/6');
    expect(text).toContain('Something cold (the Peekers): 2:10');
    expect(text).toContain('Longest without finding or serving a row: 3:10 (around x -96, z -62)');
    expect(text).toContain('Dives that missed a held item: 5 (body in the way 2) · snatches 4');
    expect(text).toContain('Guard took it back 1');
    expect(text).toContain('compass 2');
  });
});

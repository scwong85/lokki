import { describe, expect, it } from 'vitest';
import { LEVELS, SANDBOX, SNACK_STUB, levelById } from '../../src/data/levels';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { levelProgress, levelSetup, levelStars, mergeRecord, starCount } from '../../src/gameplay/level';
import { sanitize } from '../../src/core/save';
import { QuestLog } from '../../src/gameplay/quest';

const build = (id: string) => levelSetup(levelById(id), QUESTS, TRIGGERS, TOURIST_SPAWNS);

describe('level definitions', () => {
  it('every level builds: known quests and triggers, unique ids', () => {
    for (const l of LEVELS) {
      const s = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS);
      expect(new Set(s.quests.map((q) => q.id)).size).toBe(s.quests.length);
      expect(s.main.length + s.secret.size).toBe(s.quests.length);
      for (const id of s.secret) expect(s.quests.some((q) => q.id === id)).toBe(true);
      if (!l.sandbox) {
        expect(l.parTime).toBeGreaterThan(0);
        expect(s.main.length).toBeGreaterThanOrEqual(1);
        expect(s.main.length + s.secret.size).toBeLessThanOrEqual(4); // about 5 minutes
      }
    }
    expect(levelById('nope')).toBe(SANDBOX);
  });

  it('the sandbox is today\'s full game; the stub picks a small cast and a calm city', () => {
    const sb = build('sandbox');
    expect(sb.quests.map((q) => q.id)).toEqual(QUESTS.map((q) => q.id));
    expect(sb.tourists).toHaveLength(TOURIST_SPAWNS.length);
    expect(sb.defense).toBe(true);
    const st = build(SNACK_STUB.id);
    expect(st.defense).toBe(false);
    expect(st.tourists.every((t) => !t.role)).toBe(true);
    expect(st.triggers.map((t) => t.id)).toEqual(['statuePerch']);
  });

  it('unknown ids in a level fail loudly', () => {
    expect(() => levelSetup({ ...SNACK_STUB, quests: ['nope'] }, QUESTS, TRIGGERS, TOURIST_SPAWNS)).toThrow(/unknown quest/);
  });
});

describe('clearing and stars', () => {
  it('clears on the main to-dos; the secret one adds the second star; par time the third', () => {
    const s = build(SNACK_STUB.id);
    const q = new QuestLog(s.quests);
    const st = () => q.quests.map((x) => ({ id: x.id, status: x.status }));
    expect(levelProgress(SNACK_STUB, s, st()).cleared).toBe(false);
    for (const x of q.quests) if (s.main.includes(x.id)) x.status = 'won';
    const p = levelProgress(SNACK_STUB, s, st());
    expect(p).toEqual({ cleared: true, allDone: false });
    expect(levelStars(SNACK_STUB, p, 100)).toEqual([true, false, true]);
    expect(levelStars(SNACK_STUB, p, 999)).toEqual([true, false, false]);
    q.quests.find((x) => x.id === 'firstSplat')!.status = 'won';
    expect(levelProgress(SNACK_STUB, s, st()).allDone).toBe(true);
    expect(levelProgress(SANDBOX, build('sandbox'), st()).cleared).toBe(false); // free play never "clears"
  });

  it('records keep the best stars and time', () => {
    let r = mergeRecord(undefined, [true, false, false], 200);
    r = mergeRecord(r, [true, true, false], 260);
    expect(r).toEqual({ stars: [true, true, false], best: 200, clears: 2 });
    r = mergeRecord(r, [false, false, false], 50);
    expect(r.best).toBe(200);
    expect(starCount(r)).toBe(2);
  });

  it('per-level saves are sanitised', () => {
    const d = sanitize({ levels: { 'snack-stub': { stars: [true, 'x', true], best: -1, clears: 2.9 }, junk: 5 }, level: 'snack-stub' });
    expect(d.levels).toEqual({ 'snack-stub': { stars: [true, false, true], best: null, clears: 2 } });
    expect(d.level).toBe('snack-stub');
    expect(sanitize({}).levels).toEqual({});
  });
});

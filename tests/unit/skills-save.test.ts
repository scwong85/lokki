import { afterEach, describe, expect, it } from 'vitest';
import { mods, resetMods, staminaMax } from '../../src/core/skillMods';
import { SKILLS, skillForQuest } from '../../src/data/skills';
import { QUESTS } from '../../src/data/quests';
import { SkillSet } from '../../src/gameplay/skills';
import { SaveStore, blankSave, sanitize, type StorageLike } from '../../src/core/save';
import { Abilities, aheadOf } from '../../src/gameplay/abilities';
import { RunTimer, formatClock, isBest } from '../../src/gameplay/runTimer';
import { flockPosition } from '../../src/render/flock';
import { QuestLog } from '../../src/gameplay/quest';
import { tuning } from '../../src/core/tuning';

afterEach(() => resetMods());

const fakeStorage = (): StorageLike & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
};

describe('skills', () => {
  it('every skill maps to one real quest and vice versa', () => {
    const ids = new Set(QUESTS.map((q) => q.id));
    for (const s of SKILLS) {
      expect(ids.has(s.quest)).toBe(true);
      expect(skillForQuest(s.quest)?.id).toBe(s.id);
    }
    expect(new Set(SKILLS.map((s) => s.quest)).size).toBe(SKILLS.length);
  });

  it('unlocks once and applies multipliers; clear resets', () => {
    const set = new SkillSet();
    expect(set.unlockForQuest('icecream')?.id).toBe('flight');
    expect(set.unlockForQuest('icecream')).toBeNull();
    expect(mods.flapImpulse).toBeGreaterThan(1);
    expect(staminaMax()).toBeGreaterThan(tuning.flight.staminaMax.value);
    set.clear();
    expect(mods.flapImpulse).toBe(1);
    expect(staminaMax()).toBe(tuning.flight.staminaMax.value);
  });

  it('restore ignores unknown ids and stacks nothing twice', () => {
    const set = new SkillSet();
    set.restore(['fatbird', 'nope']);
    expect(set.ids).toEqual(['fatbird']);
    set.restore(['fatbird']);
    expect(mods.carryMax).toBe(5);
  });
});

describe('save', () => {
  it('sanitize drops junk', () => {
    expect(sanitize(null)).toEqual(blankSave());
    const d = sanitize({ skills: ['flight', 'bogus', 7], questsWon: ['a', 1], extrasOn: true, bestTime: -3, speedrunBest: 90, clears: 2.7, muted: true });
    expect(d.skills).toEqual(['flight']);
    expect(d.questsWon).toEqual(['a']);
    expect(d.extrasOn).toBe(false); // needs replayUnlocked
    expect(d.bestTime).toBeNull();
    expect(d.speedrunBest).toBe(90);
    expect(d.clears).toBe(2);
    expect(d.muted).toBe(true);
  });

  it('round-trips, survives corrupt text, and clear works', () => {
    const st = fakeStorage();
    const store = new SaveStore(st);
    const d = { ...blankSave(), skills: ['mimic'], replayUnlocked: true, extrasOn: true };
    expect(store.save(d)).toBe(true);
    expect(store.load()).toEqual(d);
    st.map.set('lokki-save-v1', '{not json');
    expect(store.load()).toEqual(blankSave());
    store.save(d);
    store.clear();
    expect(store.load()).toEqual(blankSave());
  });

  it('never throws when storage is missing or throws', () => {
    const none = new SaveStore(null);
    expect(none.available).toBe(false);
    expect(none.save(blankSave())).toBe(false);
    expect(none.load()).toEqual(blankSave());
    const boom: StorageLike = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    const s = new SaveStore(boom);
    expect(s.save(blankSave())).toBe(false);
    expect(s.load()).toEqual(blankSave());
    expect(() => s.clear()).not.toThrow();
  });
});

describe('quest flags and restore', () => {
  it('bonus quest is locked until the replay flag, restoreWon is silent', () => {
    const q = new QuestLog(QUESTS);
    const bonus = () => q.quests.find((x) => x.id === 'bonus')!;
    expect(bonus().status).toBe('locked');
    q.setFlag('replay', true);
    expect(bonus().status).not.toBe('locked');
    q.setFlag('replay', false);
    expect(bonus().status).toBe('locked');
    const q2 = new QuestLog(QUESTS);
    q2.restoreWon(['icecream', 'swap']);
    expect(q2.wonIds()).toEqual(expect.arrayContaining(['icecream', 'swap']));
    expect(q2.quests.find((x) => x.id === 'finale')!.status).not.toBe('won');
  });
});

describe('abilities', () => {
  it('cooldown, disguise timer and fraction', () => {
    const a = new Abilities();
    expect(a.use('mimic')).toBe(true);
    expect(a.use('mimic')).toBe(false);
    expect(a.fraction('mimic')).toBe(0);
    a.tick(tuning.skills.mimicCooldown.value + 0.1);
    expect(a.ready('mimic')).toBe(true);
    expect(a.use('disguise')).toBe(true);
    expect(a.disguised).toBe(true);
    let ended = false;
    for (let i = 0; i < 20 * 60 && !ended; i++) ended = a.tick(1 / 60);
    expect(ended).toBe(true);
    expect(a.disguised).toBe(false);
    expect(a.ready('disguise')).toBe(false); // cooldown still running
    a.reset();
    expect(a.ready('disguise')).toBe(true);
  });

  it('aheadOf follows the heading convention (yaw 0 = north = -Z)', () => {
    const p = aheadOf({ x: 1, z: 2 }, 0, 10);
    expect(p.x).toBeCloseTo(1);
    expect(p.z).toBeCloseTo(-8);
  });
});

describe('run timer', () => {
  it('only runs in a started speedrun and reports the time once', () => {
    const t = new RunTimer();
    t.begin();
    t.tick(5);
    expect(t.time).toBe(0);
    expect(t.finish()).toBeNull();
    t.startSpeedrun();
    t.tick(5);
    expect(t.time).toBe(0); // waits for the first move
    t.begin();
    t.tick(12.5);
    expect(t.finish()).toBe(12.5);
    expect(t.finish()).toBeNull();
    t.begin();
    expect(t.running).toBe(false);
  });

  it('best and clock formatting', () => {
    expect(isBest(50, null)).toBe(true);
    expect(isBest(50, 60)).toBe(true);
    expect(isBest(70, 60)).toBe(false);
    expect(formatClock(65.34)).toBe('1:05.3');
    expect(formatClock(-1)).toBe('0:00.0');
  });
});

describe('flock', () => {
  it('starts at the caller and ends circling the target', () => {
    const from = { x: 0, y: 5, z: 0 };
    const target = { x: 30, z: -30 };
    const a = flockPosition(0, 4, 0, from, target);
    expect(a).toEqual(from);
    const b = flockPosition(1, 4, 3, from, target);
    expect(Math.hypot(b.x - target.x, b.z - target.z)).toBeLessThan(9);
  });
});

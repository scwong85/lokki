import { describe, expect, it } from 'vitest';
import { HintLadder, ladderSteps, stepKey } from '../../src/gameplay/hintLadder';
import { activeMarkers } from '../../src/gameplay/questMarkers';
import { LEVELS } from '../../src/data/levels';
import { tuning } from '../../src/core/tuning';
import type { QuestDef } from '../../src/data/quests';
import type { QuestState } from '../../src/gameplay/quest';

const def: QuestDef = {
  id: 'q', title: 'Q', timed: false, chain: true,
  objectives: [
    { id: 'a', text: 'Do A (E)', outcome: 'A should happen.', nudge: 'Think about A.', hint: 'Press E on A.', kind: 'event', event: 'a', markers: [{ x: 1, z: 1, r: 2 }] },
    { id: 'b', text: 'Do B', kind: 'event', event: 'b', after: 'a', hint: 'B is easy.', markers: [{ x: 2, z: 2, r: 2 }] },
  ],
};
const st = (aDone: boolean): QuestState[] => [{ id: 'q', title: 'Q', status: 'active', timed: false, timeLeft: 0, objectives: [{ id: 'a', done: aDone, count: 0, progress: 0 }, { id: 'b', done: false, count: 0, progress: 0 }] } as unknown as QuestState];

describe('hint ladder', () => {
  it('starts at the outcome, climbs with waiting, and each step has its own clock', () => {
    const l = new HintLadder();
    const k = stepKey('q', 'a');
    expect(l.rung(k)).toBe(0);
    l.tick(tuning.hints.nudgeAfter.value + 1, [k]);
    expect(l.rung(k)).toBe(1);
    l.tick(tuning.hints.cueAfter.value, [k]);
    expect(l.rung(k)).toBe(2);
    l.tick(tuning.hints.hintAfter.value, [k]);
    expect(l.rung(k)).toBe(3);
    expect(l.rung(stepKey('q', 'other'))).toBe(0);
  });
  it('asking gives the next rung at once, up to the full hint; reset forgets', () => {
    const l = new HintLadder();
    const k = stepKey('q', 'a');
    expect([l.ask([k]), l.ask([k]), l.ask([k]), l.ask([k])]).toEqual([1, 2, 3, 3]);
    l.reset();
    expect(l.rung(k)).toBe(0);
  });
  it('modes: all at once shows everything; "only when I ask" ignores the clock', () => {
    const l = new HintLadder();
    const k = stepKey('q', 'a');
    l.mode = 'full';
    expect(l.rung(k)).toBe(3);
    l.mode = 'asked';
    l.tick(9999, [k]);
    expect(l.rung(k)).toBe(0);
    l.ask([k]);
    expect(l.rung(k)).toBe(1);
  });
  it('only the first open ladder step counts as being worked on', () => {
    expect(ladderSteps([def], st(false))).toEqual(['q:a']);
    expect(ladderSteps([def], st(true))).toEqual([]); // step b has no nudge: it is not on the ladder
  });
  it('a ladder step keeps its map marker back until rung 2; steps without a nudge show theirs as before', () => {
    expect(activeMarkers([def], st(false), false, () => 0)).toEqual([]);
    expect(activeMarkers([def], st(false), false, () => 1)).toEqual([]);
    expect(activeMarkers([def], st(false), false, () => 2)).toHaveLength(1);
    expect(activeMarkers([def], st(false))).toHaveLength(1); // no ladder info: unchanged
    expect(activeMarkers([def], st(true), false, () => 0)).toHaveLength(1);
  });
});

describe('ladder steps in the levels', () => {
  const all = LEVELS.flatMap((l) => (l.extraQuests ?? []).flatMap((q) => q.objectives.map((o) => ({ level: l.id, q: q.id, o }))));
  const ladder = all.filter((x) => x.o.nudge);
  it('the trial chains are on the ladder (Map and Cone, Wet Floor, Jukebox Hero in stage 1.4)', () => {
    const stage = LEVELS.find((l) => l.id === 'mood-swings-v1')!;
    for (const id of ['mapcone', 'wetfloor', 'jukechain']) {
      const steps = stage.extraQuests!.find((q) => q.id === id)!.objectives.filter((o) => o.kind === 'event');
      expect(steps.every((o) => o.nudge && o.outcome), id).toBe(true);
    }
    expect(ladder.length).toBeGreaterThanOrEqual(10);
  });
  it('an outcome and a nudge give the wish and a riddle, never the method: no keys, no "hold", no "press", no "aim"', () => {
    for (const { level, q, o } of ladder) {
      for (const s of [o.outcome!, o.nudge!]) {
        expect(s, `${level}/${q}/${o.id}`).not.toMatch(/\((E|F|T|Q|V|H|Shift|Space)\)|\b(press|hold|aim|tap|key)\b/i);
      }
      expect(o.hint, `${level}/${q}/${o.id} keeps its full hint as the last rung`).toBeTruthy();
    }
  });
});

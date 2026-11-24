import { describe, expect, it } from 'vitest';
import { QuestLog } from '../../src/gameplay/quest';
import type { QuestDef } from '../../src/data/quests';

const defs: QuestDef[] = [
  { id: 'first', title: 'First', teaser: '', timed: false, objectives: [{ id: 'a', text: 'a', kind: 'event', event: 'grab:x' }] },
  {
    id: 'boss', title: 'Boss', teaser: '', timed: false, requires: ['first'],
    objectives: [
      { id: 'lunch', text: 'lunch', kind: 'event', event: 'wardenLunch', latch: true },
      { id: 'sandwich', text: 'sandwich', kind: 'event', event: 'grab:wardenSandwich', latch: true, after: 'lunch' },
      { id: 'hunt', text: 'hunt', kind: 'event', event: 'wardenHunt', after: 'sandwich' },
    ],
  },
] as unknown as QuestDef[];

describe('latch steps (M125)', () => {
  it('count events that happened while the quest was locked, then move on', () => {
    const log = new QuestLog(defs);
    log.onEvent('wardenLunch');
    log.onEvent('grab:wardenSandwich');
    log.onEvent('grab:x'); // unlocks the boss
    const boss = log.quests.find((q) => q.id === 'boss')!;
    expect(boss.status).toBe('active');
    expect(boss.objectives.map((o) => o.done)).toEqual([true, true, false]);
  });
  it('never latches a step without the flag', () => {
    const log = new QuestLog(defs);
    log.onEvent('wardenHunt');
    log.onEvent('grab:x');
    expect(log.quests.find((q) => q.id === 'boss')!.objectives[2].done).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { TriggerSystem } from '../../src/gameplay/triggers';
import { QuestLog } from '../../src/gameplay/quest';

const ctx = (crowd: number) => ({
  props: [{ type: 'scissors' as const, tag: 's', x: 0, y: 0.1, z: 0, free: true }],
  gull: { x: 0, y: 5, z: 20, grounded: false },
  carried: null,
  npcs: Array.from({ length: crowd }, () => ({ role: 'guest', x: 1, z: 1 })),
  isLand: () => true,
});

describe('triggers that depend on another one', () => {
  const crowd = { id: 'crowd', kind: 'npcsInZone' as const, event: 'crowd', role: 'guest', zone: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, count: 2 };
  const cut = { id: 'cut', kind: 'propInZone' as const, event: 'cut', propType: 'scissors' as const, tag: 's', zone: { minX: -3, maxX: 3, minZ: -3, maxZ: 3, maxY: 2 }, needs: 'crowd' };
  it('`needs`: nothing until the other has fired; once it has, it stays enough', () => {
    const s = new TriggerSystem([crowd, cut]);
    expect(s.update(ctx(0), new Set(['crowd', 'cut']))).toEqual([]);
    expect(s.update(ctx(2), new Set(['crowd', 'cut']))).toEqual(['crowd', 'cut']);
    const t = new TriggerSystem([crowd, cut]);
    t.update(ctx(2), new Set(['crowd']));
    expect(t.update(ctx(0), new Set(['cut']))).toEqual(['cut']);
  });
  it('`unless` and `always`: a one-off nudge that fires without a step wanting it, and not after the other', () => {
    const dry = { ...cut, id: 'dry', event: 'dry', needs: undefined, unless: 'crowd', always: true };
    const t = new TriggerSystem([crowd, dry]);
    expect(t.update(ctx(0), new Set())).toEqual(['dry']);
    expect(t.update(ctx(0), new Set())).toEqual([]);
    const u = new TriggerSystem([crowd, dry]);
    u.update(ctx(2), new Set(['crowd']));
    expect(u.update(ctx(0), new Set())).toEqual([]);
  });
});

describe('the Grand Opening chain', () => {
  it('the photo and the cut in any order; the Mayor cone only counts after the cut (his scissors snatched earlier do not)', () => {
    const l = LEVELS.find((x) => x.id === 'grand-opening')!;
    const log = new QuestLog(l.extraQuests!);
    log.onEvent('robbed:mayor'); // the scissors, snatched from him before the ribbon
    expect(log.quests[0].objectives.find((o) => o.id === 'cone')!.done).toBe(false);
    log.onEvent('ribbonCut');
    log.onEvent('photobomb');
    log.onEvent('robbed:mayor');
    expect(log.quests[0].status).toBe('won');
  });
});

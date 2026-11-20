import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { TriggerSystem } from '../../src/gameplay/triggers';
import { QuestLog } from '../../src/gameplay/quest';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TOURIST_SPAWNS } from '../../src/data/npcs';

const ids = ['grand-opening', 'fire-drill'];

describe.each(ids)('%s', (id) => {
  const l = LEVELS.find((x) => x.id === id)!;
  const q = l.extraQuests![0];
  it('is a long chain with a wish, a riddle and an answer for every step, and no method in the wish or the riddle', () => {
    expect(q.objectives.length).toBeGreaterThanOrEqual(6);
    for (const o of q.objectives) {
      expect(o.outcome && o.nudge && o.hint, `${id}/${o.id}`).toBeTruthy();
      for (const s of [o.outcome!, o.nudge!]) expect(s, `${id}/${o.id}`).not.toMatch(/\((E|F|T|Q)\)|\b(press|hold|aim|peck the)\b/i);
    }
  });
  it('has name tags on every guard and recognisable scenery, and builds into a level setup', () => {
    const named = (l.extraTourists ?? []).filter((t) => t.watch || t.name);
    expect(named.length).toBeGreaterThanOrEqual(2);
    expect(named.every((t) => t.name)).toBe(true);
    expect((l.decor ?? []).length).toBeGreaterThanOrEqual(2);
    const s = levelSetup(l, QUESTS, [], TOURIST_SPAWNS);
    expect(s.quests.map((x) => x.id)).toHaveLength(1);
    expect(l.start!.z).toBeGreaterThan(-9); // starts on the paving by the quay, not in the water (z > -5) or inside the tents
    expect(l.start!.z).toBeLessThan(-5);
  });
  it('every step has an event that something can actually fire (trigger, switch, reaction, or a game event)', () => {
    const trig = new Set((l.extraTriggers ?? []).flatMap((t) => ('event' in t ? [t.event] : t.events)));
    for (const o of q.objectives.filter((x) => x.kind === 'event')) {
      for (const ev of [o.event!, ...(o.events ?? [])]) {
        const known = trig.has(ev) || /^(grab|slipped|soaked|distract|dancing|dancers|caught|gotcha|pecked):/.test(ev);
        expect(known, `${id}/${o.id}: ${ev}`).toBe(true);
      }
    }
  });
});

describe('the trigger that needs a crowd first (the ribbon)', () => {
  const sys = () => new TriggerSystem([
    { id: 'crowd', kind: 'npcsInZone', event: 'crowd', role: 'guest', zone: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, count: 2 },
    { id: 'cut', kind: 'propInZone', event: 'cut', propType: 'scissors', tag: 's', zone: { minX: -3, maxX: 3, minZ: -3, maxZ: 3, maxY: 2 }, needs: 'crowd' },
  ]);
  const ctx = (crowd: number) => ({
    props: [{ type: 'scissors' as const, tag: 's', x: 0, y: 0.1, z: 0, free: true }],
    gull: { x: 0, y: 5, z: 20, grounded: false },
    carried: null,
    npcs: Array.from({ length: crowd }, () => ({ role: 'guest', x: 1, z: 1 })),
    isLand: () => true,
  });
  const want = new Set(['crowd', 'cut']);
  it('scissors on the ribbon alone do nothing; with the crowd there they cut it (and a crowd that has left does not matter)', () => {
    const s = sys();
    expect(s.update(ctx(0), want)).toEqual([]);
    expect(s.update(ctx(2), want)).toEqual(['crowd', 'cut']);
    const t = sys();
    t.update(ctx(2), new Set(['crowd']));
    expect(t.update(ctx(0), new Set(['cut']))).toEqual(['cut']); // the crowd came once: enough
  });
  it('the scissors on the ribbon with no crowd give a one-off nudge instead (a trigger that fires without a step wanting it)', () => {
    const t = new TriggerSystem([
      { id: 'crowd', kind: 'npcsInZone', event: 'crowd', role: 'guest', zone: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, count: 2 },
      { id: 'dry', kind: 'propInZone', event: 'dry', propType: 'scissors', tag: 's', zone: { minX: -3, maxX: 3, minZ: -3, maxZ: 3, maxY: 2 }, unless: 'crowd', always: true },
    ]);
    expect(t.update(ctx(0), new Set())).toEqual(['dry']); // nobody wants it, it fires all the same
    expect(t.update(ctx(0), new Set())).toEqual([]); // once
    const u = new TriggerSystem([
      { id: 'crowd', kind: 'npcsInZone', event: 'crowd', role: 'guest', zone: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, count: 2 },
      { id: 'dry', kind: 'propInZone', event: 'dry', propType: 'scissors', tag: 's', zone: { minX: -3, maxX: 3, minZ: -3, maxZ: 3, maxY: 2 }, unless: 'crowd', always: true },
    ]);
    u.update(ctx(2), new Set(['crowd']));
    expect(u.update(ctx(0), new Set())).toEqual([]); // the crowd has been: no nudge
  });
  it('the quest steps in order: crowd and scissors in any order, then the cut', () => {
    const l = LEVELS.find((x) => x.id === 'grand-opening')!;
    const log = new QuestLog(l.extraQuests!);
    log.onEvent('ribbonCut');
    expect(log.quests[0].objectives.find((o) => o.id === 'cut')!.done).toBe(false);
    log.onEvent('crowdAtKiosk');
    log.onEvent('grab:scissors');
    log.onEvent('ribbonCut');
    expect(log.quests[0].objectives.filter((o) => o.done).map((o) => o.id)).toEqual(['crowd', 'scissors', 'cut']);
  });
});

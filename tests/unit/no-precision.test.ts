import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';

/** Landing on a statue head, a bell tower, a moving tram roof or Kalle's perch, and dropping things on exact statue spots, were removed (playtest: they did not work). */
const GONE = ['emperorHead', 'bellRung', 'tramRide', 'tramBoard', 'kallePerch', 'sunscreenNose', 'outfitHat', 'outfitGlasses', 'outfitFlowers', 'outfitScarf'];

describe('no precision landing to-dos', () => {
  it('no level asks for them any more', () => {
    for (const l of LEVELS) {
      const events = [...(l.extraQuests ?? []), ...(l.coopQuests ?? [])].flatMap((q) => q.objectives.map((o) => o.event ?? ''));
      for (const e of GONE) expect(events, `${l.id} ${e}`).not.toContain(e);
      for (const t of l.extraTriggers ?? []) expect(GONE, `${l.id} trigger ${t.id}`).not.toContain(t.id);
    }
  });
  it('every level still has something to do', () => {
    for (const l of LEVELS) if (!l.sandbox && !l.havoc) expect((l.extraQuests ?? []).length + l.quests.length, l.id).toBeGreaterThan(0);
  });
  it('the dome delivery counts in flight (no landing)', () => {
    const d = LEVELS.find((l) => l.id === 'thermal-express')!.extraTriggers!.find((t) => t.id === 'domeTop')!;
    expect(d.kind === 'carryLanded' && d.airborne).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';

/** Every chain level: its cast, stall and goods fit together, so the chain can be played through. */
const chainLevels = LEVELS.filter((l) => [...(l.extraQuests ?? [])].some((q) => q.chain));

describe('chain levels', () => {
  it('there are six: Map and Cone and the five rebuilt fetch levels', () => {
    expect(chainLevels.map((l) => l.id).sort()).toEqual(['frozen-harbour', 'herring-market', 'map-and-cone', 'new-look', 'vappu-eve', 'wedding-bells'].sort());
  });
  for (const l of chainLevels) {
    it(`${l.id}: the chain's person craves what the stall sells, and the goods are on the counter`, () => {
      const q = l.extraQuests!.find((x) => x.chain)!;
      const lure = q.objectives.find((o) => o.id === 'lure')!;
      const [, role, stationId] = lure.event!.split(':');
      const st = l.stations!.find((s) => s.id === stationId)!;
      expect(st, 'station').toBeTruthy();
      const npc = l.extraTourists!.find((t) => t.role === role)!;
      expect(npc, `a ${role} in the cast`).toBeTruthy();
      expect(npc.craves).toBe(st.sells);
      const goods = (l.extraProps ?? []).filter((p) => p.type === st.sells && Math.hypot(p.x - st.x, p.z - st.z) < 6);
      expect(goods.length, 'goods at the stall').toBeGreaterThanOrEqual(2);
      // every step names the same person
      for (const o of q.objectives) if (o.event?.includes(':')) expect(o.event, o.id).toContain(role);
      expect(q.objectives.slice(1).every((o) => !!o.after)).toBe(true);
    });
  }
  it('the provocations are a snatch or two splats, and a splat target can chase (it craves)', () => {
    for (const l of chainLevels) {
      const first = l.extraQuests!.find((x) => x.chain)!.objectives[0];
      expect(first.event!.startsWith('robbed:') || first.event!.endsWith(':angry'), l.id).toBe(true);
    }
  });
});

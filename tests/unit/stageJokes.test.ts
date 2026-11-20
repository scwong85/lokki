import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { stagesOf } from '../../src/data/arcs';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';

const MOCKING = new Set(['laugh', 'point', 'question', 'anger', 'facepalm', 'alert']);

/** M105: the joke-first rules, applied to the campaign stages (lighter than for the trial puzzles). */
describe('campaign stages, joke first', () => {
  for (const def of stagesOf(LEVELS)) {
    const setup = levelSetup(def, QUESTS, TRIGGERS, TOURIST_SPAWNS, false);
    const roles = new Set(setup.tourists.map((t) => t.role ?? 'tourist'));
    for (const q of setup.quests.filter((x) => x.chain)) {
      it(`${def.id}/${q.id}: its victims are in the cast, and the last step gets a reaction you can see`, () => {
        for (const o of q.objectives) if (o.victim) expect(roles.has(o.victim), `${o.id}: ${o.victim}`).toBe(true);
        const last = [...q.objectives].reverse().find((o) => o.kind === 'event')!;
        const seen = (def.reactions ?? []).some((r) => r.on === last.event && r.witness && MOCKING.has(r.witness.emote));
        expect(seen, `${q.id}/${last.id} (${last.event}) ends with a witness reaction`).toBe(true);
      });
    }
  }
});

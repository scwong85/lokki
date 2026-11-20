import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';

/**
 * The joke-first rules (docs/design/hooky-objectives-research.md, part a), checked on the trial puzzles ("Puzzles (new)"):
 * every to-do lands on a named person, the wish names them and no method, the world answers with a laugh (not hearts),
 * the level does not end on a delivery, and each level hides one more to-do.
 */
const P = LEVELS.filter((l) => l.series === 'Puzzles (new)');
const METHOD = /\((E|F|T|Q)\)|\b(press|hold|aim|peck the|carry|deliver)\b/i;
const MOCKING = new Set(['laugh', 'point', 'question', 'anger', 'facepalm']);

describe.each(P.map((l) => [l.id, l] as const))('%s', (_id, l) => {
  const main = l.extraQuests!.filter((q) => !(l.secret ?? []).includes(q.id));
  const steps = main.flatMap((q) => q.objectives);
  const names = new Map((l.extraTourists ?? []).filter((t) => t.name).map((t) => [t.role ?? '', t.name!]));
  it('has a joke card, and every step names a victim who is a named person in the level', () => {
    for (const q of main) expect(q.joke?.joke, q.id).toBeTruthy();
    for (const o of steps) {
      expect(o.victim, o.id).toBeTruthy();
      expect(names.has(o.victim!), `${o.id}: victim ${o.victim} has a name tag`).toBe(true);
    }
  });
  it('the wish names the victim and no method', () => {
    for (const o of steps) {
      expect(o.outcome, o.id).toContain(names.get(o.victim!)!);
      expect(o.outcome!, o.id).not.toMatch(METHOD);
      expect(o.nudge!, o.id).not.toMatch(METHOD);
    }
  });
  it('the world answers every step with a mocking reaction (laugh, point, question...), not hearts', () => {
    for (const o of steps) {
      const evs = [o.event, ...(o.events ?? [])].filter(Boolean) as string[];
      const reacts = (l.reactions ?? []).filter((r) => evs.includes(r.on) && r.witness && MOCKING.has(r.witness.emote));
      expect(reacts.length, `${o.id}: a mocking witness reaction for ${evs.join('/')}`).toBeGreaterThan(0);
    }
  });
  it('does not end on a delivery to a marker, and hides one more to-do', () => {
    const drops = new Set((l.extraTriggers ?? []).filter((t) => t.kind === 'propInZone').map((t) => ('event' in t ? t.event : '')));
    const last = main[0].objectives[main[0].objectives.length - 1];
    expect(drops.has(last.event ?? ''), `last step ${last.id}`).toBe(false);
    expect((l.secret ?? []).length).toBeGreaterThanOrEqual(1);
  });
});

it('there are three trial puzzles', () => {
  expect(P.map((l) => l.id)).toEqual(['buffet', 'grand-opening', 'fire-drill']);
});

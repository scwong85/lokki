import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { stagesOf } from '../../src/data/arcs';
import { REACTION_EVENT } from '../../src/data/reactions';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { PlaytestLog, recapOf } from '../../src/core/playtest';

/** The joke card rule (docs/design/puzzle-quality.md): every chain says what is funny, what you work out, and how the world reacts. */
describe('puzzle quality: every stage chain', () => {
  for (const def of stagesOf(LEVELS)) {
    const setup = levelSetup(def, QUESTS, TRIGGERS, TOURIST_SPAWNS, false);
    const chains = setup.quests.filter((q) => q.chain);
    it(`${def.id}: has chains`, () => expect(chains.length).toBeGreaterThanOrEqual(3));
    for (const q of chains) {
      const events = q.objectives.filter((o) => o.kind === 'event').map((o) => o.event ?? '');
      const reacted = new Set((def.reactions ?? []).map((r) => r.on));
      it(`${def.id}/${q.id}: joke card, two reactions, no padding`, () => {
        expect(q.joke?.joke.length, 'the joke').toBeGreaterThan(20);
        expect(q.joke?.insight.length, 'the insight').toBeGreaterThan(10);
        expect(q.joke?.reaction.length, 'the reaction').toBeGreaterThan(10);
        const reactions = events.filter((e) => REACTION_EVENT.test(e) || reacted.has(e));
        expect(reactions.length, `reaction steps in ${q.id}`).toBeGreaterThanOrEqual(2);
        expect(q.objectives.length).toBeGreaterThanOrEqual(2);
        // a chain ends on its punchline; "get away" is only a step when somebody is chasing you
        const last = q.objectives[q.objectives.length - 1];
        if (last.kind === 'escape') expect(events.some((e) => e.startsWith('robbed')), 'escape only after being chased').toBe(true);
      });
    }
    it(`${def.id}: every reaction answers a step of the level`, () => {
      const all = new Set(setup.quests.flatMap((q) => q.objectives.flatMap((o) => [o.event ?? '', ...(o.events ?? [])])));
      // a ten-minute stage (M107) also has the world answer the traits it is built on: a ritual, a bell, a bite, a ferry, a discovery
      const world = setup.quests.some((q) => q.collect) ? /^(ritual|flourishLost|discovered|sawWith|arrived|hit|pecked|gotcha|splash|ferryIn|honkDrop|picnicFeast|grab|snatch)/ : /^$/;
      for (const r of def.reactions ?? []) expect(all.has(r.on) || world.test(r.on), `reaction on ${r.on}`).toBe(true);
    });
  }
});

describe('accomplishment beats', () => {
  it('the recap joins what you did, step by step', () => {
    expect(recapOf([{ text: 'a', recap: 'You splatted' }, { text: 'he slipped' }, { text: 'c', recap: 'and took it' }])).toBe('You splatted \u2192 he slipped \u2192 and took it');
  });
  it('playtest notes are kept and summed per objective', () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const log = new PlaytestLog(store);
    log.add('a1s1', 'breakfast', 'funny', 61.4);
    log.add('a1s1', 'breakfast', 'stuck', 140);
    log.add('a1s2', 'freak', 'got', 90);
    expect(log.summary()['a1s1/breakfast']).toEqual({ stuck: 1, got: 0, funny: 1 });
    expect(new PlaytestLog(store).entries.length).toBe(3); // survives a reload
    expect(JSON.parse(log.json()).entries[0].at).toBe(61);
  });
});

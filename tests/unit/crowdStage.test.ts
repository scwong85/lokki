import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';

describe('stage 1.4 crowd', () => {
  const l = LEVELS.find((x) => x.id === 'a1s4')!;
  it('the jukebox step asks for a crowd of five, and the people are free to walk over', () => {
    const q = l.extraQuests!.find((x) => x.id === 'jukechain')!;
    const dance = q.objectives.find((o) => o.id === 'dance')!;
    expect(dance.event).toBe('dancers:5');
    expect(dance.text).toMatch(/five/);
    const party = (l.extraTourists ?? []).filter((t) => t.role === 'partygoer');
    expect(party.length).toBeGreaterThanOrEqual(6);
    expect(party.every((t) => !t.stationary && !t.post)).toBe(true);
    expect(party.some((t) => t.holdTag === 'danceCone')).toBe(true);
  });
  it('a boom box lies in the stage as a second way to start the music, and the Playground jukebox level is unchanged', () => {
    expect(l.extraProps?.some((p) => p.type === 'boombox')).toBe(true);
    const old = LEVELS.find((x) => x.id === 'jukebox-hero')!;
    expect(old.extraQuests![0].objectives.find((o) => o.id === 'dance')!.event).toBe('dancers:4');
    expect(old.extraTourists!.every((t) => t.stationary)).toBe(true);
  });
});

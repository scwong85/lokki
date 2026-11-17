import { describe, expect, it } from 'vitest';
import { MECHANICS, compareGates, introducedAt, isUnlocked, parseGate, switchMech, unlockedAt } from '../../src/gameplay/mechanics';

describe('mechanic gating', () => {
  it('no gate unlocks everything', () => {
    for (const m of MECHANICS) expect(isUnlocked(m.id, null)).toBe(true);
  });
  it('a mechanic is available at its stage and after, never before', () => {
    expect(isUnlocked('tug', parseGate('1.2'))).toBe(false);
    expect(isUnlocked('tug', parseGate('1.3'))).toBe(true);
    expect(isUnlocked('tug', parseGate('2.1'))).toBe(true);
    expect(isUnlocked('gust', parseGate('2.5'))).toBe(false);
    expect(isUnlocked('gust', parseGate('3.1'))).toBe(true);
  });
  it('the first stage has none of the optional verbs', () => {
    expect(unlockedAt({ arc: 1, stage: 1 })).toEqual([]);
  });
  it('once unlocked, it stays: the set only grows along the campaign', () => {
    const order = [1, 2, 3, 4].flatMap((arc) => [1, 2, 3, 4, 5].map((stage) => ({ arc, stage })));
    let prev = 0;
    for (const g of order) {
      const n = unlockedAt(g).length;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(prev).toBe(MECHANICS.length);
  });
  it('each stage introduces its own set, every mechanic exactly once', () => {
    const order = [1, 2, 3, 4].flatMap((arc) => [1, 2, 3, 4, 5].map((stage) => ({ arc, stage })));
    expect(order.flatMap(introducedAt).length).toBe(MECHANICS.length);
    expect(introducedAt({ arc: 1, stage: 3 }).map((m) => m.id).sort()).toEqual(['hide', 'peck', 'tug']);
  });
  it('parses gates and orders them', () => {
    expect(parseGate('1.3')).toEqual({ arc: 1, stage: 3 });
    expect(parseGate('x')).toBeNull();
    expect(parseGate(null)).toBeNull();
    expect(compareGates({ arc: 1, stage: 5 }, { arc: 2, stage: 1 })).toBeLessThan(0);
  });
  it('every switch effect maps to a mechanic', () => {
    expect(switchMech('dance')).toBe('jukebox');
    expect(switchMech('yank')).toBe('cloth');
    expect(switchMech('alarm')).toBe('peck');
    expect(switchMech('disguise')).toBe('disguise');
  });
});

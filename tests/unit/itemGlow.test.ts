import { describe, it, expect } from 'vitest';
import { glowLevel, wantedItems } from '../../src/gameplay/itemGlow';
import { sanitizeOptions } from '../../src/core/options';

describe('item glow', () => {
  it('is off when switched off, and fades with distance', () => {
    expect(glowLevel(1, true, true, 'off')).toBe(0);
    expect(glowLevel(2, false, false, 'subtle')).toBeGreaterThan(0);
    expect(glowLevel(13, false, false, 'subtle')).toBe(0);
    expect(glowLevel(11, false, false, 'subtle')).toBeLessThan(glowLevel(2, false, false, 'subtle'));
  });
  it('the wanted item shows from far, hawk-eye shows everything farther, strong reaches more', () => {
    expect(glowLevel(30, true, false, 'subtle')).toBeGreaterThan(0);
    expect(glowLevel(30, false, false, 'subtle')).toBe(0);
    expect(glowLevel(50, false, true, 'subtle')).toBeGreaterThan(0);
    expect(glowLevel(20, false, false, 'strong')).toBeGreaterThan(glowLevel(20, false, false, 'subtle'));
    expect(glowLevel(5, true, false, 'subtle')).toBeGreaterThan(glowLevel(5, false, false, 'subtle'));
  });
  it('finds the items open objectives ask for', () => {
    const defs = [{ id: 'q', title: 'q', timed: false, objectives: [
      { id: 'a', text: 'a', kind: 'event', event: 'grab:statueCap' },
      { id: 'b', text: 'b', kind: 'event', event: 'snatch:icecream', after: 'a' },
    ] }] as never;
    const st = (aDone: boolean) => [{ id: 'q', status: 'active', objectives: [{ id: 'a', done: aDone }, { id: 'b', done: false }] }] as never;
    expect([...wantedItems(defs, st(false))]).toEqual(['statueCap']);
    expect([...wantedItems(defs, st(true))]).toEqual(['icecream']);
  });
  it('option defaults to subtle and survives garbage', () => {
    expect(sanitizeOptions({}).highlight).toBe('subtle');
    expect(sanitizeOptions({ highlight: 'strong' }).highlight).toBe('strong');
    expect(sanitizeOptions({ highlight: 'x' }).highlight).toBe('subtle');
  });
});

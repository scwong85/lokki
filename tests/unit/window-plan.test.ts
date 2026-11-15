import { describe, expect, it } from 'vitest';
import { WINDOW_STYLES, bays, windowPlan } from '../../src/world/facade';

describe('window plan', () => {
  it('is deterministic per building and has one style per upper floor', () => {
    const a = windowPlan(1234, 5, 0), b = windowPlan(1234, 5, 0);
    expect(a.floors).toEqual(b.floors);
    expect(a.bayW).toBe(b.bayW);
    expect(a.floors.length).toBe(5);
    expect(a.floors.every((s) => s >= 0 && s < WINDOW_STYLES)).toBe(true);
  });
  it('buildings differ: bay widths, main styles, accents and blank walls all vary across the city', () => {
    const widths = new Set<number>(), mains = new Set<number>();
    let accents = 0, blanks = 0, n = 0;
    for (let id = 1; id <= 400; id++) {
      const p = windowPlan(id, 5, 1);
      widths.add(p.bayW);
      mains.add(p.floors[0]);
      if (p.floors.some((s) => s !== p.floors[0])) accents++;
      for (let i = 0; i < 4; i++) if (p.blank(i)) blanks++;
      n++;
      expect(p.bayW).toBeGreaterThanOrEqual(3.4);
      expect(p.bayW).toBeLessThanOrEqual(7.3);
    }
    expect(widths.size).toBeGreaterThanOrEqual(6);
    expect(mains.size).toBeGreaterThanOrEqual(4);
    expect(accents / n).toBeGreaterThan(0.2); // a good share has an accent floor...
    expect(accents / n).toBeLessThan(0.7); // ...but most are uniform
    expect(blanks / (n * 4)).toBeGreaterThan(0.08); // some blank walls
    expect(blanks / (n * 4)).toBeLessThan(0.3);
  });
  it('the longest wall is never blank, and bay width changes the bay count', () => {
    for (let id = 1; id <= 200; id++) expect(windowPlan(id, 4, 2).blank(2)).toBe(false);
    expect(bays(30, 3.4)).toBeGreaterThan(bays(30, 7));
    expect(bays(1.5, 4)).toBe(0);
  });
});

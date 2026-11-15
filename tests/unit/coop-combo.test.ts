import { describe, expect, it } from 'vitest';
import { CoopCombo } from '../../src/gameplay/coopCombo';

describe('CoopCombo', () => {
  it('needs two different players within the window', () => {
    const c = new CoopCombo();
    expect(c.hit('snatch', 0, 10, 5)).toBe(false);
    expect(c.hit('snatch', 0, 11, 5)).toBe(false); // the same player again is not a pair
    expect(c.hit('snatch', 1, 14, 5)).toBe(true);
  });
  it('too slow does not count, and kinds are separate', () => {
    const c = new CoopCombo();
    c.hit('snatch', 0, 10, 5);
    expect(c.hit('snatch', 1, 20, 5)).toBe(false);
    expect(c.hit('poop', 0, 21, 5)).toBe(false);
    expect(c.hit('poop', 1, 22, 5)).toBe(true);
  });
  it('reset forgets', () => {
    const c = new CoopCombo();
    c.hit('a', 0, 1, 5);
    c.reset();
    expect(c.hit('a', 1, 2, 5)).toBe(false);
  });
});

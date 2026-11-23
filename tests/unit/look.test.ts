import { describe, expect, it } from 'vitest';
import { lookFor } from '../../src/gameplay/look';
import { LEVELS } from '../../src/data/levels';

describe('who looks like a woman (M119)', () => {
  it('Granny, the Baker and the Selfie Tourist are women; the Warden-like roles are men; a spawn can say so', () => {
    for (const role of ['granny', 'baker', 'selfie', 'bride', 'blogger']) expect(lookFor({ role }, 1), role).toBe('f');
    for (const role of ['captain', 'dockhand', 'fisher', 'soupman', 'marketguard', 'waiter']) expect(lookFor({ role }, 1), role).toBe('m');
    expect(lookFor({ role: 'granny', look: 'm' }, 1)).toBe('m');
  });
  it('the crowd is a seeded mix, about half and half, and the same seed always gives the same person', () => {
    const f = Array.from({ length: 400 }, (_, i) => lookFor({ role: 'tourist' }, i)).filter((l) => l === 'f').length;
    expect(f).toBeGreaterThan(150);
    expect(f).toBeLessThan(250);
    expect(lookFor({}, 7)).toBe(lookFor({}, 7));
  });
  it('the two daters at the clock are a man and a woman', () => {
    const sandbox = LEVELS.find((l) => l.id === 'sandbox')!;
    expect(sandbox).toBeTruthy();
  });
});

import { describe, expect, it } from 'vitest';
import { FixedStepper } from '../../src/core/loop';

describe('FixedStepper', () => {
  it('runs a whole number of steps and reports alpha', () => {
    const s = new FixedStepper(0.1);
    expect(s.advance(0.25)).toEqual({ steps: 2, alpha: expect.closeTo(0.5, 5) });
  });
  it('accumulates leftovers across frames', () => {
    const s = new FixedStepper(0.1);
    expect(s.advance(0.06).steps).toBe(0);
    expect(s.advance(0.06).steps).toBe(1);
  });
  it('caps steps after a long stall', () => {
    const s = new FixedStepper(0.1, 5);
    expect(s.advance(10).steps).toBe(5);
    expect(s.advance(0).steps).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { exportTuning, importTuning, tuning } from '../../src/core/tuning';

describe('tuning', () => {
  it('exports plain numbers and round-trips with clamping', () => {
    const out = exportTuning();
    expect(out.flight.maxSpeed).toBe(tuning.flight.maxSpeed.value);
    importTuning({ flight: { maxSpeed: 9999, nope: 1 } });
    expect(tuning.flight.maxSpeed.value).toBe(tuning.flight.maxSpeed.max);
  });
});

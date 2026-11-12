import { describe, expect, it } from 'vitest';
import { exportTuning, importTuning, tuning } from '../../src/core/tuning';

describe('tuning', () => {
  it('exports plain numbers and round-trips with clamping', () => {
    const out = exportTuning();
    expect(out.gull.maxSpeed).toBe(tuning.gull.maxSpeed.value);
    importTuning({ gull: { maxSpeed: 9999, nope: 1 } });
    expect(tuning.gull.maxSpeed.value).toBe(tuning.gull.maxSpeed.max);
  });
});

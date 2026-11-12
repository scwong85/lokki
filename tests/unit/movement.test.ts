import { describe, expect, it } from 'vitest';
import { stepMotion, type Motion } from '../../src/gull/movement';
import { tuning } from '../../src/core/tuning';

const fresh = (): Motion => ({ x: 0, z: 0, vx: 0, vz: 0, heading: 0 });

describe('stepMotion', () => {
  it('moves toward -Z when pressing forward at yaw 0 and caps speed', () => {
    const m = fresh();
    for (let i = 0; i < 300; i++) stepMotion(m, 0, 1, 0, 1 / 60);
    expect(m.z).toBeLessThan(0);
    expect(Math.hypot(m.vx, m.vz)).toBeLessThanOrEqual(tuning.gull.maxSpeed.value + 1e-6);
  });
  it('decelerates to rest without input', () => {
    const m = { ...fresh(), vz: -5 };
    for (let i = 0; i < 120; i++) stepMotion(m, 0, 0, 0, 1 / 60);
    expect(Math.hypot(m.vx, m.vz)).toBe(0);
  });
});

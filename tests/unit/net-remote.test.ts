import { describe, expect, it } from 'vitest';
import { easeAngle, followRemote, type Pose } from '../../src/net/remote';

const pose = (x: number, vx = 0, heading = 0): Pose => ({ x, y: 0, z: 0, vx, vy: 0, vz: 0, heading });

describe('followRemote', () => {
  it('catches up with a target that keeps moving', () => {
    const cur = pose(0), tgt = pose(10, 5);
    for (let i = 0; i < 120; i++) followRemote(cur, tgt, 1 / 60, 14);
    expect(Math.abs(cur.x - tgt.x)).toBeLessThan(0.5);
    expect(tgt.x).toBeCloseTo(20, 0); // 2 s at 5 m/s
  });
  it('turns the short way round', () => {
    const cur = pose(0, 0, 3.0), tgt = pose(0, 0, -3.0);
    followRemote(cur, tgt, 0.1, 14);
    expect(cur.heading).toBeGreaterThan(3.0); // 3 -> pi -> -3 is the short way
    expect(easeAngle(0.1, -0.1, 1, 100)).toBeCloseTo(-0.1, 2);
  });
});

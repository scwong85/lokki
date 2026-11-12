import { describe, expect, it } from 'vitest';
import { collideSphere, surfaceBelow, type Box } from '../../src/world/collision';

const wall: Box = { min: [0, 0, 0], max: [2, 10, 2], kind: 'building', color: 0 };

describe('collision', () => {
  it('rests on the ground plane', () => {
    const p = { x: 10, y: 0.1, z: 10 };
    const c = collideSphere([], p, 0.5);
    expect(p.y).toBeCloseTo(0.5);
    expect(c[0].ny).toBe(1);
  });
  it('pushes out of a box side and reports a horizontal normal', () => {
    const p = { x: -0.3, y: 5, z: 1 };
    const c = collideSphere([wall], p, 0.5);
    expect(p.x).toBeCloseTo(-0.5);
    expect(c[0].nx).toBe(-1);
  });
  it('lands on a box top', () => {
    const p = { x: 1, y: 10.2, z: 1 };
    const c = collideSphere([wall], p, 0.5);
    expect(p.y).toBeCloseTo(10.5);
    expect(c[0].ny).toBe(1);
  });
  it('surfaceBelow finds the roof, not boxes above', () => {
    expect(surfaceBelow([wall], 1, 1, 20).y).toBe(10);
    expect(surfaceBelow([wall], 1, 1, 5).y).toBe(0);
    expect(surfaceBelow([wall], 50, 50, 20).y).toBe(0);
  });
});

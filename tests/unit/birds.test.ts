import { describe, expect, it } from 'vitest';
import { Birds, CIRCUITS, birdPose } from '../../src/world/birds';

describe('birds', () => {
  it('each bird circles its flock\'s circuit at a steady distance and height', () => {
    for (let i = 0; i < 16; i++) {
      const c = CIRCUITS[i % CIRCUITS.length];
      const a = birdPose(i, 0), b = birdPose(i, 25);
      const da = Math.hypot(a.x - c.x, a.z - c.z), db = Math.hypot(b.x - c.x, b.z - c.z);
      expect(Math.abs(da - db)).toBeLessThan(0.001); // same radius round the circle
      expect(a.y).toBeGreaterThan(c.y - 4);
      expect(a.y).toBeLessThan(c.y + 9);
    }
  });
  it('they fly forwards: the heading follows the direction of travel', () => {
    for (const i of [0, 1, 2, 5, 9]) {
      const a = birdPose(i, 10), b = birdPose(i, 10.05);
      const dx = b.x - a.x, dz = b.z - a.z;
      expect(Math.hypot(dx, dz)).toBeGreaterThan(0.1);
      expect(Math.sin(a.heading)).toBeCloseTo(-dx / Math.hypot(dx, dz), 1);
      expect(Math.cos(a.heading)).toBeCloseTo(-dz / Math.hypot(dx, dz), 1);
    }
  });
  it('is one instanced mesh with the asked count, and moves on update', () => {
    const b = new Birds(6);
    expect(b.mesh.count).toBe(6);
    b.update(0);
    const m0 = b.mesh.instanceMatrix.array.slice(0, 16);
    b.update(5);
    expect(Array.from(b.mesh.instanceMatrix.array.slice(0, 16))).not.toEqual(Array.from(m0));
  });
  it('flocks are spread over the city, not all in one place', () => {
    const xs = CIRCUITS.map((c) => c.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(300);
  });
});

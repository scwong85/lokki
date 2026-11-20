import { describe, expect, it } from 'vitest';
import { cropRect } from '../../src/ui/polaroids';

describe('the punchline photo crop', () => {
  it('without a focus it is the largest rectangle of the photo\'s shape in the middle of the screen', () => {
    const r = cropRect(1600, 900, 1.2, null);
    expect(r.h).toBe(900);
    expect(r.w).toBeCloseTo(1080);
    expect(r.x).toBeCloseTo(260);
    expect(r.y).toBe(0);
  });
  it('with a focus (the victim\'s head) and a zoom it centres on them, smaller', () => {
    const r = cropRect(1600, 900, 1.2, { x: 0.3, y: 0.4 }, 2);
    expect(r.w).toBeCloseTo(540);
    expect(r.x + r.w / 2).toBeCloseTo(480);
    expect(r.y + r.h / 2).toBeCloseTo(360);
  });
  it('never leaves the screen when the victim is near an edge', () => {
    const r = cropRect(1600, 900, 1.2, { x: 0.99, y: 0.01 }, 1.7);
    expect(r.x + r.w).toBeLessThanOrEqual(1600);
    expect(r.y).toBeGreaterThanOrEqual(0);
  });
});

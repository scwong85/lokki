import { describe, expect, it } from 'vitest';
import { GullModel } from '../../src/gull/model';
import type { Pose } from '../../src/gull/pose';

const pose: Pose = { flap: 0, flapActive: false, fold: 1, sweep: 0.5, legTuck: 0, headRoll: 0, headPitch: 0, beakOpen: 0, walkPhase: 0, legStride: 0, bob: 0, swimming: false } as unknown as Pose;

describe('gull model v2', () => {
  it('blinks now and then, and the eyes open again', () => {
    const m = new GullModel();
    const eyes = (m as unknown as { eyes: { scale: { y: number } } }).eyes;
    const seen = new Set<number>();
    for (let i = 0; i < 60 * 12; i++) {
      m.apply(pose, 1 / 60);
      seen.add(eyes.scale.y);
    }
    expect(seen.has(1)).toBe(true);
    expect(seen.has(0.1)).toBe(true);
    expect(eyes.scale.y === 1 || eyes.scale.y === 0.1).toBe(true);
  });
  it('has three toes per foot, so more leg geometry than v1 (a web plus toes)', () => {
    const m = new GullModel();
    let tris = 0;
    m.root.traverse((o) => { const g = (o as { geometry?: { attributes: { position: { count: number } } } }).geometry; if (g) tris += g.attributes.position.count / 3; });
    expect(tris).toBeGreaterThan(600);
  });
});

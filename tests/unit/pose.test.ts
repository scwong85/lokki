import { describe, expect, it } from 'vitest';
import { computePose, type PoseInput } from '../../src/gull/pose';
import { AudioManager } from '../../src/core/audio';

const base: PoseInput = {
  mode: 'air', stunned: false, hspeed: 14, walkPhase: 0, flapAnim: 99, flapDuration: 0.38,
  heightAbove: 30, turnRate: 0, bodyPitch: 0, beakOpen: false, time: 0,
};

describe('computePose', () => {
  it('folds wings and lowers legs on the ground; stride grows with speed', () => {
    const idle = computePose({ ...base, mode: 'ground', hspeed: 0 });
    const walk = computePose({ ...base, mode: 'ground', hspeed: 4.5 });
    expect(idle.fold).toBe(1);
    expect(idle.legTuck).toBe(0);
    expect(walk.legStride).toBeGreaterThan(idle.legStride);
  });
  it('spreads wings and tucks legs when gliding high up', () => {
    const p = computePose(base);
    expect(p.fold).toBe(0);
    expect(p.legTuck).toBe(1);
    expect(p.flapActive).toBe(false);
  });
  it('drops legs when close to a surface (landing)', () => {
    expect(computePose({ ...base, heightAbove: 0.5 }).legTuck).toBe(0);
  });
  it('a flap stroke goes from wings up to wings down and back', () => {
    const start = computePose({ ...base, flapAnim: 0 });
    const mid = computePose({ ...base, flapAnim: 0.19 });
    expect(start.flapActive).toBe(true);
    expect(start.flap).toBeGreaterThan(0.5);
    expect(mid.flap).toBeLessThan(-0.5);
  });
  it('dive sweeps the wings back and keeps the beak closed', () => {
    const p = computePose({ ...base, mode: 'dive' });
    expect(p.sweep).toBeGreaterThan(0.8);
    expect(p.beakOpen).toBe(0);
  });
  it('opens the beak when asked or when stunned', () => {
    expect(computePose({ ...base, beakOpen: true }).beakOpen).toBe(1);
    expect(computePose({ ...base, stunned: true }).beakOpen).toBe(1);
  });
  it('tilts the head into turns', () => {
    expect(computePose({ ...base, turnRate: 2 }).headRoll).toBeGreaterThan(0.2);
  });
});

describe('AudioManager', () => {
  it('is a safe no-op without WebAudio', () => {
    const a = new AudioManager();
    a.unlock();
    a.play('flap');
    a.setAir(1, true);
    expect(a.toggleMute()).toBe(true);
  });
});

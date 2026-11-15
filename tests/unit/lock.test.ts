import { describe, expect, it } from 'vitest';
import { nextLock, rankCandidates, resolveLock, type LockCandidate } from '../../src/gameplay/lock';

const c = (id: string, x: number, z: number, y = 1.2): LockCandidate => ({ id, x, y, z, radius: 0.7, label: id });
const gull = { x: 0, y: 10, z: 0 };
// camera yaw 0 looks toward -Z

describe('target lock', () => {
  it('ranks what is in front, middle of the view first, and ignores what is behind or too far', () => {
    const list = [c('left', -12, -20), c('centre', 0, -25), c('behind', 0, 15), c('far', 0, -200), c('right', 9, -20)];
    const r = rankCandidates(gull, 0, list, 90, 70);
    expect(r.map((x) => x.id)).toEqual(['centre', 'right', 'left']);
  });
  it('turning the camera changes what is in front', () => {
    const list = [c('north', 0, -20), c('east', 20, 0)];
    expect(rankCandidates(gull, 0, list, 90, 70).map((x) => x.id)).toEqual(['north']);
    expect(rankCandidates(gull, -Math.PI / 2, list, 90, 70).map((x) => x.id)).toEqual(['east']); // yaw -90 deg looks toward +X
  });
  it('something right underneath a gull counts as in front', () => {
    expect(rankCandidates(gull, 0, [c('below', 0.5, 0.5)], 90, 40).length).toBe(1);
  });
  it('Tab cycles through what is in view and then lets go', () => {
    const r = [c('a', 0, -10), c('b', 2, -20), c('c', 4, -30)];
    expect(nextLock(null, r)).toBe('a');
    expect(nextLock('a', r)).toBe('b');
    expect(nextLock('c', r)).toBeNull();
    expect(nextLock('gone', r)).toBe('a');
    expect(nextLock('a', [])).toBeNull();
  });
  it('the lock lets go when the target is gone or too far', () => {
    const list = [c('a', 0, -30)];
    expect(resolveLock('a', list, gull, 100)?.id).toBe('a');
    expect(resolveLock('a', list, gull, 20)).toBeNull();
    expect(resolveLock('b', list, gull, 100)).toBeNull();
    expect(resolveLock(null, list, gull, 100)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { MusicDirector, approach, nextTrack, wantedTier } from '../../src/gameplay/musicDirector';
import { MUSIC } from '../../src/data/music';
import { tuning } from '../../src/core/tuning';
import { existsSync } from 'node:fs';

describe('music director', () => {
  it('maps heat tiers and the finale to music tiers', () => {
    expect(wantedTier(0, false)).toBe('calm');
    expect(wantedTier(1, false)).toBe('calm');
    expect(wantedTier(2, false)).toBe('playful');
    expect(wantedTier(3, false)).toBe('playful');
    expect(wantedTier(4, false)).toBe('chaos');
    expect(wantedTier(0, true)).toBe('chaos');
  });

  it('goes up at once and comes down only after the delay', () => {
    const d = new MusicDirector();
    expect(d.update(0.1, 3, false)).toBe('playful');
    expect(d.update(1, 0, false)).toBe('playful');
    expect(d.update(tuning.audio.musicDownDelay.value, 0, false)).toBe('calm');
  });

  it('a heat spike during the delay restarts it', () => {
    const d = new MusicDirector();
    d.update(0.1, 3, false);
    d.update(tuning.audio.musicDownDelay.value - 1, 0, false);
    d.update(0.1, 3, false);
    expect(d.update(2, 0, false)).toBe('playful');
  });

  it('rotates tracks and fades', () => {
    expect(nextTrack(1, 0)).toBe(0);
    expect(nextTrack(2, -1)).toBe(0);
    expect(nextTrack(2, 0)).toBe(1);
    expect(nextTrack(2, 1)).toBe(0);
    expect(approach(0, 1, 1.5, 3)).toBeCloseTo(0.5);
    expect(approach(0.9, 1, 5, 3)).toBe(1);
    expect(approach(0.2, 0, 5, 3)).toBe(0);
  });

  it('every listed track file exists', () => {
    for (const list of Object.values(MUSIC)) for (const t of list) expect(existsSync(`public/audio/music/${t.file}`)).toBe(true);
  });
});

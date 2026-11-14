import { describe, expect, it } from 'vitest';
import { HUD_MODES, hudFlags, nextHudMode } from '../../src/ui/hudMode';
import { sanitizeOptions } from '../../src/core/options';
import { activeMarkers } from '../../src/gameplay/questMarkers';
import { QuestLog } from '../../src/gameplay/quest';
import { QUESTS } from '../../src/data/quests';

describe('HUD modes', () => {
  it('cycle full -> minimal -> off -> full', () => {
    expect(nextHudMode('full')).toBe('minimal');
    expect(nextHudMode('minimal')).toBe('off');
    expect(nextHudMode('off')).toBe('full');
    expect(HUD_MODES).toHaveLength(3);
  });

  it('decide labels and the stand-alone timer', () => {
    expect(hudFlags('full')).toEqual({ waypoints: 'all', miniTimer: false });
    expect(hudFlags('minimal')).toEqual({ waypoints: 'active', miniTimer: false });
    expect(hudFlags('off')).toEqual({ waypoints: 'none', miniTimer: true });
  });

  it('is saved with the options and junk falls back to full', () => {
    expect(sanitizeOptions({ hud: 'off' }).hud).toBe('off');
    expect(sanitizeOptions({ hud: 'loud' }).hud).toBe('full');
    expect(sanitizeOptions({}).hud).toBe('full');
  });

  it('"active only" labels skip quests that have not started', () => {
    const q = new QuestLog(QUESTS);
    expect(activeMarkers(QUESTS, q.quests).length).toBeGreaterThan(0); // start markers of idle quests
    expect(activeMarkers(QUESTS, q.quests, true)).toEqual([]);
    q.onEvent('grab:statueCap'); // the cap heist starts
    expect(activeMarkers(QUESTS, q.quests, true).length).toBeGreaterThan(0);
  });
});

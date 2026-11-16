import { describe, expect, it } from 'vitest';
import { CHEESE_RUN, DING_DONG, SAY_PIGEON, LEVELS, levelById } from '../../src/data/levels';
import { LANDING_Y, LANE3_X, STEPS_BOTTOM_Z, STEPS_COUNT } from '../../src/data/levels/senate';
import { STEPS } from '../../src/world/landmarks';

describe('Senate Square levels', () => {
  it('are registered in order after Market Square, before the sandbox', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(ids.indexOf('cheese-run')).toBeGreaterThan(ids.indexOf('harbour-day'));
    expect(ids.slice(-2)).toEqual(['sandbox', 'havoc-hour']);
    for (const l of [CHEESE_RUN, SAY_PIGEON, DING_DONG]) {
      expect(l.district).toBe('senaatintori');
      expect(levelById(l.id)).toBe(l);
      expect(l.start).toBeDefined();
    }
    expect(SAY_PIGEON.requires).toBe(CHEESE_RUN.id);
    expect(DING_DONG.requires).toBe(SAY_PIGEON.id);
  });
  it('the steps rise to the landing and the right lane has rails', () => {
    expect(LANDING_Y).toBeCloseTo(STEPS_COUNT * STEPS.rise);
    expect(LANE3_X - STEPS.laneHalf).toBeGreaterThan(-156.5 + STEPS.width / 2 - 20);
    expect(STEPS_BOTTOM_Z).toBeLessThan(-300);
  });
  it('the bell schedule is sane', () => {
    const b = DING_DONG.bells!;
    expect(b.every).toBeGreaterThan(b.duration);
    expect(b.first).toBeGreaterThan(0);
  });
});

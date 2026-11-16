import { describe, expect, it } from 'vitest';
import { GROUND_ROWS, awningColour, balconies, groundRuns, turretCorner } from '../../src/world/facade';
import { ATLAS_ROWS, GROUND_ROW_COUNT } from '../../src/render/facadeTextures';

describe('ground floors', () => {
  it('short walls are all shop; longer ones sometimes get a door, gateway or café in the middle, and the runs tile the wall', () => {
    expect(groundRuns(2, 5, 0)).toEqual([{ kind: 'shop', from: 0, to: 2 }]);
    const kinds = new Set<string>();
    for (let id = 1; id < 400; id++) {
      const runs = groundRuns(8, id, 1);
      expect(runs[0].from).toBe(0);
      expect(runs[runs.length - 1].to).toBe(8);
      for (let k = 1; k < runs.length; k++) expect(runs[k].from).toBe(runs[k - 1].to);
      for (const r of runs) {
        expect(r.to).toBeGreaterThan(r.from);
        kinds.add(r.kind);
      }
    }
    expect([...kinds].sort()).toEqual(['cafe', 'door', 'gate', 'shop']);
  });
  it('the special run is never at the very edge of the wall', () => {
    for (let id = 1; id < 300; id++) {
      const runs = groundRuns(6, id, 0);
      const special = runs.find((r) => r.kind !== 'shop');
      if (special) {
        expect(special.from).toBeGreaterThanOrEqual(1);
        expect(special.to).toBeLessThanOrEqual(5);
      }
    }
  });
  it('the atlas has a row for every ground kind plus the six window styles', () => {
    expect(GROUND_ROWS.length).toBe(GROUND_ROW_COUNT);
    expect(ATLAS_ROWS).toBe(GROUND_ROW_COUNT + 6);
  });
  it('awnings are seeded, some shop runs get none, and colours are in range', () => {
    const picks = Array.from({ length: 200 }, (_, i) => awningColour(i, 1, 0, 5));
    expect(picks.some((p) => p === -1)).toBe(true);
    expect(picks.some((p) => p >= 0)).toBe(true);
    for (const p of picks) expect(p).toBeLessThan(5);
    expect(awningColour(7, 2, 1, 5)).toBe(awningColour(7, 2, 1, 5));
  });
});

describe('balconies and turrets', () => {
  it('only long walls of tall buildings get balconies, on upper floors only', () => {
    expect(balconies(6, 5, 3, 0)).toEqual([]);
    expect(balconies(20, 2, 3, 0)).toEqual([]);
    let any = false;
    for (let id = 1; id < 200; id++) {
      for (const b of balconies(24, 6, id, 0)) {
        any = true;
        expect(b.t).toBeGreaterThan(0);
        expect(b.t).toBeLessThan(1);
        expect(b.floor).toBeGreaterThanOrEqual(1);
        expect(b.floor).toBeLessThan(6);
      }
    }
    expect(any).toBe(true);
  });
  const rect = [0, 0, 30, 0, 30, 20, 0, 20];
  it('a turret stands on a right-angled corner of a tall block, never a low one', () => {
    expect(turretCorner(rect, 1, 8)).toBe(-1);
    const found = Array.from({ length: 80 }, (_, id) => turretCorner(rect, id, 20)).filter((k) => k >= 0);
    expect(found.length).toBeGreaterThan(10);
    for (const k of found) expect(k).toBeLessThan(4);
  });
  it('very short sides or a reflex corner do not take a turret', () => {
    expect(turretCorner([0, 0, 4, 0, 4, 3, 0, 3], 1, 20)).toBe(-1);
    const lShape = [0, 0, 30, 0, 30, 10, 10, 10, 10, 30, 0, 30];
    for (let id = 0; id < 60; id++) {
      const k = turretCorner(lShape, id, 20);
      if (k >= 0) expect(k).not.toBe(3); // the inner (reflex) corner
    }
  });
});

import { describe, expect, it } from 'vitest';
import cityJson from '../../data/generated/kauppatori.json';
import register from '../../data/raw/register.json';
import { ERAS, FACADES_BY_CODE, eraOf, facadeOf, styleKit, yearOf } from '../../src/world/buildingStyle';
import { balconies, pitchedFits, windowPlan, wantsPitched } from '../../src/world/facade';

describe('real building style (M108)', () => {
  it('reads the register date and puts it in an era', () => {
    expect(yearOf('1888-12-31T00:00:00+02:00')).toBe(1888);
    expect(yearOf(19020101)).toBe(1902);
    expect(yearOf(null)).toBeNull();
    expect(eraOf(1828)).toBe('empire');
    expect(eraOf(1869)).toBe('empire');
    expect(eraOf(1870)).toBe('historicism');
    expect(eraOf(1905)).toBe('jugend');
    expect(eraOf(1925)).toBe('classicism');
    expect(eraOf(1938)).toBe('functionalism');
    expect(eraOf(1965)).toBe('modern');
    expect(eraOf(null)).toBe('unknown');
  });

  it('reads the facade material codes', () => {
    expect(facadeOf('2')).toBe('brick');
    expect(facadeOf('7')).toBe('render');
    expect(facadeOf('4')).toBe('stone');
    expect(facadeOf(null)).toBe('unknown');
    expect(facadeOf('99')).toBe('unknown');
  });

  it('the era shapes the building: Empire pitched and plain, functionalism flat with strip windows, Jugend towers', () => {
    const empire = styleKit('empire', 'render');
    expect(empire.pitched).toBe('yes');
    expect(empire.balconies).toBe(0);
    expect(empire.turret).toBe(0);
    const funk = styleKit('functionalism', 'render');
    expect(funk.pitched).toBe('no');
    expect(funk.mansard).toBe(false);
    expect(funk.window).toBe(2);
    expect(styleKit('jugend', 'render').turret).toBeGreaterThan(0.5);
    expect(styleKit('unknown', 'unknown')).toMatchObject({ walls: null, pitched: 'auto', window: -1, turret: -1 });
  });

  it('the facade material picks the colour family; render keeps the era colours', () => {
    const brick = styleKit('historicism', 'brick').walls!;
    const stone = styleKit('historicism', 'stone').walls!;
    expect(brick).not.toEqual(stone);
    expect(styleKit('empire', 'render').walls).not.toEqual(styleKit('jugend', 'render').walls);
    // brick reads warm (more red than blue), stone reads grey (channels close together)
    for (const c of brick) expect((c >> 16) & 255).toBeGreaterThan(c & 255);
    for (const c of stone) expect(Math.max((c >> 16) & 255, (c >> 8) & 255, c & 255) - Math.min((c >> 16) & 255, (c >> 8) & 255, c & 255)).toBeLessThan(40);
  });

  it('the builders take the kit: a window style, a pitched roof where it fits, a balcony chance', () => {
    expect(windowPlan(7, 4, 0, 2).floors.filter((s) => s === 2).length).toBeGreaterThanOrEqual(2);
    const rect = { long: 20, short: 10 } as Parameters<typeof wantsPitched>[0];
    expect(pitchedFits(rect, 12)).toBe(true);
    expect(pitchedFits({ long: 60, short: 30 } as Parameters<typeof wantsPitched>[0], 12)).toBe(false);
    expect(pitchedFits(null, 12)).toBe(false);
    let none = 0, all = 0;
    for (let id = 0; id < 50; id++) {
      none += balconies(20, 5, id, 0, 0).length;
      all += balconies(20, 5, id, 0, 100).length > 0 ? 1 : 0;
    }
    expect(none).toBe(0);
    expect(all).toBe(50);
  });

  it('most buildings in the map have an era and a facade from the register snapshot', () => {
    const b = (cityJson as unknown as { buildings: { e?: number; f?: number }[] }).buildings;
    expect(b.filter((x) => x.e).length / b.length).toBeGreaterThan(0.7);
    expect(b.filter((x) => x.f).length / b.length).toBeGreaterThan(0.55);
    for (const x of b) {
      if (x.e !== undefined) expect(ERAS[x.e]).toBeTruthy();
      if (x.f !== undefined) expect(FACADES_BY_CODE[x.f]).toBeTruthy();
    }
    // the snapshot is keyed by register id and holds raw register codes
    const rows = Object.values((register as unknown as { buildings: Record<string, { facade?: string; built?: string }> }).buildings);
    expect(rows.length).toBeGreaterThan(400);
    expect(rows.some((r) => r.facade === '2' && yearOf(r.built) !== null)).toBe(true);
  });
});

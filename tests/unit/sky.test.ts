import { describe, expect, it } from 'vitest';
import { SKIES, blendSky, skyById, type SkyId } from '../../src/data/skies';
import { buildBackdrop, planBackdrop } from '../../src/world/backdrop';
import { ATLAS_ROWS } from '../../src/render/facadeTextures';
import { LEVELS } from '../../src/data/levels';

describe('sky presets', () => {
  it('every preset is complete and sane', () => {
    for (const id of Object.keys(SKIES) as SkyId[]) {
      const p = SKIES[id];
      expect(p.light, id).toBeGreaterThan(0.1);
      expect(p.light, id).toBeLessThanOrEqual(1);
      expect(p.sunSize, id).toBeGreaterThan(0);
      expect(p.cloudAmount, id).toBeGreaterThanOrEqual(0);
      expect(p.cloudAmount, id).toBeLessThanOrEqual(1);
      expect(p.sunDir.some((v) => v !== 0), id).toBe(true);
      for (const c of [p.top, p.mid, p.horizon, p.fog, p.sunColor, p.hemiSky, p.hemiGround, p.cloud]) expect(c, id).toBeLessThanOrEqual(0xffffff);
    }
    expect(Object.keys(SKIES).sort()).toEqual(['dusk', 'golden', 'morning', 'night', 'noon']);
  });
  it('unknown ids fall back to noon, and the night preset is the dimmest', () => {
    expect(skyById(undefined)).toBe(SKIES.noon);
    expect(skyById('nope')).toBe(SKIES.noon);
    expect(Math.min(...Object.values(SKIES).map((p) => p.light))).toBe(SKIES.night.light);
  });
  it('blending goes from one preset to the other', () => {
    expect(blendSky(SKIES.noon, SKIES.dusk, 0).top).toBe(SKIES.noon.top);
    expect(blendSky(SKIES.noon, SKIES.dusk, 1).horizon).toBe(SKIES.dusk.horizon);
    const mid = blendSky(SKIES.noon, SKIES.night, 0.5);
    expect(mid.light).toBeCloseTo((SKIES.noon.light + SKIES.night.light) / 2, 5);
  });
  it('levels only name real skies', () => {
    for (const l of LEVELS) if (l.sky) expect(Object.keys(SKIES)).toContain(l.sky);
    expect(LEVELS.filter((l) => l.sky).length).toBeGreaterThanOrEqual(8);
  });
});

describe('horizon backdrop', () => {
  const land = (x: number) => x < 0; // land on the west side only
  it('stays outside the playable square, on land, and is the same every time', () => {
    const a = planBackdrop((x) => land(x), 560);
    expect(a.length).toBeGreaterThan(40);
    for (const b of a) {
      expect(Math.max(Math.abs(b.x), Math.abs(b.z))).toBeGreaterThanOrEqual(560);
      expect(land(b.x)).toBe(true);
    }
    expect(planBackdrop((x) => land(x), 560)).toEqual(a);
  });
  it('is one mesh with no collision data, or nothing when there is no land', () => {
    expect(planBackdrop(() => false, 560)).toEqual([]);
    expect(buildBackdrop([])).toBeNull();
    const mesh = buildBackdrop(planBackdrop(() => true, 560, 20))!;
    expect(mesh.geometry.attributes.position.count).toBe(20 * 36);
  });
});

describe('facade atlas', () => {
  it('has one shop row plus the six window rows', () => {
    expect(ATLAS_ROWS).toBe(7);
  });
});

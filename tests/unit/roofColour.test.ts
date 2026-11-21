import { describe, expect, it } from 'vitest';
import cityJson from '../../data/generated/kauppatori.json';
import { ROOF_CLASSES, ROOF_COLOURS, classifyRoof, hcl, roofCode, roofColours } from '../../src/world/roofColour';
import { edgeDistance, medianColour, roofPixels, type PixelSource, type RGB } from '../../scripts/lib/roofSample';

describe('roof colour classes (M110)', () => {
  it('reads hue, chroma and lightness', () => {
    expect(hcl(255, 0, 0)).toMatchObject({ h: 0, c: 1 });
    expect(hcl(0, 255, 0).h).toBe(120);
    expect(hcl(128, 128, 128).c).toBe(0);
  });

  it('puts real samples from the Kauppatori photo in the right class', () => {
    // sampled medians of real roofs (see docs/milestones/M110.md)
    expect(classifyRoof(251, 251, 249)).toBe('pale'); // white membrane
    expect(classifyRoof(40, 45, 56)).toBe('dark'); // bluish bitumen: dark, not blue
    expect(classifyRoof(55, 59, 72)).toBe('dark');
    expect(classifyRoof(105, 75, 79)).toBe('terracotta'); // dark red-brown
    expect(classifyRoof(177, 136, 115)).toBe('terracotta');
    expect(classifyRoof(164, 129, 120)).toBe('terracotta');
    expect(classifyRoof(211, 187, 153)).toBe('sand');
    expect(classifyRoof(191, 206, 205)).toBe('copper'); // pale verdigris
    expect(classifyRoof(92, 102, 75)).toBe('copper'); // olive
    expect(classifyRoof(90, 92, 98)).toBe('slate');
    expect(classifyRoof(125, 127, 132)).toBe('grey');
    expect(classifyRoof(170, 172, 176)).toBe('pale');
  });

  it('greys go from dark to pale with lightness', () => {
    const order = [20, 70, 110, 180].map((v) => ROOF_CLASSES.indexOf(classifyRoof(v, v, v)));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(4);
  });

  it('every class has three pastel colours, and the code round-trips', () => {
    for (const cls of Object.keys(ROOF_COLOURS) as (keyof typeof ROOF_COLOURS)[]) {
      expect(ROOF_COLOURS[cls]).toHaveLength(3);
      expect(roofColours(roofCode(cls))).toBe(ROOF_COLOURS[cls]);
      for (const c of ROOF_COLOURS[cls]) expect(hcl((c >> 16) & 255, (c >> 8) & 255, c & 255).l).toBeGreaterThan(0.35); // pastel: no black roofs
    }
    expect(roofColours(0)).toBeNull();
    expect(roofColours(undefined)).toBeNull();
  });
});

describe('roof sampling (M110)', () => {
  // a 20 x 10 m building at the origin; the picture is red in the middle, blue near the edges (walls and shadow), black in the courtyard
  const square = (x0: number, z0: number, x1: number, z1: number): number[] => [x0, z0, x1, z0, x1, z1, x0, z1];
  const photo: PixelSource = (x, z) => (Math.min(x, 20 - x, z, 10 - z) < 1.5 ? [20, 20, 200] : x > 8 && x < 12 && z > 4 && z < 6 ? [0, 0, 0] : [200, 30, 30]);

  it('measures the distance to the nearest edge', () => {
    expect(edgeDistance([square(0, 0, 20, 10)], 10, 5)).toBe(5);
    expect(edgeDistance([square(0, 0, 20, 10)], 1, 5)).toBe(1);
  });

  it('keeps the middle of the roof, not the edge strip', () => {
    const px = roofPixels([square(0, 0, 20, 10)], photo);
    expect(px.length).toBeGreaterThan(100);
    expect(px.every((c) => c[2] < 100)).toBe(true); // nothing blue
    expect(medianColour(px)).toEqual([200, 30, 30]);
  });

  it('leaves out a courtyard (a hole in the footprint)', () => {
    const withHole = [square(0, 0, 20, 10), square(8, 4, 12, 6)];
    const px = roofPixels(withHole, photo);
    expect(px.some((c) => c[0] === 0)).toBe(false);
    expect(px.length).toBeLessThan(roofPixels([square(0, 0, 20, 10)], photo).length);
  });

  it('a small building falls back to a thinner inset; a tiny one gives no sample', () => {
    const thin: PixelSource = () => [10, 200, 10];
    expect(roofPixels([square(0, 0, 3.4, 6)], thin).length).toBeGreaterThanOrEqual(12);
    expect(roofPixels([square(0, 0, 0.8, 0.8)], thin)).toEqual([]);
  });

  it('a picture that does not cover the building gives nothing; the median ignores a few odd pixels', () => {
    expect(roofPixels([square(0, 0, 20, 10)], () => null)).toEqual([]);
    expect(medianColour([])).toBeNull();
    const px: RGB[] = [...Array(9).fill([100, 100, 100]), [255, 0, 0]]; // one red solar panel
    expect(medianColour(px)).toEqual([100, 100, 100]);
  });
});

describe('roof classes in the generated city', () => {
  const b = (cityJson as unknown as { buildings: { r?: number }[] }).buildings;
  it('nearly every building has one, and they are valid codes', () => {
    expect(b.filter((x) => x.r).length / b.length).toBeGreaterThan(0.95);
    for (const x of b) if (x.r !== undefined) expect(ROOF_CLASSES[x.r]).toBeTruthy();
  });
  it('the city is mostly grey roofs with a few coloured ones, like the real one', () => {
    const count = (cls: string) => b.filter((x) => ROOF_CLASSES[x.r ?? 0] === cls).length;
    const greys = count('dark') + count('slate') + count('grey') + count('pale');
    expect(greys / b.length).toBeGreaterThan(0.8);
    expect(count('terracotta') + count('sand') + count('copper')).toBeGreaterThan(5);
  });
});

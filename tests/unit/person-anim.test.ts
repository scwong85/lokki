import { describe, expect, it } from 'vitest';
import { OUTFIT_BANDS, clipFor, outfitFor } from '../../src/gameplay/personAnim';

describe('person animation rules', () => {
  it('maps brain modes to clips', () => {
    expect(clipFor('walk', true)).toBe('walk');
    expect(clipFor('walk', false)).toBe('idle');
    expect(clipFor('panic', true)).toBe('run');
    expect(clipFor('chase', true)).toBe('run');
    expect(clipFor('chase', false)).toBe('idle');
    expect(clipFor('cheer', false)).toBe('jump');
    expect(clipFor('eat', false)).toBe('idle');
  });

  it('outfits are seeded, complete and keep the role colour as the shirt', () => {
    for (let seed = 0; seed < 500; seed++) {
      const o = outfitFor(seed, 0xd6f23c);
      for (const b of OUTFIT_BANDS) expect(typeof o[b.key]).toBe('number');
      expect(o.shirt).toBe(0xd6f23c);
      expect(outfitFor(seed, 0xd6f23c)).toEqual(o);
    }
    expect(outfitFor(1, 0, 0x123456).pants).toBe(0x123456);
  });

  it('texture bands cover the whole image in order', () => {
    expect(OUTFIT_BANDS[0].from).toBe(0);
    expect(OUTFIT_BANDS[OUTFIT_BANDS.length - 1].to).toBe(1);
    for (let i = 1; i < OUTFIT_BANDS.length; i++) expect(OUTFIT_BANDS[i].from).toBe(OUTFIT_BANDS[i - 1].to);
  });
});

import { describe, expect, it } from 'vitest';
import { fitCaption, limitAlbum, pickShowcase, type Polaroid } from '../../src/ui/polaroids';

const ph = (n: number): Polaroid => ({ url: `u${n}`, caption: `c${n}`, at: n });

describe('polaroids', () => {
  it('keeps only the newest photos', () => {
    const list = Array.from({ length: 15 }, (_, i) => ph(i));
    const kept = limitAlbum(list, 12);
    expect(kept).toHaveLength(12);
    expect(kept[0].at).toBe(3);
    expect(kept[11].at).toBe(14);
    expect(limitAlbum(list.slice(0, 5), 12)).toHaveLength(5);
  });
  it('trims long captions and tidies whitespace', () => {
    expect(fitCaption('  Take   the ball  ')).toBe('Take the ball');
    const long = fitCaption('Drop it on the poet\'s head and wait for applause');
    expect(long.length).toBeLessThanOrEqual(34);
    expect(long.endsWith('…')).toBe(true);
  });
  it('the showcase spreads across the run: first, middle, last', () => {
    const list = Array.from({ length: 9 }, (_, i) => ph(i));
    expect(pickShowcase(list).map((p) => p.at)).toEqual([0, 4, 8]);
    expect(pickShowcase(list.slice(0, 2)).map((p) => p.at)).toEqual([0, 1]);
    expect(pickShowcase([])).toEqual([]);
  });
});

/** Small seeded RNG (mulberry32) so gameplay randomness is reproducible. */
export interface Rng {
  next(): number;
  range(lo: number, hi: number): number;
  pick<T>(list: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    pick: (list) => list[Math.floor(next() * list.length)],
  };
}

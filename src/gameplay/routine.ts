import type { Rng } from '../core/rng';

/** A place where people stop on their way: take a photo of a landmark, look at something, rest. */
export interface Poi {
  /** The thing they look at (a statue, the ferry, the tower). */
  x: number;
  z: number;
  /** What they do there. */
  kind: 'photo' | 'watch' | 'rest';
  /** How far from it they stand (m). */
  stand?: number;
}

export type Stance = 'none' | 'photo' | 'watch' | 'rest';

/** The stops of one person's walk: a few different places, in an order of their own. Pure. */
export function pickRoutine(pois: readonly Poi[], rng: Rng, count = 3): Poi[] {
  const pool = [...pois];
  const out: Poi[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return out;
}

/** Where person `id` stands at a stop: a spot on a ring round the landmark (different for each person), and the way they face (towards it). */
export function standingSpot(poi: Poi, id: number, attempt = 0): { x: number; z: number; heading: number } {
  const a = id * 2.399963 + attempt * 1.7;
  const r = (poi.stand ?? 5) + (id % 3) * 0.9;
  const x = poi.x + Math.cos(a) * r, z = poi.z + Math.sin(a) * r;
  return { x, z, heading: Math.atan2(-(poi.x - x), -(poi.z - z)) };
}

/** How long they linger: photographers are quick, people resting stay a while. */
export function lingerSeconds(kind: Poi['kind'], rng: Rng): number {
  return kind === 'rest' ? rng.range(10, 20) : kind === 'photo' ? rng.range(5, 9) : rng.range(6, 12);
}

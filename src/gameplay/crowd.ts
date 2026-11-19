import { createRng } from '../core/rng';
import { tuning } from '../core/tuning';
import type { NpcSpawn } from './npc';
import { pickRoutine, type Poi } from './routine';

const COATS = [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8, 0xc7b5e0, 0xf2a35e, 0xe8d5c0, 0x9bd8b0];

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** How many strollers a level gets: its own number, else the stage default (campaign stages only). */
export function strollerCount(level: { strollers?: number; arc?: number; sandbox?: boolean }): number {
  if (level.strollers !== undefined) return level.strollers;
  return level.arc !== undefined && !level.sandbox ? Math.round(tuning.crowd.strollers.value) : 0;
}

/**
 * Background walkers around the start: harmless tourists (no items, role 'stroller') that wander between places, so the square is not a
 * diorama. Seeded by the level id so both players of a co-op game get the same crowd. Only standing room is used (`walkable`), and
 * nobody starts on top of a cast member.
 */
export function strollerSpawns(
  levelId: string,
  center: { x: number; z: number },
  count: number,
  walkable: (x: number, z: number) => boolean,
  taken: readonly { x: number; z: number }[] = [],
  pois: readonly Poi[] = [],
): NpcSpawn[] {
  const rng = createRng(hash(levelId));
  const out: NpcSpawn[] = [];
  const used = [...taken];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(tuning.crowd.minRadius.value, tuning.crowd.maxRadius.value);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    if (!walkable(x, z) || used.some((u) => Math.hypot(u.x - x, u.z - z) < 3)) continue;
    used.push({ x, z });
    out.push({ x, z, heading: rng.range(-Math.PI, Math.PI), role: 'stroller', color: COATS[out.length % COATS.length], wander: tuning.crowd.wander.value, routine: pois.length ? pickRoutine(pois, rng, 3) : undefined });
  }
  return out;
}

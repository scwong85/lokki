import type { NpcSpawn, Station } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import type { QuestDef } from '../quests';
import type { LevelDef } from './types';

/**
 * Moving a cluster of an older level (its people, props, bushes, buttons, wet-floor zones) somewhere else on the map, so the ten-minute
 * stages (docs/design/act1-v2.md) can spread the old chains out instead of stacking them on one patch.
 */
export interface Shift {
  dx: number;
  dz: number;
}
export const sh = <T extends { x: number; z: number }>(p: T, s: Shift): T => ({ ...p, x: p.x + s.dx, z: p.z + s.dz });
export const shZone = <T extends { minX: number; maxX: number; minZ: number; maxZ: number }>(z: T, s: Shift): T => ({ ...z, minX: z.minX + s.dx, maxX: z.maxX + s.dx, minZ: z.minZ + s.dz, maxZ: z.maxZ + s.dz });

export const shSpawn = (sp: NpcSpawn, s: Shift): NpcSpawn => ({
  ...sp,
  x: sp.x + s.dx,
  z: sp.z + s.dz,
  patrol: sp.patrol?.map((p) => sh(p, s)),
  signAt: sp.signAt && sh(sp.signAt, s),
});
export const shSpawns = (list: readonly NpcSpawn[] | undefined, s: Shift): NpcSpawn[] => (list ?? []).map((sp) => shSpawn(sp, s));
export const shProps = (list: readonly PropSpawn[] | undefined, s: Shift): PropSpawn[] => (list ?? []).map((p) => sh(p, s));
export const shStations = (list: readonly Station[] | undefined, s: Shift): Station[] => (list ?? []).map((st) => sh(st, s));
export const shHides = (list: LevelDef['hides'], s: Shift): NonNullable<LevelDef['hides']> => (list ?? []).map((h) => sh(h, s));
export const shSwitches = (list: LevelDef['switches'], s: Shift): NonNullable<LevelDef['switches']> => (list ?? []).map((w) => ({ ...sh(w, s), target: w.target && sh(w.target, s) }));
export const shSplat = (list: LevelDef['splatZones'], s: Shift): NonNullable<LevelDef['splatZones']> => (list ?? []).map((z) => ({ ...z, zone: shZone(z.zone, s) }));
/** A quest's map markers move with it (its steps are the same). */
export const shQuest = (q: QuestDef, s: Shift): QuestDef => ({ ...q, objectives: q.objectives.map((o) => ({ ...o, markers: o.markers?.map((m) => sh(m, s)) })) });

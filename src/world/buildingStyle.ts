/**
 * Style from the real building (M108, docs/design/realistic-city-research.md, layer 2 "real character"). The City's building register
 * gives each building its facade material and completion year; together they pick a style kit: the colour family, whether the roof is
 * pitched or flat, the window style, turrets and balconies. Buildings without register data keep the district rules (M29).
 * Pure: the city builder asks, the answers are plain numbers.
 */

/** Architectural eras of central Helsinki, by completion year. */
export type Era = 'unknown' | 'empire' | 'historicism' | 'jugend' | 'classicism' | 'functionalism' | 'modern';
export const ERAS: readonly Era[] = ['unknown', 'empire', 'historicism', 'jugend', 'classicism', 'functionalism', 'modern'];

/** Facade material, by the register's code (c_julkisivu): 1 concrete, 2 brick, 3 metal sheet, 4 stone, 5 wood, 6 glass, 7 other (around the
 * market almost always rendered plaster). 0 = no data. */
export type Facade = 'unknown' | 'concrete' | 'brick' | 'metal' | 'stone' | 'wood' | 'glass' | 'render';
export const FACADES_BY_CODE: readonly Facade[] = ['unknown', 'concrete', 'brick', 'metal', 'stone', 'wood', 'glass', 'render'];

/** The era a completion year falls in. */
export function eraOf(year: number | null | undefined): Era {
  if (!year || year < 1700) return 'unknown';
  if (year < 1870) return 'empire'; // Engel's Empire town, pale yellow render, low hipped roofs
  if (year < 1900) return 'historicism'; // neo-Renaissance: cornices, pediments
  if (year < 1920) return 'jugend'; // Art Nouveau: stone bases, towers, steep roofs
  if (year < 1930) return 'classicism'; // Nordic classicism: calm, pale, regular
  if (year < 1950) return 'functionalism'; // strip windows, flat roofs
  return 'modern';
}

/** The year from the register's completion date ("1902-01-01", 19020101, "1902"...). */
export function yearOf(built: unknown): number | null {
  if (built === null || built === undefined) return null;
  const m = /^(\d{4})/.exec(String(built));
  return m ? Number(m[1]) : null;
}

export const facadeOf = (code: unknown): Facade => FACADES_BY_CODE[Number(code)] ?? 'unknown';

export interface StyleKit {
  /** Wall colours to pick from (pastel); null = use the district palette. */
  walls: readonly number[] | null;
  /** Roof colours for pitched roofs (null = district). */
  roofs: readonly number[] | null;
  /** Pitched roof: 'yes' when the footprint allows, 'no' never, 'auto' the old seeded rule. */
  pitched: 'yes' | 'no' | 'auto';
  /** A mansard on a big flat block: allowed or not. */
  mansard: boolean;
  /** Main window style (index into the facade atlas: 0 classic, 1 tall arched, 2 wide ribbon, 3 small pair, 4 shuttered, 5 banded), or -1 = seeded. */
  window: number;
  /** Chance (0..1) of a corner turret on a tall block; -1 = the district rule. */
  turret: number;
  /** Chance multiplier for balconies. */
  balconies: number;
}

// pastel families: each real material or era keeps its colour family, at the game's pastel strength
const RENDER_EMPIRE = [0xf6e7b0, 0xf9efc9, 0xf2dfa0, 0xfdf6e0, 0xf7ebbd]; // Empire yellow and cream
const RENDER_HISTORICISM = [0xf3dcc4, 0xe9d6c3, 0xf6e3cf, 0xdfe5ea, 0xf1d9b8];
const RENDER_JUGEND = [0xe8c27a, 0xefb09a, 0xb7c9b4, 0xc98b73, 0xf2e2c4, 0xd9a38c];
const RENDER_CLASSIC = [0xf2d9c4, 0xf6ead2, 0xe6ddc9, 0xf3e1b5, 0xdfe7df];
const RENDER_MODERN = [0xfdfaf2, 0xf4efe6, 0xe9eef2, 0xf6f0de];
const BRICK = [0xd9907a, 0xe4a089, 0xc98270, 0xe8b39a, 0xd28f80]; // red-brown brick, softened
const STONE = [0xe9dfd0, 0xe2d8cc, 0xefe6d8, 0xdcd3c8]; // granite grey and beige, warmed to pastel
const CONCRETE = [0xefe9df, 0xe8e4dc, 0xf3eee4]; // pale concrete, warmed
const GLASS = [0xc6dcf2, 0xbfd9e6, 0xd2e5ec];
const METAL = [0xb7c3d6, 0xc3cbd6, 0xaeb9c9];
const WOOD = [0xf6d98f, 0xf2c4a2, 0xe8d3a8];
const TERRACOTTA = [0xd98c6f, 0xb9705c, 0xc97f66];
const COPPER = [0x8fc4ad, 0x93b9a6, 0x9fcbb8]; // verdigris, the green roofs of the old town
const SLATE = [0x9aa1b3, 0x8d8f99, 0x6f6a73];

/** The style kit for a building's era and facade material. */
export function styleKit(era: Era, facade: Facade): StyleKit {
  const kit: StyleKit = { walls: null, roofs: null, pitched: 'auto', mansard: true, window: -1, turret: -1, balconies: 1 };
  // the era: shape and rhythm
  switch (era) {
    case 'empire':
      Object.assign(kit, { walls: RENDER_EMPIRE, roofs: [...COPPER, ...SLATE], pitched: 'yes', mansard: false, window: 0, turret: 0, balconies: 0 });
      break;
    case 'historicism':
      Object.assign(kit, { walls: RENDER_HISTORICISM, roofs: [...SLATE, ...COPPER], window: 1, turret: 0.15, balconies: 0.6 });
      break;
    case 'jugend':
      Object.assign(kit, { walls: RENDER_JUGEND, roofs: [...SLATE, ...TERRACOTTA], window: 1, turret: 0.7, balconies: 1.2 });
      break;
    case 'classicism':
      Object.assign(kit, { walls: RENDER_CLASSIC, roofs: [...TERRACOTTA, ...SLATE], window: 0, turret: 0.05, balconies: 0.8 });
      break;
    case 'functionalism':
      Object.assign(kit, { walls: RENDER_MODERN, pitched: 'no', mansard: false, window: 2, turret: 0, balconies: 1.6 });
      break;
    case 'modern':
      Object.assign(kit, { walls: RENDER_MODERN, pitched: 'no', mansard: false, window: 5, turret: 0, balconies: 1.3 });
      break;
  }
  // the material: the colour family (render keeps the era's colours)
  switch (facade) {
    case 'brick':
      kit.walls = BRICK;
      break;
    case 'stone':
      kit.walls = STONE;
      break;
    case 'concrete':
      kit.walls = CONCRETE;
      break;
    case 'glass':
      kit.walls = GLASS;
      kit.window = 2;
      break;
    case 'metal':
      kit.walls = METAL;
      kit.pitched = 'no';
      break;
    case 'wood':
      kit.walls = WOOD;
      break;
  }
  return kit;
}

/** Compact codes for the generated city data: era index and facade index (0 = unknown). */
export const eraCode = (e: Era): number => ERAS.indexOf(e);
export const facadeCode = (f: Facade): number => FACADES_BY_CODE.indexOf(f);

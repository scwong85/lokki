/** Data-driven prop definitions (PLAN §4.3). Gameplay reads tags; NPCs will react to them in M5+. */
export type Tag = 'edible' | 'shiny' | 'noisy' | 'throwable' | 'fragile' | 'heavy' | 'hat' | 'container' | 'stackable' | 'paper';

export type Shape =
  | { kind: 'ball'; r: number }
  | { kind: 'box'; hx: number; hy: number; hz: number }
  | { kind: 'cyl'; hh: number; r: number }
  | { kind: 'capsule'; hh: number; r: number };

export type PropType = 'icecream' | 'fish' | 'bun' | 'cap' | 'tophat' | 'bottle' | 'bin' | 'crate' | 'chair' | 'candy' | 'salmiakki' | 'map' | 'toy' | 'flowers' | 'sign' | 'soup' | 'herring' | 'owl';

export interface PropDef {
  name: string;
  tags: readonly Tag[];
  /** kg */
  mass: number;
  shape: Shape;
  /** Bounding radius for poop hits and grab picking. */
  radius: number;
}

export const PROPS: Record<PropType, PropDef> = {
  icecream: { name: 'ice cream', tags: ['edible', 'throwable'], mass: 0.15, shape: { kind: 'capsule', hh: 0.12, r: 0.14 }, radius: 0.35 },
  fish: { name: 'fried vendace', tags: ['edible', 'throwable'], mass: 0.3, shape: { kind: 'box', hx: 0.3, hy: 0.06, hz: 0.12 }, radius: 0.35 },
  bun: { name: 'cinnamon bun', tags: ['edible', 'throwable'], mass: 0.2, shape: { kind: 'cyl', hh: 0.07, r: 0.2 }, radius: 0.25 },
  cap: { name: 'student cap', tags: ['hat', 'throwable', 'shiny'], mass: 0.15, shape: { kind: 'cyl', hh: 0.08, r: 0.22 }, radius: 0.28 },
  tophat: { name: 'top hat', tags: ['hat', 'throwable'], mass: 0.3, shape: { kind: 'cyl', hh: 0.16, r: 0.2 }, radius: 0.3 },
  bottle: { name: 'bottle', tags: ['fragile', 'noisy', 'shiny', 'throwable'], mass: 0.4, shape: { kind: 'capsule', hh: 0.16, r: 0.07 }, radius: 0.25 },
  bin: { name: 'litter bin', tags: ['heavy', 'noisy', 'container'], mass: 30, shape: { kind: 'cyl', hh: 0.5, r: 0.45 }, radius: 0.7 },
  crate: { name: 'crate', tags: ['heavy', 'stackable'], mass: 8, shape: { kind: 'box', hx: 0.4, hy: 0.35, hz: 0.4 }, radius: 0.65 },
  candy: { name: 'bag of sweets', tags: ['edible', 'throwable'], mass: 0.15, shape: { kind: 'box', hx: 0.1, hy: 0.12, hz: 0.05 }, radius: 0.3 },
  salmiakki: { name: 'bag of salmiakki', tags: ['edible', 'throwable'], mass: 0.15, shape: { kind: 'box', hx: 0.1, hy: 0.12, hz: 0.05 }, radius: 0.3 },
  map: { name: 'tourist map', tags: ['paper', 'throwable'], mass: 0.1, shape: { kind: 'box', hx: 0.18, hy: 0.02, hz: 0.13 }, radius: 0.3 },
  toy: { name: 'teddy bear', tags: ['throwable'], mass: 0.3, shape: { kind: 'box', hx: 0.28, hy: 0.32, hz: 0.2 }, radius: 0.5 },
  flowers: { name: 'bouquet', tags: ['throwable'], mass: 0.2, shape: { kind: 'box', hx: 0.12, hy: 0.2, hz: 0.12 }, radius: 0.35 },
  sign: { name: 'polished sign', tags: ['heavy', 'shiny'], mass: 60, shape: { kind: 'cyl', hh: 0.6, r: 0.32 }, radius: 0.75 },
  soup: { name: 'bowl of salmon soup', tags: ['edible', 'throwable'], mass: 0.4, shape: { kind: 'cyl', hh: 0.07, r: 0.17 }, radius: 0.3 },
  herring: { name: 'raw herring', tags: ['edible', 'throwable'], mass: 0.3, shape: { kind: 'box', hx: 0.26, hy: 0.04, hz: 0.1 }, radius: 0.32 },
  owl: { name: 'plastic owl', tags: ['throwable'], mass: 0.6, shape: { kind: 'capsule', hh: 0.12, r: 0.16 }, radius: 0.42 },
  chair: { name: 'chair', tags: ['heavy', 'noisy', 'stackable'], mass: 4, shape: { kind: 'box', hx: 0.25, hy: 0.45, hz: 0.25 }, radius: 0.55 },
};

/** Props with these quest tags are poop targets: the aim assist steers drops toward them (like toward people). */
export const POOP_TARGET_TAGS: ReadonlySet<string> = new Set(['cleanSign']);

export const hasTag = (t: PropType, tag: Tag): boolean => PROPS[t].tags.includes(tag);

/** Half-height of a shape (distance from centre to its lowest point when upright). */
export function halfHeight(s: Shape): number {
  switch (s.kind) {
    case 'ball': return s.r;
    case 'box': return s.hy;
    case 'cyl': return s.hh;
    case 'capsule': return s.hh + s.r;
  }
}

export type ImpactResult = 'break' | 'noise' | 'thump' | null;

/** What a hit at `speed` (m/s change of velocity) does to a prop. Pure rule, used by the prop manager. */
export function classifyImpact(type: PropType, speed: number, breakSpeed: number, noiseSpeed: number, thumpSpeed = Infinity): ImpactResult {
  if (hasTag(type, 'fragile') && speed >= breakSpeed) return 'break';
  if (hasTag(type, 'noisy') && speed >= noiseSpeed) return 'noise';
  if (speed >= thumpSpeed) return 'thump'; // anything thrown hard enough is heard
  return null;
}

/** Spawn height (centre) so that a prop of this type sits on a surface at `base`. */
export const restY = (type: PropType, base = 0): number => base + halfHeight(PROPS[type].shape) + 0.02;

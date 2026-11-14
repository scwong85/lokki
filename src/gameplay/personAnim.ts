import type { NpcMode } from './npc';

export type PersonClip = 'idle' | 'walk' | 'run' | 'jump' | 'working';

/** Which body animation a person plays for a brain mode. Pure. */
export function clipFor(mode: NpcMode, moving: boolean): PersonClip {
  switch (mode) {
    case 'walk':
      return moving ? 'walk' : 'idle';
    case 'panic':
    case 'chase':
      return moving ? 'run' : 'idle';
    case 'cheer':
      return 'jump';
    default:
      return 'idle';
  }
}

export interface Outfit {
  skin: number;
  eyes: number;
  hair: number;
  shirt: number;
  pants: number;
}

const SKINS = [0xffd19f, 0xf2c9a8, 0xd9a47c, 0xb98059, 0x8d5a3b, 0xf7d9bf];
const HAIR = [0x2b2622, 0x5a3b26, 0x8a5a33, 0xc9a26b, 0xe8d3a8, 0x9a9a9a, 0xb4532a];
const PANTS = [0x6d7a99, 0x4d5872, 0x8c7a63, 0xd8cdb8, 0x5f7d6e, 0x7a6d99, 0x3b4252];

/** Seeded clothes for a person; the role colour becomes the shirt (tourist jacket, vendor apron, Warden hi-vis). Pure. */
export function outfitFor(seed: number, shirt: number, pants?: number): Outfit {
  const h = (k: number) => {
    let x = (seed * 2654435761 + k * 40503) >>> 0;
    x ^= x >>> 15;
    x = Math.imul(x, 2246822519) >>> 0;
    return (x ^ (x >>> 13)) >>> 0;
  };
  return {
    skin: SKINS[h(1) % SKINS.length],
    eyes: 0x2a2a2a,
    hair: HAIR[h(2) % HAIR.length],
    shirt,
    pants: pants ?? PANTS[h(3) % PANTS.length],
  };
}

/** Texture bands (top to bottom of the image) of the Quaternius "Animated Human" texture layout. */
export const OUTFIT_BANDS: { key: keyof Outfit; from: number; to: number }[] = [
  { key: 'skin', from: 0, to: 0.188 },
  { key: 'eyes', from: 0.188, to: 0.344 },
  { key: 'hair', from: 0.344, to: 0.531 },
  { key: 'shirt', from: 0.531, to: 0.719 },
  { key: 'pants', from: 0.719, to: 1 },
];

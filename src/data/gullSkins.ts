/** Colour slots of the gull model; a skin gives every slot a colour. */
export type GullSlot = 'body' | 'head' | 'mantle' | 'tip' | 'mirror' | 'trail' | 'tail' | 'beak' | 'spot' | 'eye' | 'pupil' | 'ring' | 'legs';

export interface GullSkin {
  id: string;
  name: string;
  /** How to unlock it (shown on locked skins). */
  how: string;
  colours: Record<GullSlot, number>;
}

/** What the unlock rules look at (all kept in the save). */
export interface SkinProgress {
  skills: number;
  clears: number;
  speedrun: boolean;
}

const HERRING: Record<GullSlot, number> = {
  body: 0xffffff, head: 0xffffff, mantle: 0xb9c6d4, tip: 0x2f3440, mirror: 0xffffff, trail: 0xf4f6f8, tail: 0xffffff,
  beak: 0xf7c948, spot: 0xe0453a, eye: 0xf2e6a0, pupil: 0x1e1f26, ring: 0xe9784a, legs: 0xf2a7a0,
};

export const GULL_SKINS: GullSkin[] = [
  { id: 'herring', name: 'Herring gull', how: 'Your gull from day one.', colours: HERRING },
  {
    id: 'juvenile', name: 'Scruffy juvenile', how: 'Earn 3 skills.',
    colours: { ...HERRING, body: 0xd9c7b0, head: 0xe3d5c2, mantle: 0xa98d71, tip: 0x5b4636, mirror: 0x8c745e, trail: 0xc4ab90, tail: 0x8c745e, beak: 0x4a3b33, spot: 0x4a3b33, eye: 0x3b2f2a, ring: 0x6b5a4f, legs: 0xd9b8a8 },
  },
  {
    id: 'blackheaded', name: 'Black-headed gull', how: 'Earn all 7 skills.',
    colours: { ...HERRING, head: 0x4a3a35, mantle: 0xc6d0dc, beak: 0xc8323a, spot: 0xa02830, eye: 0x2a2224, ring: 0xd9d9d9, legs: 0xc8323a },
  },
  {
    id: 'kittiwake', name: 'Kittiwake', how: 'Clear the grand finale.',
    colours: { ...HERRING, mantle: 0xa9b6c6, mirror: 0x2f3440, beak: 0xf2df5a, spot: 0xf2df5a, eye: 0x1e1f26, ring: 0xd04a3a, legs: 0x2f3440 },
  },
  {
    id: 'golden', name: 'Golden legend', how: 'Finish a speedrun.',
    colours: { ...HERRING, body: 0xffe79a, head: 0xffe79a, mantle: 0xf2c24e, tip: 0xb8862b, mirror: 0xfff4c8, trail: 0xffefb8, tail: 0xffd86b, beak: 0xffffff, spot: 0xff9a3c, ring: 0xffb347 },
  },
];

/** The pigeon look for the Disguise skill (not a selectable skin). */
export const PIGEON: Record<GullSlot, number> = {
  body: 0x9aa3b8, head: 0x6f7a94, mantle: 0x7d869a, tip: 0x4a5068, mirror: 0x7d869a, trail: 0x8a93a8, tail: 0x4a5068,
  beak: 0x5a5060, spot: 0x5a5060, eye: 0xe8743c, pupil: 0x1e1f26, ring: 0xd9d9d9, legs: 0xd9708a,
};

/** Which skins this progress has unlocked. Pure. */
export function unlockedSkins(p: SkinProgress): string[] {
  const ok: Record<string, boolean> = {
    herring: true,
    juvenile: p.skills >= 3,
    blackheaded: p.skills >= 7,
    kittiwake: p.clears >= 1,
    golden: p.speedrun,
  };
  return GULL_SKINS.filter((s) => ok[s.id]).map((s) => s.id);
}

export const skinById = (id: string): GullSkin => GULL_SKINS.find((s) => s.id === id) ?? GULL_SKINS[0];

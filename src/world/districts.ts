/**
 * Where a building stands decides its colours, so the districts look like themselves: Empire yellow and cream at Senate Square,
 * pale stone on the Esplanadi, Jugend earth tones on Katajanokka, pale blues and yellows on the market front. Pastel strength.
 * The zones are hand-drawn boxes over the city map (metres from the market origin). Pure.
 */
export type District = 'senate' | 'esplanadi' | 'jugend' | 'market' | 'city';

export interface Palette {
  walls: readonly number[];
  /** Pitched roofs and flat or mansard roofs. */
  pitched: readonly number[];
  flat: readonly number[];
}

const ZONES: { id: District; x0: number; x1: number; z0: number; z1: number }[] = [
  { id: 'senate', x0: -250, x1: -95, z0: -440, z1: -255 },
  { id: 'esplanadi', x0: -640, x1: -110, z0: -165, z1: 45 },
  { id: 'jugend', x0: 170, x1: 430, z0: -300, z1: -60 },
  { id: 'market', x0: -110, x1: 170, z0: -120, z1: 40 },
];

export function districtOf(x: number, z: number): District {
  for (const q of ZONES) if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return q.id;
  return 'city';
}

/** `city` is the original mix (the rest of the map keeps its look). */
export const PALETTES: Record<District, Palette> = {
  city: {
    walls: [0xffe9c2, 0xffcfb0, 0xbfe8d4, 0xd9c9f0, 0xf6d98f, 0xf7c6c7, 0xc6dcf2, 0xfff6e6],
    pitched: [0xd98c6f, 0x8fc4ad, 0x9aa1b3, 0xb9705c, 0xd98c6f],
    flat: [0xe39a7e, 0xc7b5e0, 0xe8b39a, 0xa9cdbb, 0xdcd6cc, 0xb7c3d6, 0xd98c6f],
  },
  senate: {
    walls: [0xf6e7b0, 0xf9efc9, 0xf2dfa0, 0xfdf6e0, 0xf7ebbd],
    pitched: [0x8fc4ad, 0x9aa1b3, 0xb9705c],
    flat: [0x8fc4ad, 0x9aa1b3, 0xa9b0bd, 0x93b9a6],
  },
  esplanadi: {
    walls: [0xfff1d6, 0xe9e0d0, 0xdcd6cc, 0xf4ead8, 0xe6e2da, 0xf1dcc6],
    pitched: [0x9aa1b3, 0xb9705c, 0x8d8f99],
    flat: [0x9aa1b3, 0xa9b0bd, 0xb9705c, 0x8d8f99, 0xc7b5a8],
  },
  jugend: {
    walls: [0xe8c27a, 0xefb09a, 0xb7c9b4, 0xc98b73, 0xf2e2c4, 0xd9a38c],
    pitched: [0x6f6a73, 0x8a5f54, 0x7b8a85],
    flat: [0x6f6a73, 0x8a5f54, 0x7b8a85, 0x9a8b84],
  },
  market: {
    walls: [0xcfe3f2, 0xf8e6a8, 0xfdfaf2, 0xffd9bf, 0xe3eef5, 0xf3d9a4],
    pitched: [0x9aa1b3, 0xd98c6f, 0x8fc4ad],
    flat: [0xb7c3d6, 0xdcd6cc, 0xe39a7e, 0x9aa1b3],
  },
};

export const paletteAt = (x: number, z: number): Palette => PALETTES[districtOf(x, z)];

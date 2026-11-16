/** Sky presets (plain data): the colours of the dome, the fog, the sun and the light for a time of day. */
export type SkyId = 'morning' | 'noon' | 'golden' | 'dusk' | 'night';

export interface SkyPreset {
  /** Dome colours from the zenith down to the horizon, and the ground colour seen below the horizon (also the fog colour). */
  top: number;
  mid: number;
  horizon: number;
  fog: number;
  /** Direction towards the sun (not normalised). */
  sunDir: [number, number, number];
  sunColor: number;
  /** How big and bright the sun disc and its glow are (0 = no sun, e.g. at night). */
  sunSize: number;
  /** Hemisphere light: from above and from below. */
  hemiSky: number;
  hemiGround: number;
  /** Brightness of the lights, relative to the tuning values (1 = as tuned). */
  light: number;
  cloud: number;
  /** 0..1: how many clouds. */
  cloudAmount: number;
}

export const SKIES: Record<SkyId, SkyPreset> = {
  // today's look, with a slightly tinted hemisphere light (blue-white from above, warm from below)
  noon: { top: 0x9ec9f0, mid: 0xc4dff5, horizon: 0xfde8d7, fog: 0xfde8d7, sunDir: [30, 50, 20], sunColor: 0xfff2cc, sunSize: 1, hemiSky: 0xf2f7ff, hemiGround: 0xf3e0d2, light: 1, cloud: 0xffffff, cloudAmount: 0.7 },
  morning: { top: 0x9ab8e8, mid: 0xd2d4ee, horizon: 0xffd9c4, fog: 0xffe0cf, sunDir: [-45, 22, 30], sunColor: 0xffe0b8, sunSize: 1.3, hemiSky: 0xe6ecff, hemiGround: 0xf6d6c6, light: 0.95, cloud: 0xfff0e8, cloudAmount: 0.6 },
  golden: { top: 0x8aa4d8, mid: 0xe8c6c0, horizon: 0xffc89a, fog: 0xffd2ae, sunDir: [55, 16, -20], sunColor: 0xffc27a, sunSize: 1.6, hemiSky: 0xdfe0f5, hemiGround: 0xf4c9a6, light: 0.9, cloud: 0xffe0cc, cloudAmount: 0.8 },
  dusk: { top: 0x4d5a98, mid: 0xa890b8, horizon: 0xf5a98e, fog: 0xc99aa4, sunDir: [60, 6, -25], sunColor: 0xff9f7a, sunSize: 1.8, hemiSky: 0xb8bfe8, hemiGround: 0xe3b0a0, light: 0.6, cloud: 0xe8b8c0, cloudAmount: 0.7 },
  // the night market: the old values, with a moon instead of a sun
  night: { top: 0x1b2140, mid: 0x4a4f7a, horizon: 0xc78a9a, fog: 0x4a4f7a, sunDir: [-30, 40, 20], sunColor: 0xffc9a0, sunSize: 0.35, hemiSky: 0xaab4e8, hemiGround: 0x8d7f9c, light: 0.38, cloud: 0x6a6f9a, cloudAmount: 0.4 },
};

export const skyById = (id: string | undefined): SkyPreset => SKIES[(id as SkyId) in SKIES ? (id as SkyId) : 'noon'];

/** Linear blend of two presets (for a run that moves from afternoon to dusk). Colours are mixed per channel. */
export function blendSky(a: SkyPreset, b: SkyPreset, t: number): SkyPreset {
  const mixC = (x: number, y: number): number => {
    const r = Math.round(((x >> 16) & 255) * (1 - t) + ((y >> 16) & 255) * t);
    const g = Math.round(((x >> 8) & 255) * (1 - t) + ((y >> 8) & 255) * t);
    const bl = Math.round((x & 255) * (1 - t) + (y & 255) * t);
    return (r << 16) | (g << 8) | bl;
  };
  const n = (x: number, y: number) => x * (1 - t) + y * t;
  return {
    top: mixC(a.top, b.top), mid: mixC(a.mid, b.mid), horizon: mixC(a.horizon, b.horizon), fog: mixC(a.fog, b.fog),
    sunDir: [n(a.sunDir[0], b.sunDir[0]), n(a.sunDir[1], b.sunDir[1]), n(a.sunDir[2], b.sunDir[2])],
    sunColor: mixC(a.sunColor, b.sunColor), sunSize: n(a.sunSize, b.sunSize), hemiSky: mixC(a.hemiSky, b.hemiSky), hemiGround: mixC(a.hemiGround, b.hemiGround),
    light: n(a.light, b.light), cloud: mixC(a.cloud, b.cloud), cloudAmount: n(a.cloudAmount, b.cloudAmount),
  };
}

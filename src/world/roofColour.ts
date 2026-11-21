/**
 * Real roof colours (M110, docs/design/realistic-city-research.md, layer 3). The build script samples each building's roof in the City's
 * orthophoto and reduces it to one of a few classes; the game maps a class to pastel colours. So the lightness and the family of a roof
 * are real (the dark bitumen block, the white membrane, the red-brown tiles, the green copper), the colours themselves stay pastel. Pure.
 */
export type RoofClass = 'dark' | 'slate' | 'grey' | 'pale' | 'terracotta' | 'sand' | 'copper';
/** Codes stored in the generated city data (0 = unknown). */
export const ROOF_CLASSES: readonly (RoofClass | 'unknown')[] = ['unknown', 'dark', 'slate', 'grey', 'pale', 'terracotta', 'sand', 'copper'];

/** The pastel colours of each class (a building picks one by its id). */
export const ROOF_COLOURS: Record<RoofClass, readonly number[]> = {
  dark: [0x7d7885, 0x78808f, 0x827e8b],
  slate: [0x9ba1b0, 0xa6acba, 0x949db0],
  grey: [0xbec3cf, 0xb6bbc8, 0xc8ccd6],
  pale: [0xe9e6df, 0xf1eee7, 0xdfdbd2],
  terracotta: [0xd98c6f, 0xb9705c, 0xc97f66],
  sand: [0xdcc3a0, 0xd3b896, 0xe3cfae],
  copper: [0x8fc4ad, 0x93b9a6, 0x9fcbb8],
};

/** Hue (degrees), chroma (0..1, max minus min channel) and lightness (0..1, HSL) of an sRGB colour. */
export function hcl(r: number, g: number, b: number): { h: number; c: number; l: number } {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  let h = 0;
  if (d > 0) {
    h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, c: d, l: (mx + mn) / 2 };
}

/**
 * The class of a sampled roof colour. Chroma and hue pick the coloured roofs (the bluish dark zinc and bitumen count as dark grey, not as
 * blue); everything else is a grey by lightness.
 */
export function classifyRoof(r: number, g: number, b: number): RoofClass {
  const { h, c, l } = hcl(r, g, b);
  if (l >= 0.88) return 'pale'; // white membrane, bright concrete
  if (c >= 0.05 && h >= 65 && h <= 190) return 'copper'; // verdigris and green roofs
  if (c >= 0.09 && (h < 28 || h >= 340)) return 'terracotta'; // red and brown tiles or sheet
  if (c >= 0.15 && h >= 28 && h < 62) return 'sand'; // yellow-beige
  if (l < 0.25) return 'dark';
  if (l < 0.38) return 'slate';
  if (l < 0.55) return 'grey';
  return 'pale';
}

export const roofCode = (cls: RoofClass): number => ROOF_CLASSES.indexOf(cls);

/** The pastel colours for a stored roof code, or null when unknown. */
export function roofColours(code: number | undefined): readonly number[] | null {
  const cls = ROOF_CLASSES[code ?? 0];
  return cls && cls !== 'unknown' ? ROOF_COLOURS[cls] : null;
}

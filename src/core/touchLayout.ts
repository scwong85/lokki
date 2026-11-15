/**
 * Where the on-screen buttons sit (phones and tablets). Positions are the button centres as fractions of the screen, so
 * they fit any device. A layout is for a right- or left-handed player; players can drag buttons to arrange them. Pure.
 */
export type ButtonId = 'KeyE' | 'KeyQ' | 'KeyF' | 'ShiftLeft' | 'Space';
export type Layout = Record<ButtonId, { x: number; y: number }>;
export type Hand = 'right' | 'left';

export const BUTTON_IDS: ButtonId[] = ['Space', 'ShiftLeft', 'KeyF', 'KeyE', 'KeyQ'];

/** A thumb arc around the bottom-right corner: Flap closest, Dive beside it, Poop above, Grab and Toss in reach. */
export const DEFAULT_RIGHT: Layout = {
  Space: { x: 0.9, y: 0.76 },
  ShiftLeft: { x: 0.78, y: 0.85 },
  KeyF: { x: 0.92, y: 0.5 },
  KeyE: { x: 0.77, y: 0.65 },
  KeyQ: { x: 0.66, y: 0.82 },
};

export const clampSpot = (s: { x: number; y: number }): { x: number; y: number } => ({ x: Math.min(0.96, Math.max(0.04, s.x)), y: Math.min(0.94, Math.max(0.08, s.y)) });

/** The mirror image (left-handed). */
export function mirror(l: Layout): Layout {
  const out = {} as Layout;
  for (const id of BUTTON_IDS) out[id] = { x: 1 - l[id].x, y: l[id].y };
  return out;
}

export const defaultLayout = (hand: Hand): Layout => (hand === 'right' ? DEFAULT_RIGHT : mirror(DEFAULT_RIGHT));

/** Saved layouts for both hands; anything missing or broken falls back to the default. */
export interface SavedLayouts {
  right?: Partial<Layout>;
  left?: Partial<Layout>;
}

export function sanitizeLayouts(raw: unknown): SavedLayouts {
  const out: SavedLayouts = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const hand of ['right', 'left'] as Hand[]) {
    const src = (raw as Record<string, unknown>)[hand];
    if (!src || typeof src !== 'object') continue;
    const l: Partial<Layout> = {};
    for (const id of BUTTON_IDS) {
      const s = (src as Record<string, { x?: unknown; y?: unknown }>)[id];
      if (s && typeof s.x === 'number' && typeof s.y === 'number' && Number.isFinite(s.x) && Number.isFinite(s.y)) l[id] = clampSpot({ x: s.x, y: s.y });
    }
    out[hand] = l;
  }
  return out;
}

/** The layout to use for a hand: the saved spots over the default. */
export function layoutFor(hand: Hand, saved: SavedLayouts): Layout {
  return { ...defaultLayout(hand), ...(saved[hand] ?? {}) };
}

const KEY = 'lokki.touchlayout';

export function loadLayouts(storage: Pick<Storage, 'getItem'> | null = safe()): SavedLayouts {
  try {
    return sanitizeLayouts(JSON.parse(storage?.getItem(KEY) ?? 'null'));
  } catch {
    return {};
  }
}

export function saveLayouts(s: SavedLayouts, storage: Pick<Storage, 'setItem'> | null = safe()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: the arrangement lasts for this visit */
  }
}

function safe(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

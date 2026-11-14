import { tuning } from './tuning';
import type { StorageLike } from './save';

export interface Options {
  version: 1;
  master: number;
  music: number;
  sfx: number;
  sensitivity: number;
  /** Screen shake and other camera juice, 0 = off. */
  shake: number;
  /** The first-flight tutorial was finished (or skipped). */
  tutorialDone: boolean;
  /** Shadows and full resolution (high) or the fast path (low). */
  graphics: 'high' | 'low';
}

export const defaultOptions = (): Options => ({
  version: 1,
  master: tuning.audio.master.value,
  music: tuning.audio.music.value,
  sfx: tuning.audio.sfx.value,
  sensitivity: tuning.camera.mouseSensitivity.value,
  shake: tuning.juice.shake.value,
  tutorialDone: false,
  graphics: 'high',
});

const RANGES = {
  master: [0, 1],
  music: [0, 1],
  sfx: [0, 1],
  sensitivity: [0.0005, 0.01],
  shake: [0, 1],
} as const;

const clampNum = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/** Whatever was stored -> valid options (never throws). */
export function sanitizeOptions(raw: unknown, base: Options = defaultOptions()): Options {
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const o = { ...base };
  for (const k of Object.keys(RANGES) as (keyof typeof RANGES)[]) o[k] = clampNum(r[k], RANGES[k][0], RANGES[k][1], base[k]);
  o.tutorialDone = r.tutorialDone === true;
  o.graphics = r.graphics === 'low' ? 'low' : 'high';
  return o;
}

/** Push the options into the tuning object (so the debug panel shows the same values). */
export function applyOptions(o: Options): void {
  tuning.audio.master.value = o.master;
  tuning.audio.music.value = o.music;
  tuning.audio.sfx.value = o.sfx;
  tuning.camera.mouseSensitivity.value = o.sensitivity;
  tuning.juice.shake.value = o.shake;
}

export class OptionsStore {
  constructor(private storage: StorageLike | null = defaultStorage(), private key = 'lokki-options-v1') {}

  load(): Options {
    try {
      const t = this.storage?.getItem(this.key);
      return t ? sanitizeOptions(JSON.parse(t)) : defaultOptions();
    } catch {
      return defaultOptions();
    }
  }

  save(o: Options): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(o));
    } catch {
      /* no storage: the options just last for this visit */
    }
  }
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const OPTION_SLIDERS: { key: 'master' | 'music' | 'sfx' | 'sensitivity' | 'shake'; label: string; min: number; max: number; step: number }[] = [
  { key: 'master', label: 'Volume', min: 0, max: 1, step: 0.05 },
  { key: 'music', label: 'Music', min: 0, max: 1, step: 0.05 },
  { key: 'sfx', label: 'Sound effects', min: 0, max: 1, step: 0.05 },
  { key: 'sensitivity', label: 'Mouse look', min: 0.0005, max: 0.008, step: 0.0005 },
  { key: 'shake', label: 'Screen shake', min: 0, max: 1, step: 0.1 },
];

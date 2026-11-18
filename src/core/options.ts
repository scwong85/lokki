import { tuning } from './tuning';
import { COMFORT, comfort, type CamFollow, type Comfort } from './comfort';
import type { StorageLike } from './save';
import { HIGHLIGHTS, type Highlight } from '../gameplay/itemGlow';
import { HUD_MODES, type HudMode } from '../ui/hudMode';

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
  /** Ink outline and soft look on top of high graphics. */
  inkLook: boolean;
  /** Sparkle on loose items: off, subtle or strong. */
  highlight: Highlight;
  /** How much HUD to show (full / minimal / off). */
  hud: HudMode;
  /** Touch: how fast dragging turns the view. */
  touchLook: number;
  /** Touch: which thumb works the buttons. */
  touchHand: 'right' | 'left';
  /** Comfort preset (motion sickness): standard, gentle or calm. */
  comfort: Comfort;
  /** Field of view in degrees, camera distance, invert vertical look, smooth steering, and the camera following the gull's heading. */
  fov: number;
  camDistance: number;
  invertY: boolean;
  smoothSteer: boolean;
  camFollow: CamFollow;
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
  inkLook: true,
  highlight: 'subtle',
  hud: 'full',
  touchLook: 2.6,
  touchHand: 'right',
  comfort: 'standard',
  fov: tuning.camera.fov.value,
  camDistance: tuning.camera.distance.value,
  invertY: false,
  smoothSteer: true,
  camFollow: 'gentle',
});

const RANGES = {
  master: [0, 1],
  music: [0, 1],
  sfx: [0, 1],
  sensitivity: [0.0005, 0.01],
  shake: [0, 1],
  touchLook: [0.5, 6],
  fov: [60, 100],
  camDistance: [4, 12],
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
  o.inkLook = r.inkLook !== false;
  o.highlight = HIGHLIGHTS.includes(r.highlight as Highlight) ? (r.highlight as Highlight) : 'subtle';
  o.touchHand = r.touchHand === 'left' ? 'left' : 'right';
  o.comfort = r.comfort === 'gentle' || r.comfort === 'calm' ? r.comfort : 'standard';
  o.invertY = r.invertY === true;
  o.smoothSteer = r.smoothSteer !== false;
  o.camFollow = r.camFollow === 'off' || r.camFollow === 'strong' ? r.camFollow : 'gentle';
  o.hud = HUD_MODES.includes(r.hud as HudMode) ? (r.hud as HudMode) : 'full';
  return o;
}

/** Push the options into the tuning object (so the debug panel shows the same values). */
export function applyOptions(o: Options): void {
  tuning.audio.master.value = o.master;
  tuning.audio.music.value = o.music;
  tuning.audio.sfx.value = o.sfx;
  tuning.camera.mouseSensitivity.value = o.sensitivity;
  tuning.juice.shake.value = o.shake;
  tuning.touch.lookScale.value = o.touchLook;
  tuning.camera.fov.value = o.fov;
  tuning.camera.distance.value = o.camDistance;
  comfort.mods = COMFORT[o.comfort];
  comfort.invertY = o.invertY;
  comfort.smoothSteer = o.smoothSteer;
  comfort.follow = o.camFollow;
}

export class OptionsStore {
  constructor(private storage: StorageLike | null = defaultStorage(), private key = 'lokki-options-v1') {}

  /** Has this browser saved options before? (phones start on the low preset only the first time) */
  has(): boolean {
    try {
      return !!this.storage?.getItem(this.key);
    } catch {
      return false;
    }
  }

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

export const OPTION_SLIDERS: { key: 'master' | 'music' | 'sfx' | 'sensitivity' | 'shake' | 'touchLook' | 'fov' | 'camDistance'; label: string; min: number; max: number; step: number; touchOnly?: boolean }[] = [
  { key: 'master', label: 'Volume', min: 0, max: 1, step: 0.05 },
  { key: 'music', label: 'Music', min: 0, max: 1, step: 0.05 },
  { key: 'sfx', label: 'Sound effects', min: 0, max: 1, step: 0.05 },
  { key: 'sensitivity', label: 'Mouse look', min: 0.0005, max: 0.008, step: 0.0005 },
  { key: 'shake', label: 'Screen shake', min: 0, max: 1, step: 0.1 },
  { key: 'fov', label: 'Field of view', min: 60, max: 100, step: 1 },
  { key: 'camDistance', label: 'Camera distance', min: 4, max: 12, step: 0.5 },
  { key: 'touchLook', label: 'Touch look speed', min: 0.5, max: 6, step: 0.1, touchOnly: true },
];

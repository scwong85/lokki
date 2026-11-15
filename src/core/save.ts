import { skillById } from '../data/skills';
import { GULL_SKINS } from '../data/gullSkins';
import type { LevelRecord, Stars } from '../gameplay/level';

function sanitizeLevels(v: unknown): Record<string, LevelRecord> {
  const out: Record<string, LevelRecord> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [id, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const st = Array.isArray(r.stars) ? r.stars : [];
    const stars: Stars = [st[0] === true, st[1] === true, st[2] === true];
    out[id] = { stars, best: typeof r.best === 'number' && r.best > 0 ? r.best : null, clears: typeof r.clears === 'number' && r.clears > 0 ? Math.floor(r.clears) : 0 };
  }
  return out;
}

export interface SaveData {
  version: 1;
  /** Earned skills. */
  skills: string[];
  /** Quests finished in the current run. */
  questsWon: string[];
  /** The finale was cleared once: replay variants are available. */
  replayUnlocked: boolean;
  /** Extra objectives switched on. */
  extrasOn: boolean;
  /** Fastest full clear in seconds (any mode) and fastest speedrun. */
  bestTime: number | null;
  speedrunBest: number | null;
  clears: number;
  muted: boolean;
  /** Chosen gull look (an id from data/gullSkins). */
  skin: string;
  /** Per level: best stars, best time, clears (M12). */
  levels: Record<string, LevelRecord>;
  /** The level last played (the level select opens on it). */
  level: string;
}

export const blankSave = (): SaveData => ({ version: 1, skills: [], questsWon: [], replayUnlocked: false, extrasOn: false, bestTime: null, speedrunBest: null, clears: 0, muted: false, skin: 'herring', levels: {}, level: 'sandbox' });

/** The small part of the Storage API we need (so tests can pass a fake). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Turn whatever was stored into a valid SaveData (never throws; unknown skills and junk are dropped). */
export function sanitize(raw: unknown): SaveData {
  const d = blankSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  d.skills = strs(r.skills).filter((id) => skillById(id));
  d.questsWon = strs(r.questsWon);
  d.replayUnlocked = r.replayUnlocked === true;
  d.extrasOn = r.extrasOn === true && d.replayUnlocked;
  d.bestTime = num(r.bestTime);
  d.speedrunBest = num(r.speedrunBest);
  d.clears = typeof r.clears === 'number' && r.clears > 0 ? Math.floor(r.clears) : 0;
  d.muted = r.muted === true;
  d.levels = sanitizeLevels(r.levels);
  d.level = typeof r.level === 'string' ? r.level : 'sandbox';
  d.skin = typeof r.skin === 'string' && GULL_SKINS.some((s) => s.id === r.skin) ? r.skin : 'herring';
  return d;
}

/**
 * localStorage save. Every call is safe: private windows and blocked storage just mean "no save",
 * the game keeps working.
 */
export class SaveStore {
  constructor(private storage: StorageLike | null = defaultStorage(), private key = 'lokki-save-v1') {}

  get available(): boolean {
    return this.storage !== null;
  }

  load(): SaveData {
    try {
      const text = this.storage?.getItem(this.key);
      return text ? sanitize(JSON.parse(text)) : blankSave();
    } catch {
      return blankSave();
    }
  }

  save(d: SaveData): boolean {
    try {
      this.storage?.setItem(this.key, JSON.stringify(d));
      return this.storage !== null;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* nothing to do */
    }
  }
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // accessing localStorage can itself throw (blocked site data)
  }
}

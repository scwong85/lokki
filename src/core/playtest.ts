/**
 * Playtest notes (docs/design/puzzle-quality.md): after a chain objective, the player can tap a rating. The notes are kept in
 * the browser and exported as JSON (F3 panel: "Copy playtest notes") so playtests become data about the puzzle questions.
 */
export type Rating = 'stuck' | 'got' | 'funny';

export interface PlaytestEntry {
  level: string;
  quest: string;
  rating: Rating;
  /** Seconds since the level started. */
  at: number;
  /** When it was written (ISO). */
  when: string;
}

const KEY = 'lokki-playtest-v1';

export class PlaytestLog {
  entries: PlaytestEntry[] = [];

  constructor(private store: Pick<Storage, 'getItem' | 'setItem'> | null = null) {
    try {
      const raw = store?.getItem(KEY);
      if (raw) this.entries = JSON.parse(raw) as PlaytestEntry[];
    } catch {
      this.entries = [];
    }
  }

  add(level: string, quest: string, rating: Rating, at: number, when = new Date().toISOString()): void {
    this.entries.push({ level, quest, rating, at: Math.round(at), when });
    if (this.entries.length > 500) this.entries.shift();
    try {
      this.store?.setItem(KEY, JSON.stringify(this.entries));
    } catch {
      /* private mode: keep it in memory */
    }
  }

  /** Per quest: how many said stuck, got it, funny. */
  summary(): Record<string, Record<Rating, number>> {
    const out: Record<string, Record<Rating, number>> = {};
    for (const e of this.entries) {
      const k = `${e.level}/${e.quest}`;
      (out[k] ??= { stuck: 0, got: 0, funny: 0 })[e.rating]++;
    }
    return out;
  }

  json(): string {
    return JSON.stringify({ summary: this.summary(), entries: this.entries }, null, 2);
  }
}

export const RATING_KEYS: Record<string, Rating> = { Digit7: 'stuck', Digit8: 'got', Digit9: 'funny' };

/** The recap of a won chain: what you did and what the world did, in order. */
export function recapOf(objectives: readonly { text: string; recap?: string }[]): string {
  return objectives.map((o) => o.recap ?? o.text).join(' \u2192 ');
}

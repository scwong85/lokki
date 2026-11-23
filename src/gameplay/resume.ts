import type { QuestState, QuestStatus } from './quest';
import type { StorageLike } from '../core/save';

/**
 * Resume a stage (M121): a ten-minute stage keeps its progress (which quests and steps are done, which things lie on the roof) in the
 * browser, so a closed tab or a phone that dropped the page does not cost the run. One saved run at a time (the latest). Pure apart from
 * the storage it is given.
 */
export interface ResumeData {
  v: 1;
  level: string;
  /** Date.now() when saved. */
  at: number;
  quests: { id: string; status: QuestStatus; done: boolean[]; count: number[] }[];
  /** Quest tags of the things delivered to the roof, in order. */
  rows: string[];
  /** Courses served (1-based), so the world can catch up (the ferry crowd, the Guard). */
  courses: number[];
}

export function captureResume(level: string, quests: readonly QuestState[], rows: readonly string[], courses: readonly number[], now = Date.now()): ResumeData {
  return { v: 1, level, at: now, quests: quests.map((q) => ({ id: q.id, status: q.status, done: q.objectives.map((o) => o.done), count: q.objectives.map((o) => o.count) })), rows: [...rows], courses: [...courses] };
}

/** Is there anything worth resuming (at least one step done)? */
export const worthResuming = (d: ResumeData): boolean => d.quests.some((q) => q.done.some(Boolean));

/** How many steps are done (for the offer: "3 things on the roof"). */
export const resumeSummary = (d: ResumeData): string => (d.rows.length ? `${d.rows.length} thing${d.rows.length === 1 ? '' : 's'} on the roof` : `${d.quests.reduce((n, q) => n + q.done.filter(Boolean).length, 0)} steps done`);

/** Put the saved progress back into a freshly loaded level's quests (only quests and steps that still exist). */
export function applyResume(quests: QuestState[], d: ResumeData): void {
  for (const s of d.quests) {
    const q = quests.find((x) => x.id === s.id);
    if (!q) continue;
    q.status = s.status === 'lost' ? 'active' : s.status;
    q.objectives.forEach((o, i) => {
      if (i < s.done.length) {
        o.done = s.done[i];
        o.count = s.count[i] ?? (s.done[i] ? 1 : 0);
      }
    });
  }
}

const KEY = 'lokki-resume-v1';

export class ResumeStore {
  constructor(private storage: StorageLike | null) {}

  load(level: string, maxAgeMs = 1000 * 60 * 60 * 24 * 14): ResumeData | null {
    try {
      const raw = this.storage?.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as ResumeData;
      if (d?.v !== 1 || d.level !== level || !Array.isArray(d.quests) || Date.now() - d.at > maxAgeMs) return null;
      return worthResuming(d) ? d : null;
    } catch {
      return null;
    }
  }

  save(d: ResumeData): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(d));
    } catch {
      /* private mode or full storage: no resume, nothing breaks */
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
  }
}

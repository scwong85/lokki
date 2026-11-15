import type { LevelDef } from '../data/levels/types';
import type { QuestDef } from '../data/quests';
import type { TriggerDef } from './triggers';
import type { NpcSpawn } from './npc';
import type { PropSpawn } from './props';

/** What the game builds for a level. Pure. */
export interface LevelSetup {
  quests: QuestDef[];
  triggers: TriggerDef[];
  tourists: NpcSpawn[];
  defense: boolean;
  /** Props placed just for the level. */
  props: PropSpawn[];
  /** Secret to-dos ("???" until done). */
  secret: Set<string>;
  /** The to-dos that clear the level. */
  main: string[];
}

export function levelSetup(def: LevelDef, allQuests: readonly QuestDef[], allTriggers: readonly TriggerDef[], allTourists: readonly NpcSpawn[]): LevelSetup {
  const pick = <T extends { id: string }>(ids: readonly string[], from: readonly T[], what: string): T[] =>
    ids.map((id) => {
      const x = from.find((f) => f.id === id);
      if (!x) throw new Error(`level ${def.id}: unknown ${what} "${id}"`);
      return x;
    });
  const quests = [...pick(def.quests, allQuests, 'quest'), ...(def.extraQuests ?? [])];
  const triggers = [...pick(def.triggers, allTriggers, 'trigger'), ...(def.extraTriggers ?? [])];
  const tourists = [...(def.tourists === 'all' ? allTourists : allTourists.filter((t) => (def.tourists as string[]).includes(t.role ?? 'any'))), ...(def.extraTourists ?? [])];
  const secret = new Set(def.secret ?? []);
  return { quests, triggers, tourists, props: def.extraProps ?? [], defense: def.defense, secret, main: quests.map((q) => q.id).filter((id) => !secret.has(id)) };
}

export interface LevelProgress {
  cleared: boolean;
  allDone: boolean;
}

/** Cleared when every main to-do is won; "all done" adds the secret ones. Sandboxes are never "cleared". */
export function levelProgress(def: LevelDef, setup: LevelSetup, quests: readonly { id: string; status: string }[]): LevelProgress {
  if (def.sandbox) return { cleared: false, allDone: false };
  const won = (id: string) => quests.find((q) => q.id === id)?.status === 'won';
  const cleared = setup.main.length > 0 && setup.main.every(won);
  return { cleared, allDone: cleared && [...setup.secret].every(won) };
}

export type Stars = [boolean, boolean, boolean];

/** ★ clear · ★ every to-do including the secret ones · ★ within the par time. */
export function levelStars(def: LevelDef, p: LevelProgress, seconds: number): Stars {
  return [p.cleared, p.allDone, p.cleared && def.parTime !== undefined && seconds <= def.parTime];
}

export interface LevelRecord {
  stars: Stars;
  best: number | null;
  clears: number;
}

export const blankRecord = (): LevelRecord => ({ stars: [false, false, false], best: null, clears: 0 });

/** Keep the best of an old and a new result (stars are earned for good). */
export function mergeRecord(prev: LevelRecord | undefined, stars: Stars, seconds: number): LevelRecord {
  const p = prev ?? blankRecord();
  return {
    stars: [p.stars[0] || stars[0], p.stars[1] || stars[1], p.stars[2] || stars[2]],
    best: stars[0] ? (p.best === null ? seconds : Math.min(p.best, seconds)) : p.best,
    clears: p.clears + (stars[0] ? 1 : 0),
  };
}

/** A level is open when it has no prerequisite, or the prerequisite has been cleared. */
export const levelUnlocked = (def: LevelDef, records: Record<string, LevelRecord>): boolean => !def.requires || !!records[def.requires]?.stars[0];

export const starCount = (r: LevelRecord | undefined): number => (r ? r.stars.filter(Boolean).length : 0);

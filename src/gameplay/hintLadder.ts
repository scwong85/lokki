import { tuning } from '../core/tuning';
import type { QuestDef } from '../data/quests';
import type { QuestState } from './quest';

/**
 * The hint ladder (M94). A step shows only the outcome at first. If nothing happens for a while it adds a cryptic line (rung 1), then
 * puts its marker on the map (rung 2, a cue from the world), then spells the solution out (rung 3). The player can ask for the
 * next rung at any time, and an option turns the ladder off (everything shown at once, as before) or hides the timed rungs.
 * Pure logic: `tick` is told which steps are the ones being worked on now.
 */
export type HintMode = 'ladder' | 'full' | 'asked';
export const HINT_MODES: readonly HintMode[] = ['ladder', 'full', 'asked'];
export const HINT_NAMES: Record<HintMode, string> = { ladder: 'Hints: gradual', full: 'Hints: all at once', asked: 'Hints: only when I ask' };
export const MAX_RUNG = 3;

export const stepKey = (quest: string, objective: string): string => `${quest}:${objective}`;

export class HintLadder {
  mode: HintMode = 'ladder';
  private waited = new Map<string, number>();
  private asked = new Map<string, number>();

  /** Seconds a step must go without progress before each rung. */
  private after = (rung: number): number => [0, tuning.hints.nudgeAfter.value, tuning.hints.cueAfter.value, tuning.hints.hintAfter.value][rung];

  /** How far up the ladder this step is: 0 outcome only, 1 + a cryptic line, 2 + the map marker, 3 + the full hint. */
  rung(key: string): number {
    if (this.mode === 'full') return MAX_RUNG;
    const byTime = this.mode === 'ladder' ? [1, 2, 3].filter((r) => (this.waited.get(key) ?? 0) >= this.after(r)).length : 0;
    return Math.min(MAX_RUNG, Math.max(byTime, this.asked.get(key) ?? 0));
  }

  /** Time passes for the steps being worked on now (other steps wait their turn). */
  tick(dt: number, current: readonly string[]): void {
    for (const k of current) this.waited.set(k, (this.waited.get(k) ?? 0) + dt);
  }

  /** "Just tell me": the next rung for the steps being worked on now. */
  ask(current: readonly string[]): number {
    let top = 0;
    for (const k of current) {
      const next = Math.min(MAX_RUNG, this.rung(k) + 1);
      this.asked.set(k, next);
      top = Math.max(top, next);
    }
    return top;
  }

  /** A step that moved on starts over if it comes up again; a new level forgets everything. */
  reset(): void {
    this.waited.clear();
    this.asked.clear();
  }
}

/** The keys of the ladder steps being worked on right now: the first open step of each active quest that has a `nudge` (and whose `after` is done). */
export function ladderSteps(defs: readonly QuestDef[], quests: readonly QuestState[]): string[] {
  const out: string[] = [];
  for (const q of quests) {
    if (q.status !== 'active') continue;
    const d = defs.find((x) => x.id === q.id);
    if (!d) continue;
    const i = q.objectives.findIndex((o, k) => !o.done && !(d.objectives[k].after && !q.objectives.find((x) => x.id === d.objectives[k].after)?.done));
    if (i >= 0 && d.objectives[i].nudge) out.push(stepKey(q.id, q.objectives[i].id));
  }
  return out;
}

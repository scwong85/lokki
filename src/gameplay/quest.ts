import { tuning } from '../core/tuning';
import type { QuestDef, QuestEventType } from '../data/quests';
import { courseDone, courseOf, rowLocked } from './collection';

export type QuestStatus = 'locked' | 'idle' | 'active' | 'won' | 'lost';

export interface ObjectiveState {
  id: string;
  text: string;
  done: boolean;
  count: number;
  /** Seconds of successful escape so far. */
  progress: number;
}

export interface QuestState {
  id: string;
  title: string;
  timed: boolean;
  status: QuestStatus;
  timeLeft: number;
  /** Counts down after a failed timed quest; at zero it resets for another try. */
  retryT: number;
  objectives: ObjectiveState[];
}

export interface QuestTick {
  dt: number;
  /** Carrying an item stolen from a tourist. */
  carryingStolen: boolean;
  /** Distance to the nearest tourist. */
  nearestNpc: number;
}

export type QuestNote =
  | { type: 'started'; quest: string }
  | { type: 'objective'; quest: string; objective: string }
  | { type: 'won'; quest: string }
  | { type: 'lost'; quest: string }
  | { type: 'unlocked'; quest: string }
  /** A course of a collection was served: every row in it is done (M111). */
  | { type: 'course'; quest: string; course: number }
  | { type: 'retry'; quest: string };

/** Runs the quest definitions: events and ticks in, state and notifications out. Pure logic. */
export class QuestLog {
  quests: QuestState[] = [];
  /** Switches that unlock quests outside the normal chain ('replay' after the first clear). */
  private flags = new Set<string>();

  constructor(private defs: readonly QuestDef[]) {
    this.reset();
  }

  private timeFor(d: QuestDef): number {
    return tuning.quest[d.timeKey ?? 'timeLimit'].value;
  }

  /** Status once unlocked. */
  private open(d: QuestDef): QuestState['status'] {
    return d.timed || d.startOn ? 'idle' : 'active';
  }

  private fresh(d: QuestDef): QuestState {
    return {
      id: d.id,
      title: d.title,
      timed: d.timed,
      status: d.requires?.length || (d.requiresFlag && !this.flags.has(d.requiresFlag)) ? 'locked' : this.open(d),
      timeLeft: this.timeFor(d),
      retryT: 0,
      objectives: d.objectives.map((o) => ({ id: o.id, text: o.text, done: false, count: 0, progress: 0 })),
    };
  }

  /** Load another level's to-dos (flags stay). */
  load(defs: readonly QuestDef[]): void {
    this.defs = defs;
    this.reset();
  }

  /** A guest copies the host's quest state (status, timers, objective progress). */
  applyRemote(list: readonly { id: string; status: string; t?: number; o: [number, number][] }[]): void {
    for (const s of list) {
      const q = this.quests.find((x) => x.id === s.id);
      if (!q) continue;
      q.status = s.status as QuestState['status'];
      if (s.t !== undefined) q.timeLeft = s.t;
      s.o.forEach(([done, count], i) => {
        if (q.objectives[i]) Object.assign(q.objectives[i], { done: done === 1, count });
      });
    }
  }

  reset(): void {
    this.quests = this.defs.map((d) => this.fresh(d));
  }

  private def(id: string): QuestDef {
    return this.defs.find((d) => d.id === id)!;
  }

  /** Switch a flag on or off: quests that need it unlock (or lock again, with their progress cleared). */
  setFlag(flag: string, on: boolean): QuestNote[] {
    const notes: QuestNote[] = [];
    if (on) this.flags.add(flag);
    else this.flags.delete(flag);
    for (const q of this.quests) {
      const d = this.def(q.id);
      if (d.requiresFlag !== flag) continue;
      if (on && q.status === 'locked') {
        const f = this.fresh(d);
        if (f.status !== 'locked') {
          Object.assign(q, f);
          notes.push({ type: 'unlocked', quest: q.id });
        }
      } else if (!on && q.status !== 'locked') Object.assign(q, { ...this.fresh(d), status: 'locked' });
    }
    return notes;
  }

  /** Restore finished quests from a save (silent: no notes). */
  restoreWon(ids: readonly string[]): void {
    for (const q of this.quests) {
      if (!ids.includes(q.id) || q.status === 'locked' && this.def(q.id).requiresFlag) continue;
      q.status = 'won';
      for (const o of q.objectives) o.done = true;
    }
    this.afterWin([]);
  }

  wonIds(): string[] {
    return this.quests.filter((q) => q.status === 'won').map((q) => q.id);
  }

  /** Events some quest could use right now (so world triggers do not waste progress on closed quests). */
  wanted(): Set<string> {
    const w = new Set<string>();
    for (const q of this.quests) {
      const d = this.def(q.id);
      if (q.status === 'idle') for (const e of d.startOn ?? []) w.add(e);
      if (q.status !== 'active') continue;
      d.objectives.forEach((od, i) => {
        if (q.objectives[i].done || od.kind !== 'event' || !(od.event || od.events)) return;
        if (od.after && !q.objectives.find((x) => x.id === od.after)?.done) return;
        if (rowLocked(d, q, i)) return;
        if (od.event) w.add(od.event);
        for (const e of od.events ?? []) w.add(e);
      });
    }
    return w;
  }

  private afterWin(notes: QuestNote[]): void {
    for (const q of this.quests) {
      if (q.status !== 'locked') continue;
      const d = this.def(q.id);
      if ((d.requires ?? []).every((id) => this.quests.find((x) => x.id === id)?.status === 'won') && (!d.requiresFlag || this.flags.has(d.requiresFlag))) {
        q.status = this.open(d);
        notes.push({ type: 'unlocked', quest: q.id });
      }
    }
  }

  private finishCheck(q: QuestState, notes: QuestNote[]): void {
    if (q.status === 'active' && q.objectives.every((o) => o.done)) {
      q.status = 'won';
      notes.push({ type: 'won', quest: q.id });
      this.afterWin(notes);
    }
  }

  /** Take a done step back (the pigeons carried the item off the picnic, M112). A won quest is open again. */
  undo(questId: string, objectiveId: string): boolean {
    const q = this.quests.find((x) => x.id === questId);
    const o = q?.objectives.find((x) => x.id === objectiveId);
    if (!q || !o || !o.done) return false;
    o.done = false;
    o.count = 0;
    o.progress = 0;
    if (q.status === 'won') q.status = 'active';
    return true;
  }

  /** Called for every quest event before it is handled (the world's reactions hang here). */
  hook: ((type: QuestEventType) => void) | null = null;

  onEvent(type: QuestEventType): QuestNote[] {
    this.hook?.(type);
    const notes: QuestNote[] = [];
    for (const q of this.quests) {
      const d = this.def(q.id);
      if (q.status === 'idle' && d.startOn?.includes(type)) {
        q.status = 'active';
        q.timeLeft = this.timeFor(d);
        notes.push({ type: 'started', quest: q.id });
      }
      if (q.status !== 'active') continue;
      d.objectives.forEach((od, i) => {
        const o = q.objectives[i];
        if (o.done || od.kind !== 'event' || !(od.event === type || od.events?.includes(type))) return;
        if (od.after && !q.objectives.find((x) => x.id === od.after)?.done) return;
        if (rowLocked(d, q, i)) return; // a row in a course that is not open yet does not count
        o.count++;
        if (o.count >= (od.count ?? 1)) {
          o.done = true;
          notes.push({ type: 'objective', quest: q.id, objective: o.id });
          if (od.row && courseDone(d, q, courseOf(od))) notes.push({ type: 'course', quest: q.id, course: courseOf(od) });
        }
      });
      this.finishCheck(q, notes);
    }
    return notes;
  }

  tick(c: QuestTick): QuestNote[] {
    const notes: QuestNote[] = [];
    for (const q of this.quests) {
      const d = this.def(q.id);
      if (q.status === 'lost') {
        q.retryT -= c.dt;
        if (q.retryT <= 0) {
          const f = this.fresh(d);
          f.status = this.open(d); // a failed quest can be tried again right away
          Object.assign(q, f);
          notes.push({ type: 'retry', quest: q.id });
        }
        continue;
      }
      if (q.status !== 'active') continue;
      d.objectives.forEach((od, i) => {
        const o = q.objectives[i];
        if (o.done || od.kind !== 'escape') return;
        if (od.after && !q.objectives.find((x) => x.id === od.after)?.done) return;
        if (c.carryingStolen && c.nearestNpc >= tuning.quest.escapeDistance.value) o.progress += c.dt;
        else o.progress = 0;
        if (o.progress >= tuning.quest.escapeTime.value) {
          o.done = true;
          notes.push({ type: 'objective', quest: q.id, objective: o.id });
        }
      });
      this.finishCheck(q, notes);
      if (q.status === 'active' && q.timed) {
        q.timeLeft = Math.max(0, q.timeLeft - c.dt);
        if (q.timeLeft <= 0) {
          q.status = 'lost';
          q.retryT = tuning.quest.retryDelay.value;
          notes.push({ type: 'lost', quest: q.id });
        }
      }
    }
    return notes;
  }
}

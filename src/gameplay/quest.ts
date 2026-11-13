import { tuning } from '../core/tuning';
import type { QuestDef, QuestEventType } from '../data/quests';

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
  | { type: 'retry'; quest: string };

/** Runs the quest definitions: events and ticks in, state and notifications out. Pure logic. */
export class QuestLog {
  quests: QuestState[] = [];

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
      status: d.requires?.length ? 'locked' : this.open(d),
      timeLeft: this.timeFor(d),
      retryT: 0,
      objectives: d.objectives.map((o) => ({ id: o.id, text: o.text, done: false, count: 0, progress: 0 })),
    };
  }

  reset(): void {
    this.quests = this.defs.map((d) => this.fresh(d));
  }

  private def(id: string): QuestDef {
    return this.defs.find((d) => d.id === id)!;
  }

  /** Events some quest could use right now (so world triggers do not waste progress on closed quests). */
  wanted(): Set<string> {
    const w = new Set<string>();
    for (const q of this.quests) {
      const d = this.def(q.id);
      if (q.status === 'idle') for (const e of d.startOn ?? []) w.add(e);
      if (q.status !== 'active') continue;
      d.objectives.forEach((od, i) => {
        if (q.objectives[i].done || od.kind !== 'event' || !od.event) return;
        if (od.after && !q.objectives.find((x) => x.id === od.after)?.done) return;
        w.add(od.event);
      });
    }
    return w;
  }

  private afterWin(notes: QuestNote[]): void {
    for (const q of this.quests) {
      if (q.status !== 'locked') continue;
      const d = this.def(q.id);
      if (d.requires!.every((id) => this.quests.find((x) => x.id === id)?.status === 'won')) {
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

  onEvent(type: QuestEventType): QuestNote[] {
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
        if (o.done || od.kind !== 'event' || od.event !== type) return;
        if (od.after && !q.objectives.find((x) => x.id === od.after)?.done) return;
        o.count++;
        if (o.count >= (od.count ?? 1)) {
          o.done = true;
          notes.push({ type: 'objective', quest: q.id, objective: o.id });
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

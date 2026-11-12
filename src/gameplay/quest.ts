import { tuning } from '../core/tuning';
import type { QuestDef, QuestEventType } from '../data/quests';

export type QuestStatus = 'idle' | 'active' | 'won' | 'lost';

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
  | { type: 'lost'; quest: string };

/** Runs the quest definitions: events and ticks in, state and notifications out. Pure logic. */
export class QuestLog {
  quests: QuestState[] = [];

  constructor(private defs: readonly QuestDef[]) {
    this.reset();
  }

  reset(): void {
    this.quests = this.defs.map((d) => ({
      id: d.id,
      title: d.title,
      timed: d.timed,
      status: d.timed ? 'idle' : 'active',
      timeLeft: tuning.quest.timeLimit.value,
      objectives: d.objectives.map((o) => ({ id: o.id, text: o.text, done: false, count: 0, progress: 0 })),
    }));
  }

  private def(id: string): QuestDef {
    return this.defs.find((d) => d.id === id)!;
  }

  private finishCheck(q: QuestState, notes: QuestNote[]): void {
    if (q.status === 'active' && q.objectives.every((o) => o.done)) {
      q.status = 'won';
      notes.push({ type: 'won', quest: q.id });
    }
  }

  onEvent(type: QuestEventType): QuestNote[] {
    const notes: QuestNote[] = [];
    for (const q of this.quests) {
      const d = this.def(q.id);
      if (q.status === 'idle' && d.startOn?.includes(type)) {
        q.status = 'active';
        q.timeLeft = tuning.quest.timeLimit.value;
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
      if (q.status !== 'active') continue;
      const d = this.def(q.id);
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
          notes.push({ type: 'lost', quest: q.id });
        }
      }
    }
    return notes;
  }
}

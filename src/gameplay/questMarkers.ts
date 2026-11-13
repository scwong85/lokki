import type { Marker, QuestDef } from '../data/quests';
import type { QuestState } from './quest';

/** Which map markers to show now: the next objective's spots of each active quest, and the start spot of an unlocked idle quest. */
export function activeMarkers(defs: readonly QuestDef[], quests: readonly QuestState[]): Marker[] {
  const out: Marker[] = [];
  for (const q of quests) {
    const d = defs.find((x) => x.id === q.id);
    if (!d) continue;
    if (q.status === 'idle' && d.startMarkers) out.push(...d.startMarkers);
    if (q.status !== 'active') continue;
    const i = q.objectives.findIndex((o) => !o.done);
    if (i < 0) continue;
    const od = d.objectives[i];
    if (od.after && !q.objectives.find((o) => o.id === od.after)?.done) continue;
    if (od.markers) out.push(...od.markers);
  }
  return out;
}

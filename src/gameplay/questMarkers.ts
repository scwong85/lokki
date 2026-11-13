import type { Marker, QuestDef } from '../data/quests';
import type { QuestState } from './quest';

/** Which map markers to show now: the open objectives' spots of each active quest, and the start spot of an unlocked idle quest. */
export function activeMarkers(defs: readonly QuestDef[], quests: readonly QuestState[]): Marker[] {
  const out: Marker[] = [];
  for (const q of quests) {
    const d = defs.find((x) => x.id === q.id);
    if (!d) continue;
    if (q.status === 'idle') {
      // point at where to begin: explicit start markers, or the first objective when it IS the start action (take the cap)
      const first = d.objectives[0];
      if (d.startMarkers) out.push(...d.startMarkers);
      else if (first.markers && first.event && d.startOn?.includes(first.event)) out.push(...first.markers);
    }
    if (q.status !== 'active') continue;
    // every open objective that can be worked on now (parallel objectives of the finale all show; a chain shows its next step)
    q.objectives.forEach((o, i) => {
      if (o.done) return;
      const od = d.objectives[i];
      if (od.after && !q.objectives.find((x) => x.id === od.after)?.done) return;
      if (od.markers) out.push(...od.markers);
    });
  }
  return out;
}

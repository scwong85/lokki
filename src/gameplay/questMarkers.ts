import type { Marker, QuestDef } from '../data/quests';
import type { QuestState } from './quest';
import { rowLocked } from './collection';

/** Which map markers to show now: the open objectives' spots of each active quest, and the start spot of an unlocked idle quest. */
/** Markers for quests to start and objectives in progress (`activeOnly`: skip the not-yet-started quests). */
export function activeMarkers(defs: readonly QuestDef[], quests: readonly QuestState[], activeOnly = false, rungOf?: (quest: string, objective: string) => number): Marker[] {
  const out: Marker[] = [];
  for (const q of quests) {
    const d = defs.find((x) => x.id === q.id);
    if (!d) continue;
    if (q.status === 'idle' && !activeOnly) {
      // point at where to begin: explicit start markers, or the first objective when it IS the start action (take the cap)
      const first = d.objectives[0];
      if (d.startMarkers) out.push(...d.startMarkers);
      else if (first.markers && first.event && d.startOn?.includes(first.event)) out.push(...first.markers);
    }
    if (q.status !== 'active') continue;
    if (d.collect?.marker) out.push(d.collect.marker); // where the collection goes (the picnic blanket)
    // every open objective that can be worked on now (parallel objectives of the finale all show; a chain shows its next step)
    q.objectives.forEach((o, i) => {
      if (o.done) return;
      const od = d.objectives[i];
      if (od.after && !q.objectives.find((x) => x.id === od.after)?.done) return;
      if (rowLocked(d, q, i)) return; // a course that is not open yet
      // a step on the hint ladder shows its marker only once the ladder has got that far (rung 2: a cue from the world)
      if (od.markers && !(od.nudge && !od.showMarker && rungOf && rungOf(q.id, od.id) < 2)) out.push(...od.markers);
    });
  }
  return out;
}

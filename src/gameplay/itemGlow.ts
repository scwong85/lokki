import type { QuestDef } from '../data/quests';
import type { QuestState } from './quest';

export type Highlight = 'off' | 'subtle' | 'strong';
export const HIGHLIGHTS: readonly Highlight[] = ['off', 'subtle', 'strong'];

/** How far (m) an item shows its sparkle: any item, the item the current step wants, and every item while Hawk-eye is on. */
const RANGE: Record<Exclude<Highlight, 'off'>, { any: number; wanted: number; hawk: number }> = {
  subtle: { any: 12, wanted: 40, hawk: 60 },
  strong: { any: 25, wanted: 70, hawk: 90 },
};

/** 0..1 strength of an item's sparkle (fades out over the last third of its range). */
export function glowLevel(dist: number, wanted: boolean, hawk: boolean, mode: Highlight): number {
  if (mode === 'off') return 0;
  const r = RANGE[mode];
  const range = hawk ? r.hawk : wanted ? r.wanted : r.any;
  if (dist >= range) return 0;
  const fade = range * 0.33;
  const f = Math.min(1, (range - dist) / fade);
  return f * (wanted ? 1 : hawk ? 0.8 : 0.55);
}

/** Item names (quest tag or prop type) that an open objective asks the gull to grab or snatch right now. */
export function wantedItems(defs: readonly QuestDef[], quests: readonly QuestState[]): Set<string> {
  const out = new Set<string>();
  for (const q of quests) {
    if (q.status !== 'active') continue;
    const d = defs.find((x) => x.id === q.id);
    if (!d) continue;
    q.objectives.forEach((o, i) => {
      if (o.done) return;
      const od = d.objectives[i];
      if (od.after && !q.objectives.find((x) => x.id === od.after)?.done) return;
      const m = od.event?.match(/^(?:grab|snatch):(.+)$/);
      if (m) out.add(m[1]);
    });
  }
  return out;
}

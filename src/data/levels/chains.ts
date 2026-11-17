import type { QuestDef, Marker } from '../quests';
import type { PropSpawn } from '../../gameplay/props';
import { restY } from '../props';
import type { Station } from '../../gameplay/npc';

/**
 * Chain levels share one skeleton (docs/design/chain-levels.md): provoke somebody, lead them to a stall while they are angry
 * (hold T), watch them buy comfort food, take it, get away. Each level changes the cast, the stall, the goods and how the
 * person is provoked: a snatch, or splatting the same person twice.
 */
export interface TreatChain {
  id: string;
  title: string;
  teaser: string;
  /** The NPC role that takes part (it must have `craves` set to `goods`). */
  role: string;
  /** How they get angry: take what they hold, or splat them twice (within half a minute). */
  provoke: 'snatch' | 'splat';
  provokeText: string;
  provokeHint: string;
  provokeMarker?: Marker;
  station: Station;
  /** The stall in words ("ice cream stall") and the goods ("a cone"). */
  stallName: string;
  goodsText: string;
  /** Marker for the stall (where to bring them). */
  stallMarker?: Marker;
}

export function treatChain(c: TreatChain): QuestDef {
  return {
    id: c.id,
    title: c.title,
    teaser: c.teaser,
    timed: false,
    chain: true,
    objectives: [
      { id: 'provoke', text: c.provokeText, kind: 'event', event: c.provoke === 'snatch' ? `robbed:${c.role}` : `mood:${c.role}:angry`, hint: c.provokeHint, markers: c.provokeMarker ? [c.provokeMarker] : undefined },
      {
        id: 'lure',
        text: `Lead the angry one to the ${c.stallName}`,
        kind: 'event',
        event: `atStation:${c.role}:${c.station.id}`,
        after: 'provoke',
        hint: `They chase you now. Hold T to taunt so they keep following, and fly low towards the ${c.stallName}.`,
        markers: [c.stallMarker ?? { x: c.station.x, z: c.station.z, r: c.station.r, label: c.stallName }],
      },
      { id: 'buy', text: `Let them buy ${c.goodsText} to feel better`, kind: 'event', event: `bought:${c.role}`, after: 'lure', hint: 'Keep out of their sight for a moment. Comfort food takes a few seconds.' },
      { id: 'take', text: `Snatch ${c.goodsText}`, kind: 'event', event: `robbed:${c.role}`, after: 'buy', hint: 'They only have eyes for it now. Come in from the side and take it.' },
      { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'take', hint: 'Keep it and stay far from everyone until the bar fills.' },
    ],
  };
}

/** Goods standing at a stall: two items either side of the station spot, on its counter (or the ground when `goods.y` is omitted). */
export function stallGoods(st: Station, tag?: string): PropSpawn[] {
  const g = st.goods ?? { dz: 0 };
  return [-0.7, 0.7].map((dx) => ({ type: st.sells, x: st.x + dx, y: restY(st.sells, g.y), z: st.z + g.dz, tag }));
}

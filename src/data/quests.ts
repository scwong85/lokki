/** Quest definitions (plain data, PLAN §4.3). The quest log (src/gameplay/quest.ts) runs them. */
export type QuestEventType = 'alert' | 'snatch' | 'poopNpc' | 'tipBin' | 'breakBottle' | 'poopWarden';

export interface ObjectiveDef {
  id: string;
  text: string;
  /** 'event': done after `count` matching events. 'escape': carry the stolen item far away from everyone for a while. */
  kind: 'event' | 'escape';
  event?: QuestEventType;
  count?: number;
  /** Only counts once this objective is done. */
  after?: string;
  /** Short tip shown under the first unfinished objective. */
  hint?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  /** Timed quests are idle until `startOn`, then count down. */
  timed: boolean;
  startOn?: QuestEventType[];
  objectives: ObjectiveDef[];
}

export const QUESTS: QuestDef[] = [
  {
    id: 'icecream',
    title: 'Ice-cream snatch',
    timed: true,
    startOn: ['alert', 'snatch'],
    objectives: [
      { id: 'snatch', text: 'Snatch an ice cream from a tourist', kind: 'event', event: 'snatch', hint: 'Green ring = free to take, red = guarded. Distract them with a noise (bin, bottle) or dive from straight above, then grab from the open side.' },
      { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'snatch', hint: 'Keep the ice cream and stay far away from every tourist until the bar fills.' },
    ],
  },
  {
    id: 'extras',
    title: 'Little extras',
    timed: false,
    objectives: [
      { id: 'poop', text: 'Poop on a tourist', kind: 'event', event: 'poopNpc' },
      { id: 'bin', text: 'Tip over a bin', kind: 'event', event: 'tipBin' },
      { id: 'bottle', text: 'Smash a bottle', kind: 'event', event: 'breakBottle' },
      { id: 'warden', text: 'Poop on the Gull Warden', kind: 'event', event: 'poopWarden', hint: 'He arrives when the city is really fed up (high heat).' },
    ],
  },
];

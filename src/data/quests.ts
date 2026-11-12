/** Quest definitions (plain data, PLAN §4.3). The quest log (src/gameplay/quest.ts) runs them. */
export type QuestEventType = 'alert' | 'snatch' | 'poopNpc' | 'tipBin' | 'breakBottle';

export interface ObjectiveDef {
  id: string;
  text: string;
  /** 'event': done after `count` matching events. 'escape': carry the stolen item far away from everyone for a while. */
  kind: 'event' | 'escape';
  event?: QuestEventType;
  count?: number;
  /** Only counts once this objective is done. */
  after?: string;
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
      { id: 'snatch', text: 'Snatch an ice cream from a tourist', kind: 'event', event: 'snatch' },
      { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'snatch' },
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
    ],
  },
];

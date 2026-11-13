/** Quest definitions (plain data, PLAN §4.3). The quest log (src/gameplay/quest.ts) runs them. */
import { BUN_CHECKPOINTS, FERRY_FUNNEL, FERRY_ROOF, SANDBOX, STATUE, WRONG_FERRY } from './places';

/** Quest events are plain strings emitted by the game ('snatch:icecream', 'grab:statueCap', 'tipChair', ...). */
export type QuestEventType = string;

export type TimeKey = 'timeLimit' | 'capTime' | 'finaleTime';

/** A spot to point the player at (ring + light pillar on the map). */
export interface Marker {
  x: number;
  z: number;
  r: number;
  /** Raise the ring (e.g. onto the ferry roof). */
  y?: number;
}

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
  /** Shown on the map while this is the first open objective. */
  markers?: Marker[];
}

export interface QuestDef {
  id: string;
  title: string;
  /** Short line for the to-do list when the quest is not started yet. */
  teaser?: string;
  /** Timed quests count down once started. */
  timed: boolean;
  timeKey?: TimeKey;
  /** The quest stays idle until one of these events. Without it, an untimed quest is active from the start. */
  startOn?: QuestEventType[];
  /** Locked until all of these quests are won. */
  requires?: string[];
  /** The city notices when this quest starts: the heat is raised to at least this. */
  startHeat?: number;
  /** Shown while the quest is idle and unlocked. */
  startMarkers?: Marker[];
  objectives: ObjectiveDef[];
}

const MAIN = ['icecream', 'swap', 'cap', 'bun', 'map'];

export const QUESTS: QuestDef[] = [
  {
    id: 'icecream',
    title: 'Ice-cream snatch',
    teaser: 'Nick a tourist\'s ice cream. The clock starts when they spot you.',
    timed: true,
    startOn: ['alert', 'snatch:icecream'],
    objectives: [
      { id: 'snatch', text: 'Snatch an ice cream from a tourist', kind: 'event', event: 'snatch:icecream', hint: 'Green ring = free to take, red = guarded. Distract them with a noise (bin, bottle) or dive from straight above, then grab from the open side.' },
      { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'snatch', hint: 'Keep the ice cream and stay far away from every tourist until the bar fills.' },
    ],
  },
  {
    id: 'swap',
    title: 'Salmiakki swap',
    teaser: 'Swap the lilac tourist\'s sweets for salty liquorice.',
    timed: false,
    startOn: ['snatch:candy'],
    objectives: [
      { id: 'steal', text: 'Steal the sweets from the lilac tourist', kind: 'event', event: 'snatch:candy', hint: 'Same rules as the ice cream: wait for her to look away.' },
      {
        id: 'swap', text: 'Leave her a bag of salmiakki', kind: 'event', event: 'tookItem:salmiakki', after: 'steal',
        hint: 'Salmiakki bags (black) are in the sandbox. Drop one near her and let her pick it up.',
        markers: [{ x: SANDBOX.x, z: SANDBOX.z + 5, r: 3 }],
      },
      { id: 'watch', text: 'Watch her face', kind: 'event', event: 'yuck', after: 'swap' },
    ],
  },
  {
    id: 'cap',
    title: 'Cap heist',
    teaser: 'Steal the student cap off the Havis Amanda statue and get it to the ferry roof.',
    timed: true,
    timeKey: 'capTime',
    startOn: ['grab:statueCap'],
    startHeat: 25,
    objectives: [
      { id: 'take', text: 'Take the student cap from the statue', kind: 'event', event: 'grab:statueCap', hint: 'Land on the statue (it is a perch) and grab it. The clock starts when you take it.', markers: [{ x: STATUE.x, z: STATUE.z, r: 3, y: 5 }] },
      { id: 'deliver', text: 'Get it onto the ferry roof before the crowd arrives', kind: 'event', event: 'capDelivered', after: 'take', hint: 'Drop it on the upper cabin of the ferry.', markers: [{ x: (FERRY_ROOF.minX + FERRY_ROOF.maxX) / 2, z: (FERRY_ROOF.minZ + FERRY_ROOF.maxZ) / 2, r: 4, y: FERRY_ROOF.minY }] },
    ],
  },
  {
    id: 'bun',
    title: 'Cinnamon bun ring',
    teaser: 'Carry a bun past three vendors.',
    timed: false,
    startOn: ['grab:bun'],
    startHeat: 20,
    objectives: [
      { id: 'bun1', text: 'Carry a bun past the first vendor', kind: 'event', event: 'bun1', hint: 'Buns are in the sandbox. The vendors will spray you: dodge the red fan.', markers: [{ ...BUN_CHECKPOINTS[0] }] },
      { id: 'bun2', text: '...the second vendor', kind: 'event', event: 'bun2', after: 'bun1', markers: [{ ...BUN_CHECKPOINTS[1] }] },
      { id: 'bun3', text: '...and the third', kind: 'event', event: 'bun3', after: 'bun2', markers: [{ ...BUN_CHECKPOINTS[2] }] },
    ],
  },
  {
    id: 'map',
    title: 'Map sabotage',
    teaser: 'Steal a tourist\'s map and drown it in the harbour.',
    timed: false,
    startOn: ['snatch:map'],
    objectives: [
      { id: 'steal', text: 'Steal the map from the tourist at the east side', kind: 'event', event: 'snatch:map' },
      { id: 'sea', text: 'Drop it in the harbour', kind: 'event', event: 'mapInSea', after: 'steal', hint: 'Fly out over the water and let go (E).' },
      { id: 'ferry', text: 'Watch them head for the wrong ferry', kind: 'event', event: 'wrongFerry', after: 'sea', markers: [{ x: WRONG_FERRY.x, z: WRONG_FERRY.z, r: 4 }] },
    ],
  },
  {
    id: 'finale',
    title: 'Grand finale: market mayhem',
    teaser: 'Ring the ferry horn (land on the funnel), then wreck the market before time runs out.',
    timed: true,
    timeKey: 'finaleTime',
    requires: MAIN,
    startOn: ['finaleStart'],
    startHeat: 80,
    startMarkers: [{ x: FERRY_FUNNEL.x, z: FERRY_FUNNEL.z, r: 3, y: 12.5 }],
    objectives: [
      { id: 'chairs', text: 'Collapse the chair stack', kind: 'event', event: 'tipChair', count: 3, hint: 'Dive into the stack in the sandbox.' },
      { id: 'pastry', text: 'Swipe the pastry from the stall counter', kind: 'event', event: 'grab:stallBun', hint: 'It sits on a counter of the south row, right in front of a vendor.', markers: [{ x: 8, z: -30, r: 3 }] },
      { id: 'warden', text: 'Poop on the Gull Warden', kind: 'event', event: 'poopWarden', hint: 'Distract him with a noise first so the umbrella tips aside.' },
    ],
  },
  {
    id: 'extras',
    title: 'Little extras',
    teaser: 'Small bits of mischief.',
    timed: false,
    objectives: [
      { id: 'poop', text: 'Poop on a tourist', kind: 'event', event: 'poopNpc' },
      { id: 'bin', text: 'Tip over a bin', kind: 'event', event: 'tipBin' },
      { id: 'bottle', text: 'Smash a bottle', kind: 'event', event: 'breakBottle' },
      { id: 'warden', text: 'Poop on the Gull Warden', kind: 'event', event: 'poopWarden', hint: 'He arrives when the heat is very high. His umbrella blocks poop from above. It tips aside (blue ? over his head) for about 6 s when a noise distracts him: throw or drop something away from him, or tip a bin. Then poop from above (the reticle turns brown when it is clear).' },
    ],
  },
];

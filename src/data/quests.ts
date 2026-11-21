/** Quest definitions (plain data, PLAN §4.3). The quest log (src/gameplay/quest.ts) runs them. */
import { BUN_CHECKPOINTS, CAFE, CHILD_SPOT, CLOCK, FERRY, FERRY_CABIN_ROOFS, FERRY_DECK, STATUE, TOY_SPOT, WRONG_FERRY, counter } from './places';

/** Quest events are plain strings emitted by the game ('snatch:icecream', 'grab:statueCap', 'tipChair', ...). */
export type QuestEventType = string;

export type TimeKey = 'timeLimit' | 'capTime' | 'finaleTime' | 'bottleTime' | 'expressTime';

/** A spot to point the player at (ring + light pillar on the map). */
export interface Marker {
  x: number;
  z: number;
  r: number;
  /** Name shown on the waypoint ('Teddy bear'). */
  label?: string;
  /** Raise the ring (e.g. onto the ferry roof). */
  y?: number;
}

export interface ObjectiveDef {
  id: string;
  text: string;
  /** 'event': done after `count` matching events. 'escape': carry the stolen item far away from everyone for a while. */
  kind: 'event' | 'escape';
  event?: QuestEventType;
  /** More ways to finish the same step (M95): any one of these events counts, as well as `event`. */
  events?: QuestEventType[];
  count?: number;
  /** Only counts once this objective is done. */
  after?: string;
  /** Short tip shown under the first unfinished objective. */
  hint?: string;
  /**
   * The hint ladder (M94). With a `nudge`, the step shows `outcome` (the wish, no method) as its text and nothing under it at first; after a while the
   * `nudge` (a cryptic line), then its map `markers`, then the full `hint`. Without a `nudge` the step behaves as before.
   */
  outcome?: string;
  nudge?: string;
  /** Who the joke is on (a role): the person whose pride, routine or property this step lands on (docs/design/hooky-objectives-research.md). */
  victim?: string;
  /** The marker shows from the start even on the ladder (for a place or thing, not a method: the pie, the blanket). */
  showMarker?: boolean;
  /** Shown on the map while this is the first open objective. */
  markers?: Marker[];
  /** Past-tense caption for the recap after the chain ('The inspector slipped'). Falls back to the text. */
  recap?: string;
  /**
   * A row of a collection to-do (M107): "???" until the gull comes near its place (then a half title), the full wish once it is right there,
   * ticked with the item and its owner when it is delivered.
   */
  row?: { reveal: { x: number; z: number; r: number; text: string }; item: string; owner: string };
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
  /** Locked until this flag is switched on (the replay variants after the first clear). */
  requiresFlag?: string;
  /** Not listed on the to-do list while locked. */
  hidden?: boolean;
  /** A chain: one objective made of steps that each answer the one before. The note shows the steps done, the one to do now, and `?` for the rest. */
  chain?: boolean;
  /** The joke card (docs/design/puzzle-quality.md): the funny picture, the one insight, the reactions that show it. */
  joke?: { joke: string; insight: string; reaction: string };
  /** The city notices when this quest starts: the heat is raised to at least this. */
  startHeat?: number;
  /** Shown while the quest is idle and unlocked. */
  startMarkers?: Marker[];
  objectives: ObjectiveDef[];
  /** A collection to-do (M107): its objectives are rows found on the spot, done in any order; the line is the goal under the title. */
  collect?: { goal: string; /** Where the things go: always on the map while the to-do is open. */ marker?: Marker };
  /** Shown while locked, instead of "Finish the other quests first." */
  lockedText?: string;
  /** A hidden to-do half-reveals itself when the gull comes near this spot ("??? …Granny's sweet tooth"), M103. */
  reveal?: { x: number; z: number; r: number; text: string };
}

const MAIN = ['icecream', 'swap', 'cap', 'bun', 'map', 'date', 'toy'];

const STEAL_TIP = 'A red ring means guarded. Dive at it from straight above (they cannot see you there), or make a noise to distract them and grab it with E from the open side.';

export const QUESTS: QuestDef[] = [
  {
    id: 'icecream',
    title: 'Ice-cream snatch',
    teaser: 'Nick a tourist\'s ice cream. The clock starts when they spot you.',
    timed: true,
    startOn: ['alert', 'snatch:icecream'],
    objectives: [
      { id: 'snatch', text: 'Snatch an ice cream from a tourist', kind: 'event', event: 'snatch:icecream', hint: STEAL_TIP },
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
      { id: 'steal', text: 'Steal the sweets from the lilac tourist', kind: 'event', event: 'snatch:candy', hint: STEAL_TIP },
      {
        id: 'swap', text: 'Leave her a bag of salmiakki', kind: 'event', event: 'tookItem:salmiakki', after: 'steal',
        hint: 'Black salmiakki bags lie on the candy-stall counters at the north row of the market. Drop one near her and she will pick it up.',
        markers: [{ ...counter(2, 0), r: 3, label: 'Salmiakki stall' }],
      },
      { id: 'watch', text: 'Watch her face', kind: 'event', event: 'yuck', after: 'swap' },
    ],
  },
  {
    id: 'cap',
    title: 'Cap heist',
    teaser: 'Steal the student cap off the Havis Amanda statue and drop it on the ferry.',
    timed: true,
    timeKey: 'capTime',
    startOn: ['grab:statueCap'],
    startHeat: 25,
    objectives: [
      { id: 'take', text: 'Take the student cap from the statue', kind: 'event', event: 'grab:statueCap', hint: 'It lies on the statue\'s plinth (a wide perch). Land next to it and press E. The clock starts when you take it.', markers: [{ x: STATUE.x, z: STATUE.z, r: 3, y: 3, label: 'Student cap' }] },
      { id: 'deliver', text: 'Get it onto the ferry before the crowd arrives', kind: 'event', event: 'capDelivered', after: 'take', hint: 'Fly over the ferry and let go (E): anywhere on its deck or roofs counts.', markers: [{ x: FERRY.x, z: FERRY.z, r: 7, y: FERRY_DECK.minY, label: 'Ferry' }] },
    ],
  },
  {
    id: 'bun',
    title: 'Cinnamon bun ring',
    teaser: 'Carry a bun past three vendors.',
    timed: false,
    startOn: ['grab:bun'],
    startHeat: 20,
    startMarkers: [{ ...counter(3, 1), r: 3, label: 'Cinnamon buns' }],
    objectives: [
      { id: 'bun1', text: 'Carry a bun past the first vendor', kind: 'event', event: 'bun1', hint: 'Buns lie on the middle-row counters. Vendors only spray below 4.5 m: fly past above that, or dodge the red fans.', markers: [{ ...BUN_CHECKPOINTS[0], label: 'Vendor 1' }] },
      { id: 'bun2', text: '...the second vendor', kind: 'event', event: 'bun2', after: 'bun1', markers: [{ ...BUN_CHECKPOINTS[1], label: 'Vendor 2' }] },
      { id: 'bun3', text: '...and the third', kind: 'event', event: 'bun3', after: 'bun2', markers: [{ ...BUN_CHECKPOINTS[2], label: 'Vendor 3' }] },
    ],
  },
  {
    id: 'map',
    title: 'Map sabotage',
    teaser: 'Steal a tourist\'s map and drown it in the harbour.',
    timed: false,
    startOn: ['snatch:map'],
    objectives: [
      { id: 'steal', text: 'Steal the map from the pink tourist at the east side', kind: 'event', event: 'snatch:map', hint: STEAL_TIP },
      { id: 'sea', text: 'Drop it in the harbour', kind: 'event', event: 'mapInSea', after: 'steal', hint: 'Fly out over the water and let go (E).' },
      { id: 'ferry', text: 'Watch them head for the wrong ferry', kind: 'event', event: 'wrongFerry', after: 'sea', hint: 'Wait a moment: he trudges off to the wrong ferry at the end of the quay. Keep clear of him so he does not notice you.', markers: [{ x: WRONG_FERRY.x, z: WRONG_FERRY.z, r: 4, label: 'Wrong ferry' }] },
    ],
  },
  {
    id: 'date',
    title: 'Blind-date wrecker',
    teaser: 'Ruin the blind date at the clock: swipe the bouquet and splat the date.',
    timed: false,
    startOn: ['snatch:flowers'],
    objectives: [
      { id: 'steal', text: 'Swipe the bouquet from the man at the clock', kind: 'event', event: 'snatch:flowers', hint: STEAL_TIP, markers: [{ x: CLOCK.x, z: CLOCK.z, r: 5, label: 'Blind date' }] },
      { id: 'splat', text: 'Poop on one of the dates', kind: 'event', event: 'poopNpc:dater', after: 'steal', hint: 'Poop from above: the reticle shows where it lands.' },
      { id: 'over', text: 'Watch them storm off', kind: 'event', event: 'dateOver', after: 'splat' },
    ],
  },
  {
    id: 'toy',
    title: 'Lost teddy',
    teaser: 'A child on the quay lost a teddy bear behind the market stalls. Be a good bird and bring it back.',
    timed: false,
    startOn: ['grab:toy'],
    objectives: [
      { id: 'find', text: 'Find the teddy bear behind the market stalls', kind: 'event', event: 'grab:toy', hint: 'Follow the yellow pillar to the north of the stalls.', markers: [{ x: TOY_SPOT.x, z: TOY_SPOT.z, r: 4, label: 'Teddy bear' }] },
      { id: 'return', text: 'Bring it to the child on the quay', kind: 'event', event: 'tookItem:toy', after: 'find', hint: 'Drop it (E) next to the child and they will pick it up.', markers: [{ x: CHILD_SPOT.x, z: CHILD_SPOT.z, r: 3, label: 'Child' }] },
    ],
  },
  {
    id: 'finale',
    title: 'Grand finale: market mayhem',
    teaser: 'Ring the ferry horn (land on the ferry cabin roof), then wreck the market before time runs out.',
    timed: true,
    timeKey: 'finaleTime',
    requires: MAIN,
    startOn: ['finaleStart'],
    startHeat: 80,
    startMarkers: [{ x: FERRY.x - 5, z: FERRY.z, r: 5, y: FERRY_CABIN_ROOFS.minY + 2.2, label: 'Ferry horn' }],
    objectives: [
      { id: 'chairs', text: 'Collapse the chair stack', kind: 'event', event: 'tipChair', count: 3, hint: 'Dive into the café chair stack at the west edge of the square.', markers: [{ ...CAFE, r: 3, label: 'Chair stack' }] },
      { id: 'pastry', text: 'Swipe the pastry from the stall counter', kind: 'event', event: 'grab:stallBun', hint: 'It sits on a counter of the south row of stalls (follow the yellow pillar), right in front of a vendor.', markers: [{ x: 8, z: -30, r: 3, label: 'Pastry' }] },
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
  {
    id: 'bonus',
    title: '★ Extra objectives',
    teaser: 'For gulls who cleared the level: even more mischief.',
    timed: false,
    requiresFlag: 'replay',
    hidden: true,
    objectives: [
      { id: 'steal', text: 'Steal 4 things', kind: 'event', event: 'snatch', count: 4 },
      { id: 'poop', text: 'Poop on 3 people', kind: 'event', event: 'poopNpc', count: 3 },
      { id: 'bottles', text: 'Smash 3 bottles', kind: 'event', event: 'breakBottle', count: 3 },
      { id: 'bins', text: 'Tip over 3 bins', kind: 'event', event: 'tipBin', count: 3 },
      { id: 'dodge', text: 'Dodge 5 vendor sprays', kind: 'event', event: 'dodge:vendors', count: 5 },
      { id: 'warden', text: 'Poop on the Warden 3 times', kind: 'event', event: 'poopWarden', count: 3 },
    ],
  },
];

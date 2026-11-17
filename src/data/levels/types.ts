import type { QuestDef } from '../quests';
import type { TriggerDef } from '../../gameplay/triggers';
import type { SkillId } from '../skills';
import type { NpcSpawn, Station } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import type { DeterrentId } from '../../gameplay/deterrents';

/**
 * One level: a short visit to a district with its own to-do list, cast and rules (M12). Plain data; the game builds
 * the level from it (see `src/gameplay/level.ts`). The free-play sandbox is a level too.
 */
export interface LevelDef {
  id: string;
  /** Shown on the level select. */
  name: string;
  blurb: string;
  district: 'kauppatori' | 'senaatintori' | 'esplanadi';
  /** A heading of its own in the level lists (instead of the district's), for a run of levels of one kind. */
  series?: string;
  /** Where the gull starts (default: the Market Square). */
  start?: { x: number; z: number };
  /** A tram running back and forth along a straight track (Senate Square). */
  tram?: { z: number; x0: number; x1: number; stopX: number; length: number; width: number; roofY: number };
  /** The Pigeon Gang living on a statue at this spot. */
  pigeons?: { x: number; z: number };
  /** Esplanadi: sunbathers who wake when your shadow crosses their face (towel centre). */
  sunbathers?: { x: number; z: number }[];
  /** Esplanadi: park dogs (home spot and the owner's feet). */
  dogs?: { x: number; z: number; ownerX: number; ownerZ: number }[];
  /** Esplanadi: lawn sprinklers (spray zones) and the valve that starts them. */
  sprinklers?: { zones: { x: number; z: number; r: number }[]; valve: { x: number; z: number; r: number } };
  /** A quiet zone (the library): flying or diving inside makes a racket that everyone hears. */
  quiet?: { x: number; z: number; r: number };
  /** The concert falls silent now and then: calling (Mimic) in the quiet bit sets off every phone. */
  quietBreaks?: { first: number; every: number; duration: number };
  /** Splats on the ground inside a zone count as an event (a trap being set). */
  splatZones?: { event: string; zone: { minX: number; maxX: number; minZ: number; maxZ: number } }[];
  /** The conga line: when enough followers (people who trail a taunting gull) are somewhere, an event fires (once). */
  parade?: { stops: { event: string; need: number; at?: { x: number; z: number; r: number }; text?: string; send?: { role: string; goals: { x: number; z: number; name: string }[] } }[] };
  /** A cathedral bell that rings now and then: everyone within hearing looks up at the tower. */
  bells?: { x: number; z: number; first: number; every: number; duration: number };
  /** Things the gull can peck with E (a jukebox, a button): each starts an effect and fires `pecked:<id>`. */
  switches?: { id: string; x: number; z: number; label: string; effect: 'dance'; cooldown?: number }[];
  /** Havoc Hour: a timed chaos run with chain scoring instead of to-dos. */
  havoc?: { seconds: number };
  /** Free play: the whole quest pack, no stars, skills per quest (the M7/M8 game). */
  sandbox?: boolean;
  /** Ids of existing quests (from `QUESTS`) used as to-dos, in list order. */
  quests: string[];
  /** Quests defined just for this level (added after `quests`). */
  extraQuests?: QuestDef[];
  /** Hidden to-dos that exist only when two players are on the level (online co-op): they need both gulls. */
  coopQuests?: QuestDef[];
  /** To-dos shown as "???" until they are discovered (started or won). They count for the second star, not for clearing. */
  secret?: string[];
  /** Ids of existing world triggers (from `TRIGGERS`) this level needs. */
  triggers: string[];
  extraTriggers?: TriggerDef[];
  /** Which of the shared tourists take part: their `role`s ('any' = every tourist without a special role), or 'all'. */
  tourists: 'all' | string[];
  /** Stalls where people who crave something can buy it (comfort food). The goods are props placed on the counter. */
  stations?: Station[];
  /** Tourists placed just for this level. */
  extraTourists?: NpcSpawn[];
  /** Props placed just for this level (on top of the city's own). */
  extraProps?: PropSpawn[];
  /** The level that must be cleared first (shown locked until then). */
  requires?: string;
  /** Is the city on guard (heat, vendors, lines, nets, the Warden)? Early levels keep it calm. */
  defense: boolean;
  /** The city has been bothering gulls for a while when the level starts: heat is at least this (vendors from 20, lines 40, nets 60, the Warden 80). */
  startHeat?: number;
  /** Deterrents that are up from the start (without raising the heat): 'vendors', 'lines', 'nets', 'warden'. */
  deploy?: DeterrentId[];
  /** The Warden's lunch break: seconds after the start, where he sits, and for how long (`repeat`: and again every this many seconds). */
  wardenLunch?: { at: number; duration: number; x: number; z: number; repeat?: number };
  /** Things in the sea tagged 'note' (a message in a bottle) are carried by the current toward this spot. */
  drift?: { x: number; z: number };
  /** Skills the level hands you for its duration (the skill levels). */
  skills?: SkillId[];
  /** The scare lines are invisible until you use hawk-eye. */
  hiddenLines?: boolean;
  /** Disguised, you must act like a pigeon: flying or running breaks the disguise. */
  pigeonRules?: boolean;
  /** Rising warm air over rooftops: a gull gliding inside gets a lift (m/s^2). */
  thermals?: { x: number; z: number; r: number; lift: number }[];
  /** Winter: the sea is frozen (you walk on it instead of swimming), it snows. */
  winter?: boolean;
  /** Dusk: darker sky and lights (the night market). Same as `sky: 'night'`. */
  night?: boolean;
  /** Time of day: sky, fog, sun and light colours (data/skies). Default noon. */
  sky?: import('../skies').SkyId;
  /** Vendors sleep at their stalls until a loud noise or a gull right beside them wakes them. */
  sleepingVendors?: boolean;
  /** The gull-hunting drone is loose, starting here. */
  drone?: { x: number; z: number };
  /** The rival gull Kalle, with his perch (where he brings his loot) and how many snacks win the duel. */
  kalle?: { x: number; z: number; goal: number };
  /** A line added to the level-complete card (the ending of the last level). */
  endingNote?: string;
  /** Par time in seconds for the third star. */
  parTime?: number;
  /** Skill earned by clearing the level the first time. */
  reward?: SkillId;
}

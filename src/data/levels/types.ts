import type { QuestDef } from '../quests';
import type { TriggerDef } from '../../gameplay/triggers';
import type { SkillId } from '../skills';
import type { NpcSpawn } from '../../gameplay/npc';
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
  district: 'kauppatori' | 'senaatintori';
  /** Where the gull starts (default: the Market Square). */
  start?: { x: number; z: number };
  /** A cathedral bell that rings now and then: everyone within hearing looks up at the tower. */
  bells?: { x: number; z: number; first: number; every: number; duration: number };
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
  /** Dusk: darker sky and lights (the night market). */
  night?: boolean;
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

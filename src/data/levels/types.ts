import type { QuestDef } from '../quests';
import type { TriggerDef } from '../../gameplay/triggers';
import type { SkillId } from '../skills';

/**
 * One level: a short visit to a district with its own to-do list, cast and rules (M12). Plain data; the game builds
 * the level from it (see `src/gameplay/level.ts`). The free-play sandbox is a level too.
 */
export interface LevelDef {
  id: string;
  /** Shown on the level select. */
  name: string;
  blurb: string;
  district: 'kauppatori';
  /** Free play: the whole quest pack, no stars, skills per quest (the M7/M8 game). */
  sandbox?: boolean;
  /** Ids of existing quests (from `QUESTS`) used as to-dos, in list order. */
  quests: string[];
  /** Quests defined just for this level (added after `quests`). */
  extraQuests?: QuestDef[];
  /** To-dos shown as "???" until they are discovered (started or won). They count for the second star, not for clearing. */
  secret?: string[];
  /** Ids of existing world triggers (from `TRIGGERS`) this level needs. */
  triggers: string[];
  extraTriggers?: TriggerDef[];
  /** Which tourists take part: their `role`s ('any' = every tourist without a special role), or 'all'. */
  tourists: 'all' | string[];
  /** Is the city on guard (heat, vendors, lines, nets, the Warden)? Early levels keep it calm. */
  defense: boolean;
  /** Par time in seconds for the third star. */
  parTime?: number;
  /** Skill earned by clearing the level the first time. */
  reward?: SkillId;
}

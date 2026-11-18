import type { EmoteKind } from '../render/emotes';
import type { Sfx } from '../core/audio';

/**
 * A reaction: when a quest event happens, the world answers (a person's mood changes, someone walks over, the crowd laughs).
 * Level data lists them; they are what turns "do the step" into "the world reacts to what you did" (docs/design/puzzle-quality.md).
 */
export interface Reaction {
  /** The quest event that triggers it ('grab:benchBun', 'mapInSea'). */
  on: string;
  /** Everyone with this role changes mood. */
  mood?: { role: string; mood: 'calm' | 'annoyed' | 'angry' | 'upset' | 'delighted' };
  /** Everyone with this role walks to these places (like the ruined date). */
  send?: { role: string; goals: { x: number; z: number; name: string }[] };
  /** Everyone with this role is looking elsewhere for a while (their hands are open). */
  distract?: { role: string; seconds: number };
  /** Everyone with this role is too busy to notice the gull for a while (so the plan can play out). */
  oblivious?: { role: string; seconds: number };
  /** Everyone within `r` of the point reacts with an emote (the audience). */
  witness?: { x: number; z: number; r: number; emote: EmoteKind };
  /** A line shown for a moment. */
  say?: string;
  sound?: Sfx;
  /** The Warden sets off after the gull. */
  hunt?: boolean;
  /** Another quest event this reaction causes (it can start the next step). */
  emit?: string;
}

export const reactionsFor = (list: readonly Reaction[] | undefined, event: string): Reaction[] => (list ?? []).filter((r) => r.on === event);

/** Events that count as a person or the city reacting (for the chain test). */
export const REACTION_EVENT = /^(robbed|mood|atStation|bought|slipped|soaked|honkDrop|knockdown|spread|dancers|signSplat|poopNpc|poopWarden|wardenHunt|dodge|bunAtDock|mapInSea|wrongFerry|distract|tugWin|snatch|pecked|dancing|boo|slammed|pose|bellPoop|bellSnatch|tramBlocked|pigeons)/;

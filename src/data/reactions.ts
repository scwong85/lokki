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
  send?: { role: string; goals: { x: number; z: number; name: string }[]; /** They stay there for good (no going back to their post). */ stay?: boolean };
  /** Everyone with this role is looking elsewhere for a while (their hands are open). */
  distract?: { role: string; seconds: number };
  /** Everyone with this role is too busy to notice the gull for a while (so the plan can play out). */
  oblivious?: { role: string; seconds: number };
  /** Everyone within `r` of the point reacts with an emote (the audience). */
  witness?: { x?: number; z?: number; r: number; emote: EmoteKind; /** Centre it on the people with this role (the victim) instead of a fixed spot: the victim and everybody around them react. */ role?: string };
  /** A line shown for a moment. */
  say?: string;
  sound?: Sfx;
  /** The Warden sets off after the gull. */
  hunt?: boolean;
  /** Another quest event this reaction causes (it can start the next step). */
  emit?: string;
  /** Only on this occurrence of the event (1 = the first time, 2 = the second...): a reaction that escalates (M101). Without it, the reaction plays the first time only, unless `repeat`. */
  nth?: number;
  /** Plays every time the event happens. */
  repeat?: boolean;
  /** Something turns up (the fisherman reels in a boot): a prop placed here. */
  spawn?: { type: import('./props').PropType; x: number; z: number; tag?: string };
}

export const reactionsFor = (list: readonly Reaction[] | undefined, event: string): Reaction[] => (list ?? []).filter((r) => r.on === event);

/** Events that count as a person or the city reacting (for the chain test). */
export const REACTION_EVENT = /^(robbed|mood|atStation|bought|slipped|soaked|honkDrop|knockdown|spread|dancers|signSplat|poopNpc|poopWarden|wardenHunt|dodge|bunAtDock|mapInSea|wrongFerry|distract|tugWin|dancing|boo|slammed|bellPoop|bellSnatch|tramBlocked|pigeons)/;

/**
 * Should reaction number `index` play now, the `count`-th time its event happens? With `nth` only on that occurrence; with `repeat`
 * every time; otherwise the first time only (`done` remembers which ones have played; it is updated).
 */
export function reactionPlays(r: Reaction, key: string, count: number, done: Set<string>): boolean {
  if (r.nth !== undefined) return count === r.nth;
  if (r.repeat) return true;
  if (done.has(key)) return false;
  done.add(key);
  return true;
}

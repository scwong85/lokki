/**
 * Messages between the host (who runs the game) and the guest (a thin client). Plain JSON; versioned so an old tab
 * cannot silently confuse a new one. Pure.
 */
import type { GullSnap, Snapshot } from './snapshot';

export const PROTOCOL_VERSION = 1;

/** One frame of the guest's controls, sent every sim step (about 60 per second, small). */
export interface InputFrame {
  /** Sequence number: lets the guest tell which of its inputs the host has already applied. */
  n: number;
  ax: number;
  ay: number;
  flap: boolean;
  dive: boolean;
  yaw: number;
  pitch: number;
  /** The guest's own gull (it flies it itself, so flying never lags; the host trusts it). */
  s: GullSnap;
  /** Recent one-off presses with ids ('KeyE' grab, 'KeyQ' toss, 'KeyF' poop). Sent again for a moment: the channel may drop packets. */
  taps: [number, string][];
}

/** Something the guest should show or play (the host decided it happened). */
export type GameEvent =
  | { k: 'toast'; text: string; secs?: number }
  | { k: 'sound'; name: string }
  | { k: 'banner'; title: string; sub: string; kind: string }
  | { k: 'levelComplete'; data: unknown }
  | { k: 'poop'; p: [number, number, number]; v: [number, number, number] }
  | { k: 'hit'; hit: unknown }
  | { k: 'clear'; level: string; stars: [boolean, boolean, boolean]; seconds: number }
  | { k: 'hideComplete' };

export type Msg =
  | { t: 'hello'; v: number; name: string; look: string }
  | { t: 'welcome'; v: number; level: string; hostLook: string; skills?: string[] }
  | { t: 'level'; id: string }
  | { t: 'input'; f: InputFrame }
  | { t: 'snap'; s: Snapshot; ack: number; lvl: string; rev: number }
  | { t: 'event'; e: GameEvent }
  | { t: 'chat'; text: string }
  | { t: 'bye'; why: string }
  | { t: 'ping'; at: number }
  | { t: 'pong'; at: number };

export const encodeMsg = (m: Msg): string => JSON.stringify(m);

/** Text -> message, or null for anything we do not understand (never throws: a bad packet must not crash the game). */
export function decodeMsg(text: string): Msg | null {
  try {
    const m = JSON.parse(text) as Msg;
    return m && typeof m === 'object' && typeof (m as { t?: unknown }).t === 'string' ? m : null;
  } catch {
    return null;
  }
}

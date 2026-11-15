/**
 * Messages between the host (who runs the game) and the guest (a thin client). Plain JSON; versioned so an old tab
 * cannot silently confuse a new one. Pure.
 */
import type { Snapshot } from './snapshot';

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
  /** One-off presses since the last frame ('KeyE', 'KeyQ', 'KeyF', 'KeyH', 'KeyV', 'KeyG', 'KeyB'). */
  taps: string[];
}

/** Something the guest should show or play (the host decided it happened). */
export type GameEvent =
  | { k: 'toast'; text: string; secs?: number }
  | { k: 'sound'; name: string }
  | { k: 'shake'; amount: number }
  | { k: 'banner'; title: string; sub: string; style: string }
  | { k: 'levelComplete'; heading: string; lines: string[]; notes: string[]; nextId?: string; nextName?: string };

export type Msg =
  | { t: 'hello'; v: number; name: string; look: string }
  | { t: 'welcome'; v: number; level: string; seed: number; hostLook: string }
  | { t: 'level'; id: string; seed: number }
  | { t: 'input'; f: InputFrame }
  | { t: 'snap'; s: Snapshot; ack: number }
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

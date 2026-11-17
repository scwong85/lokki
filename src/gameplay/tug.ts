import { tuning } from '../core/tuning';
import type { Mood, NpcMode } from './npc';

/**
 * Tug of war (M52): on the ground a gull takes something out of a person's hand by holding E (or tapping it again and again)
 * while they pull back. In the air the snatch stays instant. This file is the pure model: the meter, the winner, and how hard
 * a person pulls. The interaction layer wires it to beaks, people and the vendor's spray.
 */
export type TugResult = 'none' | 'won' | 'lost' | 'cancelled';

export interface TugInput {
  /** E is held down. */
  held: boolean;
  /** Fresh E presses this step (tapping and mashing builds the meter and also keeps a touch tap alive). */
  mash: number;
  /** How hard they pull back (0..1 per second). */
  pull: number;
  /** A vendor's spray, the Warden or anything else broke it up: the gull loses. */
  interrupted: boolean;
}

export class Tug {
  progress: number;
  private sinceInput = 0;

  constructor(readonly propId: number, start = tuning.tug.start.value) {
    this.progress = start;
  }

  step(dt: number, i: TugInput): TugResult {
    const t = tuning.tug;
    if (i.interrupted) return 'lost';
    if (i.mash > 0) this.sinceInput = 0;
    else this.sinceInput += dt;
    const holding = i.held || this.sinceInput < t.grace.value; // a tap on a phone keeps it going for a moment
    if (!holding) return 'cancelled';
    this.progress += (t.hold.value - i.pull) * dt + i.mash * t.mash.value;
    if (this.progress >= 1) return 'won';
    if (this.progress <= 0) return 'lost';
    return 'none';
  }
}

/**
 * How hard someone pulls back, from what they are doing: a calm eater barely holds on, someone on guard (they noticed the gull)
 * pulls hard, an angry person harder; if they are startled (a honk) or distracted (a noise) they hardly pull at all.
 */
export function npcPull(n: { mode: NpcMode; mood: Mood; distractT: number }): number {
  const t = tuning.tug;
  if (n.mode === 'startle') return t.pullStartled.value;
  let pull = n.mode === 'notice' || n.mode === 'shield' ? t.pullGuarded.value : t.pullCalm.value;
  if (n.mood === 'angry') pull += t.pullAngry.value;
  if (n.distractT > 0) pull *= 0.3;
  return pull;
}

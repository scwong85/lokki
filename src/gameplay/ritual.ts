/**
 * Rituals (M102): a person's visible routine with a countdown, so the player can see the moment coming and time the mischief.
 * Every `every` seconds the person counts down "3, 2, 1" over their head, then does their thing for `hold` seconds: the Chef tastes
 * his soup with his eyes shut, the Mayor turns to his crowd for a little speech, the Guard checks his watch. While they do it they
 * see nothing (an open window). Pure timing.
 */
export interface Ritual {
  /** Seconds from one ritual to the next. */
  every: number;
  /** How long the ritual itself lasts (eyes elsewhere). */
  hold: number;
  /** Where in the cycle this person starts (so two people with rituals are out of step). */
  phase?: number;
  /** What shows over the head during the ritual (an emoji: 😋 tasting, 🎤 a speech, ⌚ the watch). */
  icon: string;
  /** Seconds of "3, 2, 1" before it (default 3). */
  countdown?: number;
  /** They turn to look at this during the ritual (else they just shut their eyes where they stand). */
  lookAt?: { x: number; z: number };
}

export interface RitualState {
  phase: 'idle' | 'count' | 'hold';
  /** 3, 2, 1 during the countdown. */
  count: number;
  /** Seconds into the current phase. */
  t: number;
}

export function ritualState(clock: number, r: Ritual): RitualState {
  const cd = r.countdown ?? 3;
  const cycle = Math.max(r.every, cd + r.hold + 0.5);
  const t = (((clock + (r.phase ?? 0)) % cycle) + cycle) % cycle;
  const holdStart = cycle - r.hold;
  const countStart = holdStart - cd;
  if (t >= holdStart) return { phase: 'hold', count: 0, t: t - holdStart };
  if (t >= countStart) return { phase: 'count', count: Math.max(1, Math.ceil(((holdStart - t) / cd) * 3)), t: t - countStart };
  return { phase: 'idle', count: 0, t };
}

/** The label over the head for a state: the countdown digit, the ritual's icon, or nothing. */
export const ritualLabel = (s: RitualState, r: Ritual): string | undefined => (s.phase === 'count' ? String(s.count) : s.phase === 'hold' ? r.icon : undefined);

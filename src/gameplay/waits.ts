/** The waits line (M120): the things a stage makes you wait for, with a countdown, so a wait reads as a plan and not as being stuck. */
export const clock = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function waitLine(w: { ferry?: number | null; lunch?: number | null }): string {
  const parts: string[] = [];
  if (w.ferry !== undefined && w.ferry !== null) parts.push(w.ferry <= 0 ? '⛴ The ferry is in' : `⛴ Next ferry in ${clock(w.ferry)}`);
  if (w.lunch !== undefined && w.lunch !== null) parts.push(w.lunch <= 0 ? '🥪 The Warden is at lunch' : `🥪 Warden's lunch in ${clock(w.lunch)}`);
  return parts.join(' · ');
}

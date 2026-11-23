import { fmtClock } from './rowTimes';

/**
 * The playtest report (M121): one block of text the player copies and pastes back to the developer, so a tuning change is based on numbers,
 * not on a summary. Built from the run log, the time per row and the row compass. Pure.
 */
export interface ReportInput {
  level: string;
  name: string;
  date: string;
  seconds: number;
  cleared: boolean;
  rows: { done: number; total: number } | null;
  rowLines: string[];
  tally: Record<string, number>;
  longestStuck: { seconds: number; x: number; z: number } | null;
  options: { easy: boolean; hints: string; device: string };
}

const n = (t: Record<string, number>, k: string): number => t[k] ?? 0;

export function playtestReport(r: ReportInput): string {
  const t = r.tally;
  const lines = [
    `Lokki playtest report · ${r.name} (${r.level}) · ${r.date}`,
    `Played ${fmtClock(r.seconds)} · ${r.cleared ? 'cleared' : 'not cleared'}${r.rows ? ` · rows ${r.rows.done}/${r.rows.total}` : ''}`,
    ...r.rowLines,
  ];
  if (r.longestStuck && r.longestStuck.seconds >= 20) lines.push(`Longest without finding or serving a row: ${fmtClock(r.longestStuck.seconds)} (around x ${Math.round(r.longestStuck.x)}, z ${Math.round(r.longestStuck.z)})`);
  lines.push(
    `Dives that missed a held item: ${n(t, 'nearMiss') + n(t, 'nearMiss:body')} (body in the way ${n(t, 'nearMiss:body')}) · snatches ${n(t, 'snatch')}`,
    `Setbacks: Guard took it back ${n(t, 'setback:whistle')} · sprayed ${n(t, 'setback:spray')} · flew back with P ${n(t, 'flyBack')}`,
    `Help used: compass ${n(t, 'compass')} · hints asked ${n(t, 'hintAsked')} · flyovers skipped ${n(t, 'flyoverSkipped')}`,
    `Options: relaxed play ${r.options.easy ? 'on' : 'off'} · hints ${r.options.hints} · ${r.options.device}`,
  );
  return lines.join('\n');
}

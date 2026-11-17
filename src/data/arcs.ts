import type { LevelDef } from './levels/types';

/** The four arcs (acts) of the campaign, one per location (docs/design/arcs.md). */
export interface ArcInfo {
  arc: number;
  name: string;
  district: 'kauppatori' | 'senaatintori' | 'esplanadi' | 'katajanokka';
}

export const ARCS: readonly ArcInfo[] = [
  { arc: 1, name: 'Act 1 · Kauppatori, the Market Square', district: 'kauppatori' },
  { arc: 2, name: 'Act 2 · Senate Square', district: 'senaatintori' },
  { arc: 3, name: 'Act 3 · Esplanadi', district: 'esplanadi' },
  { arc: 4, name: 'Act 4 · Katajanokka, the harbour', district: 'katajanokka' },
];

export const STAGES_PER_ARC = 5;

export const arcInfo = (arc: number): ArcInfo | undefined => ARCS.find((a) => a.arc === arc);

/** The id of a stage level: `a1s3` is act 1, stage 3. */
export const stageId = (arc: number, stage: number): string => `a${arc}s${stage}`;

/** The stage that comes right before this one (the first stage of an act follows the finale of the act before); null for the very first. */
export function previousStage(arc: number, stage: number): { arc: number; stage: number } | null {
  if (stage > 1) return { arc, stage: stage - 1 };
  return arc > 1 ? { arc: arc - 1, stage: STAGES_PER_ARC } : null;
}

/** Fill in what every stage has in common (id, gate position, the level that opens it) around its own content. */
export function stage(arc: number, n: number, def: Omit<LevelDef, 'id' | 'arc' | 'stage' | 'requires' | 'district'> & { district?: LevelDef['district'] }): LevelDef {
  const prev = previousStage(arc, n);
  return { ...def, id: stageId(arc, n), arc, stage: n, requires: prev ? stageId(prev.arc, prev.stage) : undefined, district: def.district ?? 'kauppatori' } as LevelDef;
}

/** Levels that belong to the campaign, in play order. */
export const stagesOf = (levels: readonly LevelDef[]): LevelDef[] => levels.filter((l) => l.arc !== undefined).sort((a, b) => a.arc! - b.arc! || a.stage! - b.stage!);

/** Levels outside the campaign: the Playground (the old levels, the toys, free play). */
export const playgroundOf = (levels: readonly LevelDef[]): LevelDef[] => levels.filter((l) => l.arc === undefined);

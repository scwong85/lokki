import { events } from './events';

export interface Param {
  value: number;
  min: number;
  max: number;
  step: number;
}

const p = (value: number, min: number, max: number, step = 0.01): Param => ({ value, min, max, step });

/** All feel parameters live here (PLAN §6.6). Groups are per system. */
export const tuning = {
  gull: {
    maxSpeed: p(9, 1, 30, 0.1),
    acceleration: p(30, 1, 100, 0.5),
    friction: p(18, 1, 100, 0.5),
    turnRate: p(12, 1, 40, 0.5),
  },
  camera: {
    distance: p(7, 2, 20, 0.1),
    height: p(3, 0, 10, 0.1),
    lag: p(8, 1, 30, 0.1),
    fov: p(65, 40, 100, 1),
    mouseSensitivity: p(0.0025, 0.0005, 0.01, 0.0005),
  },
  render: {
    fogNear: p(40, 0, 200, 1),
    fogFar: p(220, 50, 800, 1),
  },
};

export type Tuning = typeof tuning;
export const defaults: Tuning = structuredClone(tuning);

/** Export as a plain {group:{name:value}} object for "Copy tuning as JSON". */
export function exportTuning(t: Tuning = tuning): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [g, params] of Object.entries(t)) {
    out[g] = {};
    for (const [k, v] of Object.entries(params as Record<string, Param>)) out[g][k] = v.value;
  }
  return out;
}

/** Apply a plain exported object onto tuning (unknown keys ignored, values clamped). */
export function importTuning(json: Record<string, Record<string, number>>, t: Tuning = tuning): void {
  for (const [g, params] of Object.entries(json)) {
    const group = (t as Record<string, Record<string, Param> | undefined>)[g];
    if (!group) continue;
    for (const [k, v] of Object.entries(params)) {
      const prm = group[k];
      if (prm && typeof v === 'number') prm.value = Math.min(prm.max, Math.max(prm.min, v));
    }
  }
  events.emit('tuningChanged', undefined);
}

import { tuning } from '../core/tuning';

export type SelfiePhase = 'idle' | 'count' | 'open';

export interface SelfieState {
  phase: SelfiePhase;
  /** The number shown while counting: 3, 2, 1 (0 otherwise). */
  count: 0 | 1 | 2 | 3;
  /** Seconds into the whole cycle. */
  t: number;
}

/**
 * The selfie routine of a tourist: guarding her ice cream (idle), then a telegraphed "3, 2, 1" while she lifts her
 * phone, then the shot itself: for a couple of seconds she only has eyes for the screen and the ice cream is open.
 * Pure: the phase is a function of the clock, so it is the same for the host and any guest, and easy to test.
 */
export function selfieState(clock: number, offset = 0): SelfieState {
  const s = tuning.selfie;
  const idle = s.idle.value, count = s.count.value, open = s.open.value;
  const cycle = idle + count + open;
  const t = (((clock + offset) % cycle) + cycle) % cycle;
  if (t < idle) return { phase: 'idle', count: 0, t };
  if (t < idle + count) {
    const left = idle + count - t; // counts down from `count` to 0
    return { phase: 'count', count: Math.min(3, Math.max(1, Math.ceil((left / count) * 3))) as 1 | 2 | 3, t };
  }
  return { phase: 'open', count: 0, t };
}

/** Is the gull in the photo? In front of her camera (a cone along where she faces), close enough and not far overhead. */
export function inFrame(npc: { x: number; z: number }, facing: number, gull: { x: number; y: number; z: number }): boolean {
  const q = tuning.selfie;
  const dx = gull.x - npc.x, dz = gull.z - npc.z;
  const d = Math.hypot(dx, dz);
  if (d > q.frameRange.value || d < 0.3 || gull.y > q.frameHeight.value) return false;
  const fx = -Math.sin(facing), fz = -Math.cos(facing);
  const cos = (dx * fx + dz * fz) / d;
  return cos >= Math.cos((q.frameConeDeg.value * Math.PI) / 360); // the cone's full angle is frameConeDeg
}

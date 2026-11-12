import { tuning } from '../core/tuning';

export interface Wind {
  x: number;
  z: number;
  speed: number;
  /** Direction the wind blows toward, as a heading (0 = -Z), same convention as the gull's heading. */
  angle: number;
}

/** Deterministic wind: slow direction drift + gusts, a pure function of time. */
export function windAt(t: number): Wind {
  const w = tuning.wind;
  const angle = (w.directionDeg.value * Math.PI) / 180 + 0.6 * Math.sin(t * 0.07);
  const gust = 1 + w.gustiness.value * (0.6 * Math.sin(t * 0.9) + 0.4 * Math.sin(t * 2.3 + 1.3));
  const speed = Math.max(0, w.strength.value * gust);
  return { x: -Math.sin(angle) * speed, z: -Math.cos(angle) * speed, speed, angle };
}

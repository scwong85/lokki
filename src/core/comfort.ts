/**
 * Comfort and handling (M50): presets that tone down the camera effects that cause motion sickness, plus the small pure
 * helpers behind smoother steering: input smoothing, a camera that follows the gull's heading, a vignette that closes in
 * on fast turns, and mouse-look smoothing. Pure logic, no rendering.
 */
export type Comfort = 'standard' | 'gentle' | 'calm';
export type CamFollow = 'off' | 'gentle' | 'strong';

export interface ComfortMods {
  /** Multipliers on the dive FOV kick, camera roll, screen shakeand look-ahead. */
  fovKick: number;
  roll: number;
  shake: number;
  lookAhead: number;
  /** How dark the vignette gets at its strongest (0 = never shown). */
  vignette: number;
  /** Time constant (s) of the steering smoothing, and of the mouse-look smoothing. */
  stickTau: number;
  lookTau: number;
}

export const COMFORT: Record<Comfort, ComfortMods> = {
  standard: { fovKick: 1, roll: 1, shake: 1, lookAhead: 1, vignette: 0, stickTau: 0.07, lookTau: 0 },
  gentle: { fovKick: 0.4, roll: 0.35, shake: 0.5, lookAhead: 0.5, vignette: 0.35, stickTau: 0.1, lookTau: 0.03 },
  calm: { fovKick: 0, roll: 0, shake: 0.15, lookAhead: 0.25, vignette: 0.6, stickTau: 0.14, lookTau: 0.06 },
};

export const FOLLOW_RATE: Record<CamFollow, number> = { off: 0, gentle: 0.5, strong: 1.3 };

/** The live settings read by the camera and the main loop (set from the options). */
export const comfort: { mods: ComfortMods; invertY: boolean; smoothSteer: boolean; follow: CamFollow } = {
  mods: COMFORT.standard,
  invertY: false,
  smoothSteer: true,
  follow: 'gentle',
};

/** Move `prev` towards `target` with time constant `tau` seconds (tau 0 = no smoothing). */
export function smoothAxis(prev: number, target: number, dt: number, tau: number): number {
  if (tau <= 0) return target;
  return prev + (target - prev) * (1 - Math.exp(-dt / tau));
}

const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Ease the camera yaw towards the gull's heading (camera behind the gull). `rate` per second; 0 leaves it alone. */
export function followYawStep(yaw: number, heading: number, dt: number, rate: number): number {
  if (rate <= 0) return yaw;
  return yaw + angleDiff(heading, yaw) * (1 - Math.exp(-rate * dt));
}

/** How dark the comfort vignette is: grows with the turn rate, a dive and speed. 0..strength. */
export function vignetteAmount(turnRate: number, diving: boolean, speedFrac: number, strength: number): number {
  if (strength <= 0) return 0;
  const raw = Math.min(1, Math.abs(turnRate) / 1.4 + (diving ? 0.6 : 0) + Math.min(1, speedFrac) * 0.25);
  return raw * strength;
}

/** Spreads each mouse movement over a few frames without losing any of it (so the total turn is unchanged, only softer). */
export class LookSmoother {
  private px = 0;
  private py = 0;

  step(dx: number, dy: number, dt: number, tau: number): { dx: number; dy: number } {
    if (tau <= 0) return { dx, dy };
    this.px += dx;
    this.py += dy;
    const k = 1 - Math.exp(-dt / tau);
    const ox = this.px * k, oy = this.py * k;
    this.px -= ox;
    this.py -= oy;
    return { dx: ox, dy: oy };
  }
}

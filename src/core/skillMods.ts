import { tuning } from './tuning';

/**
 * Multipliers that unlocked skills apply on top of the tuning values. Kept separate so the tuning panel and its
 * "Copy tuning as JSON" export stay the pure base values. All 1 = no skills.
 */
export const mods = {
  flapImpulse: 1,
  glideSink: 1,
  stamina: 1,
  carryMax: 1,
  poopCooldown: 1,
  hawkTime: 1,
  hawkCooldown: 1,
};

export type Mods = typeof mods;

export function resetMods(): void {
  for (const k of Object.keys(mods) as (keyof Mods)[]) mods[k] = 1;
}

/** Stamina capacity including the Strong-wings skill. */
export const staminaMax = (): number => tuning.flight.staminaMax.value * mods.stamina;

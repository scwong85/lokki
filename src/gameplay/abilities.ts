import { tuning } from '../core/tuning';

export type AbilityId = 'mimic' | 'flock' | 'disguise';

const total = (id: AbilityId): number =>
  id === 'mimic' ? tuning.skills.mimicCooldown.value : id === 'flock' ? tuning.skills.flockCooldown.value : tuning.skills.disguiseCooldown.value;

/** Cooldowns of the three active abilities and the disguise timer. Pure logic. */
export class Abilities {
  private cd: Record<AbilityId, number> = { mimic: 0, flock: 0, disguise: 0 };
  /** Seconds of disguise left. */
  disguiseT = 0;

  get disguised(): boolean {
    return this.disguiseT > 0;
  }

  ready(id: AbilityId): boolean {
    return this.cd[id] <= 0;
  }

  /** Try to use an ability: starts its cooldown (and the disguise). Returns false if it is not ready. */
  use(id: AbilityId): boolean {
    if (!this.ready(id)) return false;
    this.cd[id] = total(id);
    if (id === 'disguise') {
      this.disguiseT = tuning.skills.disguiseTime.value;
      this.cd.disguise = total('disguise') + this.disguiseT; // the cooldown starts when the disguise is over
    }
    return true;
  }

  /** 0 = just used, 1 = ready. */
  fraction(id: AbilityId): number {
    const t = id === 'disguise' ? total(id) + tuning.skills.disguiseTime.value : total(id);
    return this.cd[id] <= 0 ? 1 : Math.max(0, 1 - this.cd[id] / t);
  }

  /** Returns true on the step the disguise wears off. */
  tick(dt: number): boolean {
    for (const k of Object.keys(this.cd) as AbilityId[]) this.cd[k] = Math.max(0, this.cd[k] - dt);
    const was = this.disguiseT > 0;
    this.disguiseT = Math.max(0, this.disguiseT - dt);
    return was && this.disguiseT === 0;
  }

  reset(): void {
    this.cd = { mimic: 0, flock: 0, disguise: 0 };
    this.disguiseT = 0;
  }
}

/** The spot a crow call or flock call goes to: straight ahead of the camera. */
export function aheadOf(s: { x: number; z: number }, camYaw: number, distance: number): { x: number; z: number } {
  return { x: s.x - Math.sin(camYaw) * distance, z: s.z - Math.cos(camYaw) * distance };
}

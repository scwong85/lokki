import { mods, resetMods } from '../core/skillMods';
import { SKILLS, skillById, skillForQuest, type SkillDef } from '../data/skills';

/** Which skills the gull has earned, and their passive effect on the multipliers. Pure logic. */
export class SkillSet {
  private owned = new Set<string>();

  has(id: string): boolean {
    return this.owned.has(id);
  }

  get ids(): string[] {
    return SKILLS.filter((s) => this.owned.has(s.id)).map((s) => s.id);
  }

  /** Earned by finishing a quest. Returns the skill if it is new. */
  unlockForQuest(questId: string): SkillDef | null {
    const s = skillForQuest(questId);
    if (!s || this.owned.has(s.id)) return null;
    this.owned.add(s.id);
    this.apply();
    return s;
  }

  /** Load from a save: unknown ids are ignored. */
  restore(ids: readonly string[]): void {
    this.owned = new Set(ids.filter((id) => skillById(id)));
    this.apply();
  }

  clear(): void {
    this.owned.clear();
    this.apply();
  }

  /** Recompute the multipliers from the owned skills. */
  apply(): void {
    resetMods();
    for (const s of SKILLS) {
      if (!this.owned.has(s.id) || !s.mods) continue;
      for (const [k, v] of Object.entries(s.mods)) (mods as Record<string, number>)[k] *= v as number;
    }
  }
}

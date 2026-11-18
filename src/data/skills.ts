import type { Mods } from '../core/skillMods';

/** Skills (PLAN §3.6): each is earned by finishing a quest. Plain data. */
export type SkillId = 'flight' | 'mimic' | 'hawkeye' | 'fatbird' | 'flock' | 'disguise' | 'quickpoop' | 'cloudglide' | 'pigeons';

export interface SkillDef {
  id: SkillId;
  name: string;
  /** Quest that unlocks it. */
  quest: string;
  blurb: string;
  /** Key of its active ability, if any. */
  key?: string;
  /** Passive multipliers (applied on top of the tuning values). */
  mods?: Partial<Mods>;
}

export const SKILLS: SkillDef[] = [
  { id: 'flight', name: 'Strong wings', quest: 'icecream', blurb: 'Flaps lift more, you sink slower and tire later.', mods: { flapImpulse: 1.12, glideSink: 0.8, stamina: 1.25 } },
  { id: 'mimic', name: 'Mimic', quest: 'swap', key: 'V', blurb: 'Caw like a crow: people turn toward a spot ahead of you.' },
  { id: 'hawkeye', name: 'Hawk-eye', quest: 'cap', key: 'H', blurb: 'See lines and nets for three times as long, and sooner again.', mods: { hawkTime: 3, hawkCooldown: 0.4 } },
  { id: 'fatbird', name: 'Fat bird', quest: 'bun', blurb: 'Carry heavier things, up to 5 kg (chairs!).', mods: { carryMax: 5 } },
  { id: 'flock', name: 'Flock call', quest: 'map', key: 'G', blurb: 'Summon a few gulls to make a racket somewhere ahead.' },
  { id: 'disguise', name: 'Disguise', quest: 'date', key: 'B', blurb: 'Look like a pigeon: vendors and the Warden ignore you for a while.' },
  { id: 'cloudglide', name: 'Cloud Glide', quest: 'none', blurb: 'Gliding high, your shadow shrinks to almost nothing: sneak over sunbathers.' },
  { id: 'pigeons', name: 'Pigeon Diplomacy', quest: 'none', blurb: 'The Pigeon Gang remembers you: they are friends from the start, and the statue is yours to perch on.' },
  { id: 'quickpoop', name: 'Quick bowels', quest: 'toy', blurb: 'Poop twice as often.', mods: { poopCooldown: 0.5 } },
];

export const skillById = (id: string): SkillDef | undefined => SKILLS.find((s) => s.id === id);
export const skillForQuest = (questId: string): SkillDef | undefined => SKILLS.find((s) => s.quest === questId);

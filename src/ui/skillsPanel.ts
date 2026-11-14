import { SKILLS } from '../data/skills';
import { QUESTS } from '../data/quests';
import type { SkillSet } from '../gameplay/skills';
import type { Abilities, AbilityId } from '../gameplay/abilities';
import { formatClock } from '../gameplay/runTimer';
import type { SaveData } from '../core/save';

/** Skills screen (K) and the little ability bar that shows the active skills and their cooldowns. */
export class SkillsPanel {
  private el: HTMLElement;
  private bar: HTMLElement;
  private chips = new Map<AbilityId, { box: HTMLElement; fill: HTMLElement }>();

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'skills';
    this.el.hidden = true;
    root.appendChild(this.el);
    this.bar = document.createElement('div');
    this.bar.id = 'abilities';
    root.appendChild(this.bar);
    for (const [id, key, label] of [['mimic', 'V', 'Caw'], ['flock', 'G', 'Flock'], ['disguise', 'B', 'Pigeon']] as [AbilityId, string, string][]) {
      const box = document.createElement('div');
      box.className = 'ab';
      box.hidden = true;
      box.innerHTML = `<b>${key}</b> ${label}<div class="abf"></div>`;
      this.bar.appendChild(box);
      this.chips.set(id, { box, fill: box.querySelector('.abf') as HTMLElement });
    }
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  toggle(skills: SkillSet, save: SaveData): void {
    this.el.hidden = !this.el.hidden;
    if (!this.el.hidden) this.render(skills, save);
  }

  hide(): void {
    this.el.hidden = true;
  }

  private render(skills: SkillSet, save: SaveData): void {
    const rows = SKILLS.map((s) => {
      const have = skills.has(s.id);
      const quest = QUESTS.find((q) => q.id === s.quest)?.title ?? s.quest;
      return `<li class="${have ? 'have' : ''}"><b>${have ? '☑' : '☐'} ${s.name}</b>${s.key ? ` <kbd>${s.key}</kbd>` : ''}<div>${have ? s.blurb : `Locked: finish “${quest}”.`}</div></li>`;
    }).join('');
    const replay = save.replayUnlocked
      ? `<p class="sk-replay">Replay variants unlocked: <kbd>X</kbd> extra objectives (${save.extrasOn ? 'on' : 'off'}) · <kbd>Z</kbd> speedrun${save.speedrunBest ? ` (best ${formatClock(save.speedrunBest)})` : ''}</p>`
      : '<p class="sk-replay">Clear the finale to unlock extra objectives and a speedrun.</p>';
    this.el.innerHTML = `<div class="sk-card"><h2>Skills</h2><ul>${rows}</ul>${replay}<p class="sk-keys">Press <kbd>K</kbd> to close · progress is saved in this browser</p></div>`;
  }

  /** Per frame: show the abilities you have and how far their cooldowns are. */
  updateBar(skills: SkillSet, abilities: Abilities): void {
    for (const [id, c] of this.chips) {
      const have = skills.has(id);
      c.box.hidden = !have;
      if (!have) continue;
      const f = abilities.fraction(id);
      c.fill.style.width = `${Math.round(f * 100)}%`;
      c.box.classList.toggle('ready', f >= 1);
      c.box.classList.toggle('on', id === 'disguise' && abilities.disguised);
    }
  }
}

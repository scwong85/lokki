import { SKILLS } from '../data/skills';
import { QUESTS } from '../data/quests';
import type { SkillSet } from '../gameplay/skills';
import type { Abilities, AbilityId } from '../gameplay/abilities';
import { formatClock } from '../gameplay/runTimer';
import type { SaveData } from '../core/save';
import { GULL_SKINS, unlockedSkins } from '../data/gullSkins';

/** Unlock progress for the gull looks, from the save. */
export const skinProgress = (save: SaveData) => ({ skills: save.skills.length, clears: save.clears, speedrun: save.speedrunBest !== null });

/** Skills screen (K) and the little ability bar that shows the active skills and their cooldowns. */
export class SkillsPanel {
  private el: HTMLElement;
  private bar: HTMLElement;
  private chips = new Map<AbilityId, { box: HTMLElement; fill: HTMLElement }>();

  constructor(root: HTMLElement, private onSkin: (id: string) => void = () => undefined) {
    this.el = document.createElement('div');
    this.el.id = 'skills';
    this.el.hidden = true;
    this.el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-close]')) {
        this.hide();
        return;
      }
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-skin]');
      if (b && !b.classList.contains('locked')) this.onSkin(b.dataset.skin!);
    });
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

  /** Redraw while open (after picking a look). */
  refresh(skills: SkillSet, save: SaveData): void {
    if (!this.el.hidden) this.render(skills, save);
  }

  hide(): void {
    this.el.hidden = true;
  }

  private render(skills: SkillSet, save: SaveData): void {
    const open = unlockedSkins(skinProgress(save));
    const looks = GULL_SKINS.map((s, i) => {
      const ok = open.includes(s.id);
      const c = s.colours;
      const sw = `<span class="sw" style="background:linear-gradient(135deg,#${c.head.toString(16).padStart(6, '0')} 0 40%,#${c.mantle.toString(16).padStart(6, '0')} 40% 75%,#${c.tip.toString(16).padStart(6, '0')} 75%)"></span>`;
      return `<button data-skin="${s.id}" class="${ok ? '' : 'locked'} ${save.skin === s.id ? 'on' : ''}" title="${ok ? s.name : `Locked: ${s.how}`}">${sw}<kbd>${i + 1}</kbd> ${ok ? s.name : '🔒 ' + s.how}</button>`;
    }).join('');
    const rows = SKILLS.map((s) => {
      const have = skills.has(s.id);
      const quest = QUESTS.find((q) => q.id === s.quest)?.title ?? s.quest;
      return `<li class="${have ? 'have' : ''}"><b>${have ? '☑' : '☐'} ${s.name}</b>${s.key ? ` <kbd>${s.key}</kbd>` : ''}<div>${have ? s.blurb : `Locked: finish “${quest}”.`}</div></li>`;
    }).join('');
    const replay = save.replayUnlocked
      ? `<p class="sk-replay">Replay variants unlocked: <kbd>X</kbd> extra objectives (${save.extrasOn ? 'on' : 'off'}) · <kbd>Z</kbd> speedrun${save.speedrunBest ? ` (best ${formatClock(save.speedrunBest)})` : ''}</p>`
      : '<p class="sk-replay">Clear the finale to unlock extra objectives and a speedrun.</p>';
    this.el.innerHTML = `<div class="sk-card"><h2>Skills</h2><ul>${rows}</ul>${replay}<h3>Gull look</h3><div class="sk-looks">${looks}</div><p class="sk-keys">Press <kbd>K</kbd> to close · <kbd>1</kbd>–<kbd>${GULL_SKINS.length}</kbd> pick a look · progress is saved in this browser</p><button class="sk-close" data-close>Close</button></div>`;
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

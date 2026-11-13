import type { QuestState } from '../gameplay/quest';
import { QUESTS } from '../data/quests';
import { tuning } from '../core/tuning';

/** Paper-note to-do list with quest timers. DOM is only rebuilt when the list changes. */
export class Todo {
  private el: HTMLElement;
  private timers = new Map<string, HTMLElement>();
  private last = '';

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'todo';
    root.appendChild(this.el);
  }

  update(quests: readonly QuestState[], nearestNpc = Infinity, carryingStolen = false): void {
    const sig = quests.map((q) => `${q.id}:${q.status}:${q.objectives.map((o) => (o.done ? 1 : 0)).join('')}`).join('|');
    if (sig !== this.last) {
      this.last = sig;
      this.timers.clear();
      this.el.innerHTML = `<h3>To do</h3>${quests
        .map(
          (q) => `<div class="q ${q.status}">
            <div class="qt">${q.title}${q.timed ? ' <span class="timer" data-q="' + q.id + '"></span>' : ''}
              ${q.status === 'won' ? '<b class="ok">done!</b>' : q.status === 'lost' ? '<b class="bad">failed - press R</b>' : ''}</div>
            <ul>${q.objectives
              .map((o, i) => {
                const def = QUESTS.find((d) => d.id === q.id)?.objectives[i];
                const firstOpen = q.status === 'active' && !o.done && q.objectives.slice(0, i).every((x) => x.done);
                const extra = firstOpen && def?.kind === 'escape' ? ` <span class="esc" data-q="${q.id}"></span>` : '';
                const hint = firstOpen && def?.hint ? `<div class="hint">${def.hint}</div>` : '';
                return `<li class="${o.done ? 'done' : ''}"><span>${o.done ? '☑' : '☐'}</span> ${o.text}${extra}${hint}</li>`;
              })
              .join('')}</ul>
          </div>`,
        )
        .join('')}`;
      this.el.querySelectorAll<HTMLElement>('.timer').forEach((t) => this.timers.set(t.dataset.q!, t));
    }
    // live escape readout: how far from the nearest tourist, and how long you have kept it up
    this.el.querySelectorAll<HTMLElement>('.esc').forEach((el) => {
      const q = quests.find((x) => x.id === el.dataset.q);
      const o = q?.objectives.find((x) => x.id === 'escape');
      if (!o) return;
      const need = tuning.quest.escapeDistance.value;
      el.textContent = carryingStolen
        ? `(${Math.min(Math.round(nearestNpc), 99)} / ${Math.round(need)} m, ${o.progress.toFixed(1)} / ${tuning.quest.escapeTime.value.toFixed(0)} s)`
        : '(carry it!)';
      el.classList.toggle('good', carryingStolen && nearestNpc >= need);
    });
    for (const q of quests) {
      const t = this.timers.get(q.id);
      if (!t) continue;
      if (q.status === 'idle') t.textContent = '(starts when spotted)';
      else {
        const s = Math.ceil(q.timeLeft);
        t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        t.classList.toggle('low', q.status === 'active' && q.timeLeft < 15);
      }
    }
  }
}

import type { QuestState } from '../gameplay/quest';
import { QUESTS } from '../data/quests';
import { tuning } from '../core/tuning';

/**
 * Paper-note to-do list. Compact: active quests show their objectives (with a tip under the first open one),
 * quests not started yet show a one-line teaser, finished ones are struck through, the finale shows a lock.
 * The DOM is only rebuilt when something changes.
 */
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
    const sig = quests.map((q) => `${q.id}:${q.status}:${q.objectives.map((o) => `${o.done ? 1 : 0}${o.count}`).join('')}`).join('|');
    if (sig !== this.last) {
      this.last = sig;
      this.timers.clear();
      this.el.innerHTML = `<h3>To do</h3>${quests.map((q) => this.quest(q)).join('')}`;
      this.el.querySelectorAll<HTMLElement>('.timer').forEach((t) => this.timers.set(t.dataset.q!, t));
    }
    for (const q of quests) {
      const t = this.timers.get(q.id);
      if (!t) continue;
      const s = Math.ceil(q.timeLeft);
      t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      t.classList.toggle('low', q.status === 'active' && q.timeLeft < 15);
    }
    // live escape readout: how far from the nearest tourist, and how long you have kept it up
    this.el.querySelectorAll<HTMLElement>('.esc').forEach((el) => {
      const o = quests.find((x) => x.id === el.dataset.q)?.objectives.find((x) => x.id === 'escape');
      if (!o) return;
      const need = tuning.quest.escapeDistance.value;
      el.textContent = carryingStolen
        ? `(${Math.min(Math.round(nearestNpc), 99)} / ${Math.round(need)} m, ${o.progress.toFixed(1)} / ${tuning.quest.escapeTime.value.toFixed(0)} s)`
        : '(carry it!)';
      el.classList.toggle('good', carryingStolen && nearestNpc >= need);
    });
  }

  private quest(q: QuestState): string {
    const def = QUESTS.find((d) => d.id === q.id);
    const timer = q.timed && q.status === 'active' ? ` <span class="timer" data-q="${q.id}"></span>` : '';
    if (q.status === 'locked' && def?.hidden) return '';
    if (q.status === 'locked') return `<div class="q locked"><div class="qt">&#128274; ${q.title}</div><div class="teaser">Finish the other quests first.</div></div>`;
    if (q.status === 'won') return `<div class="q won"><div class="qt"><s>${q.title}</s> <b class="ok">done!</b></div></div>`;
    if (q.status === 'lost') return `<div class="q lost"><div class="qt">${q.title} <b class="bad">failed, resetting...</b></div></div>`;
    if (q.status === 'idle') return `<div class="q idle"><div class="qt">${q.title}</div><div class="teaser">${def?.teaser ?? ''}</div></div>`;
    const items = q.objectives
      .map((o, i) => {
        const od = def?.objectives[i];
        const firstOpen = !o.done && q.objectives.slice(0, i).every((x) => x.done);
        const blocked = !!od?.after && !q.objectives.find((x) => x.id === od.after)?.done;
        if (blocked && !firstOpen && !o.done) return `<li class="later"><span>&#9744;</span> ${o.text}</li>`;
        const extra = firstOpen && od?.kind === 'escape' ? ` <span class="esc" data-q="${q.id}"></span>` : '';
        const hint = firstOpen && od?.hint ? `<div class="hint">${od.hint}</div>` : '';
        return `<li class="${o.done ? 'done' : ''}"><span>${o.done ? '&#9745;' : '&#9744;'}</span> ${o.text}${(od?.count ?? 1) > 1 ? ` <b class="cnt">(${Math.min(o.count, od!.count!)}/${od!.count})</b>` : ''}${extra}${hint}</li>`;
      })
      .join('');
    return `<div class="q active"><div class="qt">${q.title}${timer}</div><ul>${items}</ul></div>`;
  }
}

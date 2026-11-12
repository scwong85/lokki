import type { QuestState } from '../gameplay/quest';

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

  update(quests: readonly QuestState[]): void {
    const sig = quests.map((q) => `${q.id}:${q.status}:${q.objectives.map((o) => (o.done ? 1 : 0)).join('')}`).join('|');
    if (sig !== this.last) {
      this.last = sig;
      this.timers.clear();
      this.el.innerHTML = `<h3>To do</h3>${quests
        .map(
          (q) => `<div class="q ${q.status}">
            <div class="qt">${q.title}${q.timed ? ' <span class="timer" data-q="' + q.id + '"></span>' : ''}
              ${q.status === 'won' ? '<b class="ok">done!</b>' : q.status === 'lost' ? '<b class="bad">failed - press R</b>' : ''}</div>
            <ul>${q.objectives.map((o) => `<li class="${o.done ? 'done' : ''}"><span>${o.done ? '☑' : '☐'}</span> ${o.text}</li>`).join('')}</ul>
          </div>`,
        )
        .join('')}`;
      this.el.querySelectorAll<HTMLElement>('.timer').forEach((t) => this.timers.set(t.dataset.q!, t));
    }
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

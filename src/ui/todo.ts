import type { QuestState } from '../gameplay/quest';
import { QUESTS, type QuestDef } from '../data/quests';
import { tuning } from '../core/tuning';
import { HintLadder, stepKey } from '../gameplay/hintLadder';

/**
 * Paper-note to-do list. Compact: active quests show their objectives (with a tip under the first open one),
 * quests not started yet show a one-line teaser, finished ones are struck through, the finale shows a lock.
 * The DOM is only rebuilt when something changes.
 */
export class Todo {
  private el: HTMLElement;
  private timers = new Map<string, HTMLElement>();
  private last = '';

  /** The level's quest definitions and its secret to-dos (shown as "???" until done). */
  defs: readonly QuestDef[] = QUESTS;
  secret: ReadonlySet<string> = new Set();
  /** Hidden to-dos the gull is near now: they show half their title. */
  revealNear: ReadonlySet<string> = new Set();
  /** The hint ladder: steps with a `nudge` show only their outcome until it climbs. */
  ladder = new HintLadder();
  /** The player taps the ? on the note (or presses J): the next rung. */
  onAsk: () => void = () => {};

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'todo';
    root.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest?.('.askhint')) this.onAsk();
    });
  }

  update(quests: readonly QuestState[], nearestNpc = Infinity, carryingStolen = false): void {
    const sig = quests.map((q) => `${q.id}:${q.status}:${q.objectives.map((o) => `${o.done ? 1 : 0}${o.count}${this.ladder.rung(stepKey(q.id, o.id))}`).join('')}${this.revealNear.has(q.id) ? 'r' : ''}`).join('|') + this.ladder.mode;
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
    // the escape step: a bar that fills while you carry the loot far enough from everyone, with the numbers beside it
    this.el.querySelectorAll<HTMLElement>('.esc').forEach((el) => {
      const o = quests.find((x) => x.id === el.dataset.q)?.objectives.find((x) => x.id === 'escape');
      if (!o) return;
      if (!el.firstElementChild) el.innerHTML = '<span class="escbar"><i></i></span><span class="esct"></span>';
      const need = tuning.quest.escapeDistance.value;
      const total = tuning.quest.escapeTime.value;
      const far = carryingStolen && nearestNpc >= need;
      (el.querySelector('i') as HTMLElement).style.width = `${Math.round(Math.min(1, o.progress / total) * 100)}%`;
      (el.querySelector('.esct') as HTMLElement).textContent = !carryingStolen ? 'carry it!' : far ? `getting away… ${o.progress.toFixed(1)} / ${total.toFixed(0)} s` : `${Math.min(Math.round(nearestNpc), 99)} / ${Math.round(need)} m from everyone: keep going`;
      el.classList.toggle('good', far);
    });
  }

  private quest(q: QuestState): string {
    const def = this.defs.find((d) => d.id === q.id);
    if (this.secret.has(q.id) && q.status !== 'won') {
      const half = this.revealNear.has(q.id) && def?.reveal ? `??? …${def.reveal.text}` : '???';
      return `<div class="q secret"><div class="qt">${half}</div><div class="teaser">Something to discover…</div></div>`;
    }
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
        if (blocked && !firstOpen && !o.done) return `<li class="later"><span>&#9744;</span> ${def?.chain ? '<i>?</i>' : o.text}</li>`;
        const extra = firstOpen && od?.kind === 'escape' ? ` <span class="esc" data-q="${q.id}"></span>` : '';
        // a step on the hint ladder: the wish first, then a cryptic line, then (the marker on the map), then the full hint
        const rung = od?.nudge ? this.ladder.rung(stepKey(q.id, o.id)) : 3;
        const label = od?.nudge && rung < 3 ? od.outcome ?? o.text : o.text;
        const lines = od?.nudge ? [rung >= 1 ? od.nudge : '', rung >= 3 ? od.hint ?? '' : ''].filter(Boolean) : [od?.hint ?? ''].filter(Boolean);
        const ask = firstOpen && od?.nudge && rung < 3 ? ` <button type="button" class="askhint" title="Give me a hint (J)">?</button>` : '';
        const hint = firstOpen ? lines.map((l) => `<div class="hint">${l}</div>`).join('') : '';
        return `<li class="${o.done ? 'done' : ''}"><span>${o.done ? '&#9745;' : '&#9744;'}</span> ${label}${ask}${(od?.count ?? 1) > 1 ? ` <b class="cnt">(${Math.min(o.count, od!.count!)}/${od!.count})</b>` : ''}${extra}${hint}</li>`;
      })
      .join('');
    // the always-on side lists (little extras, bonus) are marked so the minimal HUD can leave them out
    const side = q.id === 'extras' || q.id === 'bonus' ? ' side' : '';
    return `<div class="q active${side}"><div class="qt">${q.title}${timer}</div><ul>${items}</ul></div>`;
  }
}

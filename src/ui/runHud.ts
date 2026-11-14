import { formatClock, type RunTimer } from '../gameplay/runTimer';

/** Speedrun clock, shown only in speedrun mode. */
export class RunHud {
  private el: HTMLElement;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'runhud';
    this.el.hidden = true;
    root.appendChild(this.el);
  }

  update(t: RunTimer, best: number | null): void {
    this.el.hidden = t.mode !== 'speedrun';
    if (this.el.hidden) return;
    const state = t.finished ? 'done' : t.running ? '' : 'move to start';
    this.el.textContent = `SPEEDRUN ${formatClock(t.time)}${state ? ` · ${state}` : ''}${best ? ` · best ${formatClock(best)}` : ''}`;
  }
}

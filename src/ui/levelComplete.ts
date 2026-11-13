import { formatTime, type StatSummary } from '../gameplay/levelStats';

/** Level-complete overlay: what you did and which quests you finished. */
export class LevelComplete {
  private el: HTMLElement;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'levelcomplete';
    this.el.hidden = true;
    root.appendChild(this.el);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  show(s: StatSummary, quests: { title: string; won: boolean }[]): void {
    const row = (label: string, value: string | number) => `<tr><td>${label}</td><td>${value}</td></tr>`;
    this.el.innerHTML = `
      <div class="lc-card">
        <h2>Kauppatori is in chaos!</h2>
        <p class="lc-sub">Level complete</p>
        <ul class="lc-quests">${quests.map((q) => `<li class="${q.won ? 'won' : ''}">${q.won ? '☑' : '☐'} ${q.title}</li>`).join('')}</ul>
        <table>
          ${row('Time', formatTime(s.seconds))}
          ${row('Things snatched', s.snatches)}
          ${row('Poop on people', s.poopsOnPeople)}
          ${row('Poop on the Warden', s.poopsOnWarden)}
          ${row('Things smashed', s.broken)}
          ${row('Things tipped over', s.tipped)}
          ${row('Times caught by the city', s.hits)}
          ${row('Clean dodges', s.dodges)}
          ${row('Highest heat', Math.round(s.peakHeat))}
        </table>
        <p class="lc-keys"><b>Enter</b>: keep playing &nbsp;·&nbsp; <b>R</b>: play again</p>
      </div>`;
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}

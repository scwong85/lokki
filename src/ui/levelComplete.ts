import { pickShowcase, type Polaroid } from './polaroids';
import { formatTime, type StatSummary } from '../gameplay/levelStats';

/** What the card offers after a level: where to go next. */
export interface LevelNext {
  heading: string;
  /** The next level (open now that this one is cleared), if there is one. */
  next?: { id: string; name: string };
  /** Called with a level id or 'menu' (back to the level list). */
  go: (target: string) => void;
}

/** Level-complete overlay: what you did and which quests you finished. */
export class LevelComplete {
  private el: HTMLElement;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'levelcomplete';
    this.el.hidden = true;
    this.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-go]');
      if (b) this.nav?.go(b.dataset.go!);
    });
    root.appendChild(this.el);
  }

  private nav: LevelNext | undefined;
  private photos: Polaroid[] = [];

  /** The album for this level; the card shows a few of them. Call before show(). */
  setPhotos(list: Polaroid[]): void {
    this.photos = list;
  }

  /** Enter on the card: the next level when there is one (returns true if it navigated). */
  goNext(): boolean {
    if (!this.visible || !this.nav?.next) return false;
    this.nav.go(this.nav.next.id);
    return true;
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  show(s: StatSummary, quests: { title: string; won: boolean }[], notes: string[] = [], nav?: LevelNext): void {
    this.nav = nav;
    const row = (label: string, value: string | number) => `<tr><td>${label}</td><td>${value}</td></tr>`;
    this.el.innerHTML = `
      <div class="lc-card">
        <div class="lc-stamp">CLEARED</div>
        <h2>${nav?.heading ?? 'Kauppatori is in chaos!'}</h2>
        <p class="lc-sub">Level complete</p>
        ${this.photos.length ? `<div class="lc-photos">${pickShowcase(this.photos).map((ph, i) => `<a class="lc-photo" style="--r:${[-4, 3, -2][i % 3]}deg;animation-delay:${0.25 + i * 0.18}s" href="${ph.url}" download="lokki-${i + 1}.jpg" title="Save this photo"><img src="${ph.url}" alt="${ph.caption}"></a>`).join('')}</div>` : ''}
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
        ${notes.map((n) => `<p class="lc-note">${n}</p>`).join('')}
        ${nav ? `<div class="lc-next">${nav.next ? `<button class="big" data-go="${nav.next.id}">Next: ${nav.next.name} &rarr;</button>` : '<p class="lc-note">More levels are on the way!</p>'}<button data-go="menu">Level list</button></div>` : ''}
        <p class="lc-keys">${nav?.next ? '<b>Enter</b>: next level &nbsp;·&nbsp; ' : ''}<b>Enter</b>: keep playing &nbsp;·&nbsp; <b>R</b>: play again · <b>X</b>: extra objectives · <b>Z</b>: speedrun</p>
        <p class="lc-tap">Tap to keep playing · ☰ for restart, extra objectives and speedrun</p>
      </div>`;
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}

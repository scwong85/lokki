import type { TitleLevel } from './menus';

/**
 * In-game level select (L, or Options > Levels, or the phone menu): every level with its stars and best time. Unlocked
 * levels can be played again from the start; locked ones say what to clear first. Pauses the game while open.
 */
export class LevelSelect {
  private el: HTMLElement;

  constructor(root: HTMLElement, private onPick: (id: string) => void) {
    this.el = document.createElement('div');
    this.el.id = 'levelselect';
    this.el.hidden = true;
    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-close]') || t === this.el) {
        this.hide();
        return;
      }
      const b = t.closest<HTMLElement>('[data-pick]');
      if (b && !b.classList.contains('locked')) {
        this.hide();
        this.onPick(b.dataset.pick!);
      }
    });
    root.appendChild(this.el);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  show(levels: (TitleLevel & { best?: string })[]): void {
    const NAMES: Record<string, string> = { kauppatori: 'Kauppatori · the Market Square', senaatintori: 'Senate Square', esplanadi: 'Esplanadi' };
    let lastGroup = '';
    const rows = levels
      .map((l) => {
        const group = l.sandbox ? 'Free play' : l.series ?? NAMES[l.district ?? 'kauppatori'] ?? '';
        const head = group !== lastGroup ? `<h3 class="ls-district">${group}${this.progress(levels, l)}</h3>` : '';
        lastGroup = group;
        const status = l.locked ? l.unlockHint ?? 'Locked' : l.sandbox ? 'free play' : '★'.repeat(l.stars) + '☆'.repeat(3 - l.stars);
        const best = !l.locked && l.best ? `<span class="ls-best">best ${l.best}</span>` : '';
        const tag = l.current && !l.locked ? '<span class="ls-now">playing</span>' : '';
        return `${head}<button data-pick="${l.id}" class="${l.locked ? 'locked' : ''}${l.current ? ' on' : ''}"><span class="ls-name">${l.locked ? '\u{1F512} ' : ''}${l.name}${tag}</span><span class="ls-blurb">${l.blurb}</span><span class="ls-stars">${status}${best}</span></button>`;
      })
      .join('');
    this.el.innerHTML = `<div class="ls-card"><h2>Levels</h2><p class="ls-hint">Pick an unlocked level to play it again from the start.</p><div class="ls-list">${rows}</div><button class="ls-close" data-close>Close</button><p class="ls-keys"><b>L</b> or <b>Esc</b> closes this</p></div>`;
    this.el.hidden = false;
  }

  /** "3/10 cleared" for the district this level opens. */
  private progress(levels: (TitleLevel & { best?: string })[], first: TitleLevel): string {
    if (first.sandbox) return '';
    const key = (l: TitleLevel) => l.series ?? l.district ?? 'kauppatori';
    const mates = levels.filter((l) => !l.sandbox && key(l) === key(first));
    const done = mates.filter((l) => l.stars > 0).length;
    return ` <span class="ls-count">${done}/${mates.length} cleared</span>`;
  }

  hide(): void {
    this.el.hidden = true;
  }
}

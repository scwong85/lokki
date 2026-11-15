/**
 * Menus with a controller (D-pad or stick to move, A to press, B to go back). Works on whichever panel is open by
 * moving a highlight between its buttons and sliders. The geometry is pure (and tested); the DOM part is thin.
 */
export type MenuAction = 'up' | 'down' | 'left' | 'right' | 'a' | 'b';

export interface Spot {
  x: number;
  y: number;
}

/** The next item to highlight: the nearest one in that direction (a bit of sideways drift is fine). Stays put at an edge. */
export function nextFocus(spots: readonly Spot[], cur: number, dir: 'up' | 'down' | 'left' | 'right'): number {
  if (!spots.length) return -1;
  if (cur < 0 || cur >= spots.length) return 0;
  const c = spots[cur];
  let best = cur;
  let bestScore = Infinity;
  spots.forEach((s, i) => {
    if (i === cur) return;
    const dx = s.x - c.x, dy = s.y - c.y;
    const along = dir === 'down' ? dy : dir === 'up' ? -dy : dir === 'right' ? dx : -dx;
    const across = dir === 'down' || dir === 'up' ? Math.abs(dx) : Math.abs(dy);
    if (along <= 1 || across > along * 2.5 + 40) return; // not really that way
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** Panels in the order they sit on top of each other (the first visible one gets the controller). */
const PANELS = ['lobby', 'controls', 'skills', 'levelselect', 'options', 'credits', 'levelcomplete', 'title'];
const FOCUSABLE = 'button, input, textarea, select, [data-skin], [data-pick]';

export class MenuNav {
  private focus: HTMLElement | null = null;

  /** The open panel, if any. */
  panel(): HTMLElement | null {
    for (const id of PANELS) {
      const el = document.getElementById(id);
      if (el && !el.hidden) return el;
    }
    return null;
  }

  private items(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((e) => !e.hidden && e.offsetParent !== null && !(e as HTMLButtonElement).disabled && !e.classList.contains('locked'));
  }

  handle(a: MenuAction): void {
    const root = this.panel();
    if (!root) return;
    const items = this.items(root);
    if (a === 'b') {
      if (root.id === 'credits' || root.id === 'levelcomplete') root.click(); // tap anywhere closes the credits and the level card (keep playing)
      else root.querySelector<HTMLElement>('[data-act=close], [data-close]')?.click();
      this.setFocus(null);
      return;
    }
    if (!items.length) return;
    let i = this.focus ? items.indexOf(this.focus) : -1;
    if (i < 0) {
      this.setFocus(items[0]);
      // the first press just shows where the highlight is, except on the level card where A means "next level" straight away
      if (!(root.id === 'levelcomplete' && a === 'a')) return;
      i = 0;
    }
    const cur = items[i];
    if (cur instanceof HTMLSelectElement && (a === 'left' || a === 'right' || a === 'a')) {
      // a drop-down list: left / right (or A) step through the choices
      const n = cur.options.length;
      if (n) {
        cur.selectedIndex = (cur.selectedIndex + (a === 'left' ? -1 : 1) + n) % n;
        cur.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    if (a === 'a') {
      if (cur instanceof HTMLTextAreaElement || (cur instanceof HTMLInputElement && cur.type === 'text')) cur.focus();
      else if (!(cur instanceof HTMLInputElement && cur.type === 'range')) cur.click();
      return;
    }
    if (cur instanceof HTMLInputElement && cur.type === 'range' && (a === 'left' || a === 'right')) {
      const step = Number(cur.step) || 1;
      cur.value = String(Math.min(Number(cur.max), Math.max(Number(cur.min), Number(cur.value) + (a === 'right' ? step : -step) * 2)));
      cur.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const spots = items.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    i = nextFocus(spots, i, a);
    this.setFocus(items[i]);
  }

  private setFocus(el: HTMLElement | null): void {
    this.focus?.classList.remove('pad-focus');
    this.focus = el;
    if (el) {
      el.classList.add('pad-focus');
      el.scrollIntoView?.({ block: 'nearest' });
    }
  }

  /** A mouse or key takes over again: drop the highlight. */
  clear(): void {
    this.setFocus(null);
  }
}

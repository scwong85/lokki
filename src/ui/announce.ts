export type AnnounceKind = 'alert' | 'adapt' | 'learned';

interface Item {
  title: string;
  sub: string;
  kind: AnnounceKind;
}

/** Big banner for the city's escalations ("CITY ALERT: nets going up!"). Items queue so each one is readable. */
export class Announce {
  private el: HTMLElement;
  private title: HTMLElement;
  private sub: HTMLElement;
  private queue: Item[] = [];
  private busy = false;

  constructor(root: HTMLElement, private holdMs = 4200) {
    this.el = document.createElement('div');
    this.el.id = 'announce';
    this.el.innerHTML = '<div class="at"></div><div class="as"></div>';
    root.appendChild(this.el);
    this.title = this.el.querySelector('.at')!;
    this.sub = this.el.querySelector('.as')!;
  }

  show(title: string, sub: string, kind: AnnounceKind = 'alert'): void {
    this.queue.push({ title, sub, kind });
    if (!this.busy) this.next();
  }

  private next(): void {
    const it = this.queue.shift();
    if (!it) {
      this.busy = false;
      this.el.classList.remove('on');
      return;
    }
    this.busy = true;
    this.title.textContent = it.title;
    this.sub.textContent = it.sub;
    this.el.className = `${it.kind}`;
    // restart the slide-in animation
    void this.el.offsetWidth;
    this.el.classList.add('on');
    setTimeout(() => this.next(), this.holdMs);
  }

  clear(): void {
    this.queue.length = 0;
    this.busy = false;
    this.el.classList.remove('on');
  }
}

/** A kept photo: a framed jpeg with a joke caption. */
export interface Polaroid {
  url: string;
  caption: string;
  /** Seconds into the level when it was taken. */
  at: number;
}

/** Keep the newest `max` photos. */
export function limitAlbum(list: Polaroid[], max: number): Polaroid[] {
  return list.length <= max ? list : list.slice(list.length - max);
}

/** A caption that fits the frame: trimmed, with an ellipsis if it is too long. */
export function fitCaption(text: string, max = 34): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** The photos for the level card: spread across the run (first, middle, last) rather than the last three. */
export function pickShowcase(list: Polaroid[], n = 3): Polaroid[] {
  if (list.length <= n) return list;
  const out: Polaroid[] = [];
  for (let i = 0; i < n; i++) out.push(list[Math.round((i * (list.length - 1)) / (n - 1))]);
  return out;
}

const W = 300, H = 330, PHOTO = 268;

/**
 * Polaroids: ask for one at a fun moment, and it is taken from the game canvas right after the next frame is drawn
 * (a WebGL canvas can only be read then). Each gets a white frame and a caption, pops up for a moment, and goes in the album.
 */
export class Polaroids {
  album: Polaroid[] = [];
  private pending: string | null = null;
  private cooldown = 0;
  private popup: HTMLImageElement;

  constructor(root: HTMLElement, private readonly max = 12) {
    this.popup = document.createElement('img');
    this.popup.id = 'polaroid-pop';
    this.popup.hidden = true;
    this.popup.alt = '';
    this.popup.addEventListener('animationend', () => (this.popup.hidden = true));
    root.appendChild(this.popup);
  }

  /** Ask for a photo of this moment (ignored if one was taken a second ago). */
  request(caption: string): void {
    if (this.cooldown > 0) return;
    this.pending = fitCaption(caption);
  }

  tick(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  /** Call straight after the frame is rendered. Takes the photo if one was asked for. */
  capture(source: HTMLCanvasElement, time: number): void {
    if (this.pending === null) return;
    const caption = this.pending;
    this.pending = null;
    this.cooldown = 1;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (!g || !source.width || !source.height) return;
    g.fillStyle = '#fffdf6';
    g.fillRect(0, 0, W, H);
    // cover-crop the middle of the screen into a square-ish picture
    const m = 16;
    const ar = PHOTO / (PHOTO * 0.84);
    let sw = source.width, sh = source.width / ar;
    if (sh > source.height) { sh = source.height; sw = sh * ar; }
    g.drawImage(source, (source.width - sw) / 2, (source.height - sh) / 2, sw, sh, m, m, PHOTO, PHOTO * 0.84);
    g.strokeStyle = 'rgba(0,0,0,.12)';
    g.strokeRect(m + 0.5, m + 0.5, PHOTO - 1, PHOTO * 0.84 - 1);
    g.fillStyle = '#4a4033';
    g.font = '20px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    g.textAlign = 'center';
    g.fillText(caption, W / 2, H - 30);
    g.font = '11px system-ui, sans-serif';
    g.fillStyle = '#b3a584';
    g.fillText('Lokki', W / 2, H - 12);
    const url = c.toDataURL('image/jpeg', 0.82);
    this.album = limitAlbum([...this.album, { url, caption, at: time }], this.max);
    this.popup.src = url;
    this.popup.hidden = false;
    this.popup.style.animation = 'none';
    void this.popup.offsetWidth; // restart the CSS animation
    this.popup.style.animation = '';
  }

  clear(): void {
    this.album = [];
    this.pending = null;
    this.popup.hidden = true;
  }
}

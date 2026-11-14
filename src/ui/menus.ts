import { OPTION_SLIDERS, type Options } from '../core/options';

/** Options panel (O, or from the title screen): sliders write straight into the options object. */
export class OptionsPanel {
  private el: HTMLElement;

  constructor(root: HTMLElement, private options: Options, private onChange: (o: Options) => void) {
    this.el = document.createElement('div');
    this.el.id = 'options';
    this.el.className = 'menu-card';
    this.el.hidden = true;
    const rows = OPTION_SLIDERS.map((s) => `<label>${s.label}<input type="range" data-k="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${options[s.key]}"></label>`).join('');
    this.el.innerHTML = `<h3>Options</h3>${rows}<label class="chk"><input type="checkbox" data-k="tutorial"> Show the flying tips again</label><p class="menu-keys"><b>M</b> mutes everything · <b>O</b> closes this</p><button data-act="close">Close</button>`;
    this.el.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((inp) => {
      inp.addEventListener('input', () => {
        (this.options as unknown as Record<string, number>)[inp.dataset.k!] = Number(inp.value);
        this.onChange(this.options);
      });
    });
    const tut = this.el.querySelector<HTMLInputElement>('input[data-k=tutorial]')!;
    tut.addEventListener('change', () => {
      this.options.tutorialDone = !tut.checked;
      this.onChange(this.options);
    });
    this.el.addEventListener('keydown', (e) => {
      if (e.code === 'KeyO' || e.code === 'Escape') this.hide(); // keys typed while a slider has focus never reach the game
    });
    this.el.querySelector('[data-act=close]')!.addEventListener('click', () => this.hide());
    root.appendChild(this.el);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  show(): void {
    this.el.querySelector<HTMLInputElement>('input[data-k=tutorial]')!.checked = !this.options.tutorialDone;
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}

/** Title screen: shown once the city has loaded; the game waits behind it. */
export class TitleScreen {
  private el: HTMLElement;

  constructor(root: HTMLElement, hooks: { onPlay: () => void; onOptions: () => void; onCredits: () => void }, info: { best: string; skills: number; total: number }) {
    this.el = document.createElement('div');
    this.el.id = 'title';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="title-card">
        <div class="title-gull">&#128038;</div>
        <h1>Lokki</h1>
        <p class="tag">A seagull. Helsinki's Market Square. Zero regrets.</p>
        <button class="big" data-act="play">Play</button>
        <div class="title-row"><button data-act="options">Options</button><button data-act="credits">Credits</button></div>
        <p class="title-keys"><b>WASD</b> move · <b>Space</b> hop / flap · <b>Shift</b> dive · <b>E</b> grab · <b>F</b> poop · <b>Mouse</b> look (click to capture)</p>
        ${info.best ? `<p class="title-best">Best clear ${info.best} · skills ${info.skills}/${info.total}</p>` : info.skills ? `<p class="title-best">Skills ${info.skills}/${info.total}</p>` : ''}
        <p class="title-note">Music: public-domain recordings · everything runs offline in your browser</p>
      </div>`;
    const on = (act: string, fn: () => void) => this.el.querySelector(`[data-act=${act}]`)!.addEventListener('click', fn);
    on('play', () => hooks.onPlay());
    on('options', () => hooks.onOptions());
    on('credits', () => hooks.onCredits());
    root.appendChild(this.el);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  show(): void {
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}

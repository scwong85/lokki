import { OPTION_SLIDERS, type Options } from '../core/options';
import { HUD_NAMES, nextHudMode } from './hudMode';

/** Options panel (O, or from the title screen): sliders write straight into the options object. */
export class OptionsPanel {
  private el: HTMLElement;

  constructor(root: HTMLElement, private options: Options, private onChange: (o: Options) => void, private onLevels: () => void = () => undefined, private onCoop: () => void = () => undefined, private onSkills: () => void = () => undefined, private onControls: () => void = () => undefined, private onArrange: () => void = () => undefined) {
    this.el = document.createElement('div');
    this.el.id = 'options';
    this.el.className = 'menu-card';
    this.el.hidden = true;
    const rows = OPTION_SLIDERS.map((s) => `<label${s.touchOnly ? ' class="touch-only"' : ''}>${s.label}<input type="range" data-k="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${options[s.key]}"></label>`).join('');
    this.el.innerHTML = `<h3>Options</h3>${rows}<label class="chk">HUD <button type="button" data-act="hud" class="hudbtn"></button></label><label class="chk touch-only"><input type="checkbox" data-k="lefty"> Left-handed buttons</label><button type="button" class="touch-only" data-act="arrange">Arrange the touch buttons…</button><label class="chk"><input type="checkbox" data-k="graphics"> High quality graphics (shadows)</label><label class="chk"><input type="checkbox" data-k="tutorial"> Show the flying tips again</label><button type="button" data-act="levels">Choose a level… (L)</button><button type="button" data-act="skills">Skills &amp; gull looks (K)</button><button type="button" data-act="controls">Controls…</button><button type="button" data-act="coop">Play with a friend online… (N)</button><p class="menu-keys"><b>M</b> mutes everything · <b>U</b> cycles the HUD · <b>O</b> closes this</p><button data-act="close">Close</button>`;
    this.el.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((inp) => {
      inp.addEventListener('input', () => {
        (this.options as unknown as Record<string, number>)[inp.dataset.k!] = Number(inp.value);
        this.onChange(this.options);
      });
    });
    const hudBtn = this.el.querySelector<HTMLButtonElement>('[data-act=hud]')!;
    hudBtn.addEventListener('click', () => {
      this.options.hud = nextHudMode(this.options.hud);
      hudBtn.textContent = HUD_NAMES[this.options.hud];
      this.onChange(this.options);
    });
    const gfx = this.el.querySelector<HTMLInputElement>('input[data-k=graphics]')!;
    gfx.addEventListener('change', () => {
      this.options.graphics = gfx.checked ? 'high' : 'low';
      this.onChange(this.options);
    });
    const lefty = this.el.querySelector<HTMLInputElement>('input[data-k=lefty]')!;
    lefty.addEventListener('change', () => {
      this.options.touchHand = lefty.checked ? 'left' : 'right';
      this.onChange(this.options);
    });
    this.el.querySelector('[data-act=arrange]')!.addEventListener('click', () => {
      this.hide();
      this.onArrange();
    });
    const tut = this.el.querySelector<HTMLInputElement>('input[data-k=tutorial]')!;
    tut.addEventListener('change', () => {
      this.options.tutorialDone = !tut.checked;
      this.onChange(this.options);
    });
    this.el.addEventListener('keydown', (e) => {
      if (e.code === 'KeyO' || e.code === 'Escape') {
        this.hide(); // keys typed while a slider has focus never reach the game
        e.stopPropagation(); // and Esc must not also re-open the options
      }
    });
    this.el.querySelector('[data-act=close]')!.addEventListener('click', () => this.hide());
    this.el.querySelector('[data-act=levels]')!.addEventListener('click', () => {
      this.hide();
      this.onLevels();
    });
    for (const [act, fn] of [['skills', () => this.onSkills()], ['controls', () => this.onControls()]] as [string, () => void][]) {
      this.el.querySelector(`[data-act=${act}]`)!.addEventListener('click', () => {
        this.hide();
        fn();
      });
    }
    this.el.querySelector('[data-act=coop]')!.addEventListener('click', () => {
      this.hide();
      this.onCoop();
    });
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
    this.el.querySelector<HTMLInputElement>('input[data-k=lefty]')!.checked = this.options.touchHand === 'left';
    this.el.querySelector<HTMLInputElement>('input[data-k=graphics]')!.checked = this.options.graphics === 'high';
    this.el.querySelector<HTMLButtonElement>('[data-act=hud]')!.textContent = HUD_NAMES[this.options.hud];
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}

/** One row of the level select on the title screen. */
export interface TitleLevel {
  id: string;
  name: string;
  blurb: string;
  stars: number;
  current: boolean;
  sandbox?: boolean;
  locked?: boolean;
  unlockHint?: string;
  /** Best clear time (formatted). */
  best?: string;
}

/** Title screen: shown once the city has loaded; the game waits behind it. */
export class TitleScreen {
  private el: HTMLElement;

  constructor(
    root: HTMLElement,
    hooks: { onPlay: () => void; onOptions: () => void; onCredits: () => void; onPickLevel?: (id: string) => void; onCoop?: () => void },
    info: { best: string; skills: number; total: number; levels?: TitleLevel[] },
  ) {
    this.el = document.createElement('div');
    this.el.id = 'title';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="title-card">
        <div class="title-gull">&#128038;</div>
        <h1>Lokki</h1>
        <p class="tag">A seagull. Helsinki's Market Square. Zero regrets.</p>
        <button class="big" data-act="play">Play${info.levels?.find((l) => l.current) ? `: ${info.levels.find((l) => l.current)!.name}` : ''}</button>
        ${info.levels ? `<div class="title-levels">${info.levels.map((l) => `<button data-level="${l.id}" class="${l.current ? 'on' : ''}${l.locked ? ' locked' : ''}" title="${l.locked ? l.unlockHint ?? 'Locked' : l.blurb}"><span class="lv-name">${l.locked ? '🔒 ' : ''}${l.name}</span><span class="lv-stars">${l.locked ? l.unlockHint ?? '' : l.sandbox ? 'free play' : '★'.repeat(l.stars) + '☆'.repeat(3 - l.stars)}</span></button>`).join('')}</div>` : ''}
        <div class="title-row"><button data-act="options">Options</button><button data-act="coop">Play with a friend</button><button data-act="credits">Credits</button></div>
        <p class="title-keys"><b>WASD</b> move · <b>Space</b> hop / flap · <b>Shift</b> dive · <b>E</b> grab · <b>F</b> poop · <b>Mouse</b> look (click to capture)</p>
        ${info.best ? `<p class="title-best">Best clear ${info.best} · skills ${info.skills}/${info.total}</p>` : info.skills ? `<p class="title-best">Skills ${info.skills}/${info.total}</p>` : ''}
        <p class="title-note">Music: public-domain recordings · everything runs offline in your browser</p>
      </div>`;
    const on = (act: string, fn: () => void) => this.el.querySelector(`[data-act=${act}]`)!.addEventListener('click', fn);
    on('play', () => hooks.onPlay());
    on('options', () => hooks.onOptions());
    on('credits', () => hooks.onCredits());
    on('coop', () => hooks.onCoop?.());
    this.el.querySelectorAll<HTMLElement>('[data-level]').forEach((b) =>
      b.addEventListener('click', () => {
        const lv = info.levels?.find((l) => l.id === b.dataset.level);
        if (lv?.locked) return;
        if (lv?.current) hooks.onPlay();
        else hooks.onPickLevel?.(b.dataset.level!);
      }),
    );
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

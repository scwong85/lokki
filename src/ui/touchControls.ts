import type { Input } from '../core/input';
import { knobOffset, stickAxes } from '../core/touchMath';
import { tuning } from '../core/tuning';
import { BUTTON_IDS, clampSpot, layoutFor, loadLayouts, saveLayouts, type ButtonId, type Hand, type SavedLayouts } from '../core/touchLayout';

/** Grab-button label from the interaction prompt ("E grab bun" -> "Grab bun", "E drop · Q toss bun" -> "Drop"). Pure. */
export function grabLabel(prompt: string): { text: string; enabled: boolean } {
  if (prompt.startsWith('E drop')) return { text: 'Drop', enabled: true };
  const m = prompt.match(/^E grab (.+)$/);
  if (m) return { text: `Grab ${m[1]}`, enabled: true };
  return { text: 'Grab', enabled: false };
}

type Btn = { code: string; mode: 'hold' | 'tap'; el: HTMLElement };

const MENU: [string, string][] = [
  ['KeyL', 'Levels'],
  ['KeyK', 'Skills & gull looks'],
  ['KeyO', 'Options'],
  ['KeyM', 'Sound on / off'],
  ['KeyR', 'Restart level'],
  ['KeyX', 'Extra objectives'],
  ['KeyZ', 'Speedrun'],
  ['KeyC', 'Credits'],
  ['KeyT', 'Skip tips'],
];

/**
 * On-screen controls for phones and tablets (landscape). Left thumb: a floating stick that appears where you touch.
 * Right thumb: drag to look, FLAP (hold), DIVE (hold, slide up/down to aim), POOP, a context GRAB/DROP button,
 * TOSS while carrying, the ability buttons and a ☰ menu. Everything is fed into `Input` as key codes, so the game
 * itself does not know it is being played by touch.
 */
export class TouchControls {
  readonly el: HTMLElement;
  private stickBase: HTMLElement;
  private stickKnob: HTMLElement;
  private menu: HTMLElement;
  private grab: HTMLElement;
  private toss: HTMLElement;
  private abilities = new Map<string, HTMLElement>();
  private hand: Hand = 'right';
  private saved: SavedLayouts = loadLayouts();
  private arranging = false;
  private arrangeBar: HTMLElement;
  /** The button being dragged while arranging. */
  private drag: { id: ButtonId; pointer: number } | null = null;
  private buttons: Btn[] = [];
  /** What each active pointer is doing. */
  private pointers = new Map<number, { kind: 'stick' | 'look' | 'button'; x0: number; y0: number; x: number; y: number; btn?: Btn }>();

  constructor(root: HTMLElement, private input: Input) {
    const el = document.createElement('div');
    el.id = 'touch';
    el.innerHTML = `
      <div class="t-stick"><div class="t-knob"></div></div>
      <button class="t-btn t-menu" data-code="menu" aria-label="Menu">☰</button>
      <button class="t-btn t-hud" data-code="KeyU" data-mode="tap" aria-label="Show or hide the HUD">HUD</button>
      <button class="t-btn t-hawk" data-code="KeyH" data-mode="tap" aria-label="Hawk-eye">👁</button>
      <button class="t-btn t-lock" data-code="Tab" data-mode="tap" aria-label="Lock onto a target">⌖</button>
      <div class="t-abil">
        <button class="t-btn t-ab" data-code="KeyV" data-mode="tap" hidden>Caw</button>
        <button class="t-btn t-ab" data-code="KeyG" data-mode="tap" hidden>Flock</button>
        <button class="t-btn t-ab" data-code="KeyB" data-mode="tap" hidden>Pigeon</button>
      </div>
      <button class="t-btn t-grab" data-code="KeyE" data-mode="tap">Grab</button>
      <button class="t-btn t-toss" data-code="KeyQ" data-mode="tap" hidden>Toss</button>
      <button class="t-btn t-poop" data-code="KeyF" data-mode="tap">Poop</button>
      <button class="t-btn t-dive" data-code="ShiftLeft" data-mode="hold">Dive<small>slide to aim</small></button>
      <button class="t-btn t-flap" data-code="Space" data-mode="hold">Flap</button>
      <div class="t-menupanel" hidden>${MENU.map(([c, t]) => `<button data-menu="${c}">${t}</button>`).join('')}<button data-menu="close" class="t-resume">Resume</button></div>`;
    root.appendChild(el);
    this.el = el;
    // the menu sits above the to-do note and the other panels, so it lives outside the control layer
    const panel = el.querySelector<HTMLElement>('.t-menupanel')!;
    root.appendChild(panel);
    const bar = document.createElement('div');
    bar.className = 't-arrange';
    bar.hidden = true;
    bar.innerHTML = '<span>Drag the buttons where your thumbs like them</span><button data-arr="reset">Reset</button><button data-arr="done" class="t-resume">Done</button>';
    root.appendChild(bar);
    this.arrangeBar = bar;
    bar.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).dataset.arr;
      if (a === 'reset') {
        delete this.saved[this.hand];
        saveLayouts(this.saved);
        this.applyLayout();
      } else if (a === 'done') this.arrange(false);
    });
    this.stickBase = el.querySelector('.t-stick')!;
    this.stickKnob = el.querySelector('.t-knob')!;
    this.menu = panel;
    this.grab = el.querySelector('.t-grab')!;
    this.toss = el.querySelector('.t-toss')!;
    for (const b of el.querySelectorAll<HTMLElement>('[data-mode]')) this.buttons.push({ code: b.dataset.code!, mode: b.dataset.mode as Btn['mode'], el: b });
    for (const b of el.querySelectorAll<HTMLElement>('.t-ab')) this.abilities.set(b.dataset.code!, b);

    this.applyLayout();
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) el.addEventListener(t, (e) => this.up(e));
    el.querySelector('.t-menu')!.addEventListener('click', () => (this.menu.hidden = !this.menu.hidden));
    this.menu.addEventListener('click', (e) => {
      const code = (e.target as HTMLElement).closest<HTMLElement>('[data-menu]')?.dataset.menu;
      if (!code) return;
      this.menu.hidden = true;
      if (code !== 'close') input.tap(code);
    });
  }

  /** The ☰ menu (and arranging the buttons) pauses the game like the other panels. */
  get menuOpen(): boolean {
    return !this.menu.hidden || this.arranging;
  }

  private btnEl(id: ButtonId): HTMLElement {
    return this.el.querySelector<HTMLElement>(`[data-code=${id}]`)!;
  }

  /** Put the five action buttons where the layout says. */
  applyLayout(): void {
    const l = layoutFor(this.hand, this.saved);
    for (const id of BUTTON_IDS) {
      const s = l[id];
      const b = this.btnEl(id);
      Object.assign(b.style, { left: `${s.x * 100}%`, top: `${s.y * 100}%`, right: 'auto', bottom: 'auto', translate: '-50% -50%' });
    }
  }

  /** Right- or left-handed: the buttons move to the other side and the stick appears on the other half. */
  setHand(h: Hand): void {
    this.hand = h;
    document.body.classList.toggle('touch-left', h === 'left');
    this.applyLayout();
  }

  /** Drag-to-arrange mode: the buttons stop playing and follow the thumb. */
  arrange(on: boolean): void {
    this.arranging = on;
    this.arrangeBar.hidden = !on;
    this.el.classList.toggle('arranging', on);
    this.toss.hidden = on ? false : this.toss.hidden;
    if (on) this.release();
    else saveLayouts(this.saved);
  }

  private down(e: PointerEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('.t-menupanel') || target.closest('.t-menu')) return; // plain clicks
    e.preventDefault();
    this.el.setPointerCapture?.(e.pointerId);
    if (this.arranging) {
      const id = target.closest<HTMLElement>('[data-code]')?.dataset.code as ButtonId | undefined;
      if (id && BUTTON_IDS.includes(id)) this.drag = { id, pointer: e.pointerId };
      return;
    }
    const bEl = target.closest<HTMLElement>('[data-mode]');
    const btn = bEl ? this.buttons.find((b) => b.el === bEl) : undefined;
    const p = { kind: 'look' as 'stick' | 'look' | 'button', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, btn };
    if (btn) {
      p.kind = 'button';
      btn.el.classList.add('down');
      if (btn.mode === 'hold') this.input.setVirtual(btn.code, true);
      else this.input.tap(btn.code);
    } else if (this.hand === 'right' ? e.clientX < innerWidth * tuning.touch.stickZone.value : e.clientX > innerWidth * (1 - tuning.touch.stickZone.value)) {
      p.kind = 'stick';
      this.stickBase.style.left = `${e.clientX}px`;
      this.stickBase.style.top = `${e.clientY}px`;
      this.stickBase.classList.add('on');
      this.stickKnob.style.transform = 'translate(-50%, -50%)';
    }
    this.pointers.set(e.pointerId, p);
  }

  private move(e: PointerEvent): void {
    if (this.drag && this.drag.pointer === e.pointerId) {
      e.preventDefault();
      const spot = clampSpot({ x: e.clientX / innerWidth, y: e.clientY / innerHeight });
      (this.saved[this.hand] ??= {})[this.drag.id] = spot;
      this.applyLayout();
      return;
    }
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    const t = tuning.touch;
    if (p.kind === 'stick') {
      const ox = p.x - p.x0, oy = p.y - p.y0;
      const a = stickAxes(ox, oy, t.stickRadius.value, t.deadzone.value);
      this.input.setStick(a.x, a.y);
      const k = knobOffset(ox, oy, t.stickRadius.value);
      this.stickKnob.style.transform = `translate(calc(-50% + ${k.x}px), calc(-50% + ${k.y}px))`;
    } else if (p.kind === 'look') {
      this.input.addLook(dx * t.lookScale.value, dy * t.lookScale.value);
    } else if (p.btn?.code === 'ShiftLeft') {
      this.input.addLook(0, dy * t.diveAim.value); // hold DIVE and slide: steeper / shallower
    }
  }

  private up(e: PointerEvent): void {
    if (this.drag && this.drag.pointer === e.pointerId) this.drag = null;
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.kind === 'stick') {
      this.input.setStick(0, 0);
      this.stickBase.classList.remove('on');
    } else if (p.btn) {
      p.btn.el.classList.remove('down');
      if (p.btn.mode === 'hold') this.input.setVirtual(p.btn.code, false);
    }
  }

  /** Let go of everything (page hidden, panel opened). */
  release(): void {
    for (const id of [...this.pointers.keys()]) this.up({ pointerId: id } as PointerEvent);
    this.input.releaseVirtual();
  }

  /** Per frame: context labels and which buttons exist right now. */
  update(prompt: string, carrying: boolean, owned: { V: boolean; G: boolean; B: boolean }, abilityReady: (code: string) => number): void {
    const g = grabLabel(prompt);
    if (this.grab.textContent !== g.text) this.grab.textContent = g.text;
    this.grab.classList.toggle('dim', !g.enabled);
    this.toss.hidden = !carrying;
    for (const [code, b] of this.abilities) {
      const key = code.slice(3) as 'V' | 'G' | 'B';
      b.hidden = !owned[key];
      if (!b.hidden) b.style.setProperty('--ready', `${Math.round(abilityReady(code) * 100)}%`);
    }
  }
}

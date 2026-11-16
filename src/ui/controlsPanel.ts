import { padHelp } from '../core/gamepad';

const KEYS: [string, string][] = [
  ['WASD', 'Walk and steer'], ['Space', 'Tap: jump. Hold: take off and flap'], ['Shift (hold)', 'Dive'], ['S in the air', 'Flare and brake for landings'], ['Mouse', 'Look (click the game to capture)'],
  ['E', 'Grab or drop'], ['Q', 'Toss'], ['F or click', 'Poop'], ['V / G / B', 'Skills: crow call, flock call, pigeon disguise'], ['H', 'Hawk-eye'], ['T (hold)', 'Taunt: people nearby watch you, not your partner (co-op decoy)'], ['1 2 3 4', 'Emotes: wave, laugh, point, facepalm'], ['Tab', 'Lock onto a target: dives and droppings home in on it (again: next one, then off)'],
  ['K', 'Skills and gull looks'], ['L', 'Level list'], ['N', 'Play with a friend online'], ['R', 'Restart the level'], ['U', 'HUD: full / minimal / off'], ['M', 'Mute'], ['Esc or O', 'Options'],
];
const TOUCH: [string, string][] = [
  ['Left thumb', 'Floating stick: move and steer'], ['Drag right side', 'Look around'], ['FLAP', 'Tap: jump. Hold: take off and flap'], ['LOCK', 'Lock onto a target (tap again: next, then off)'], ['DIVE', 'Hold and slide to aim the dive'], ['POOP', 'Poop'], ['GRAB / DROP', 'Grab or drop (context button)'],
  ['TOSS', 'Toss what you carry'], ['Ability buttons', 'Crow call, flock call, pigeon (once earned)'], ['\u2630 menu', 'Options, levels, skills, restart'],
];

/** The controls screen: keyboard, controller (from the real mapping) and touch. */
export class ControlsPanel {
  private el: HTMLElement;

  constructor(root: HTMLElement) {
    const table = (rows: readonly (readonly [string, string])[]) => `<table>${rows.map(([k, a]) => `<tr><td><b>${k}</b></td><td>${a}</td></tr>`).join('')}</table>`;
    this.el = document.createElement('div');
    this.el.id = 'controls';
    this.el.className = 'menu-card';
    this.el.hidden = true;
    this.el.innerHTML = `<h3>Controls</h3>
      <h4>Keyboard and mouse</h4>${table(KEYS)}
      <h4>Controller</h4>${table(padHelp().map((r) => [r.button, r.action] as const))}
      <p class="menu-keys">In menus: D-pad or left stick to move, <b>A</b> to press, <b>B</b> to go back.</p>
      <h4>Phone and tablet (landscape)</h4>${table(TOUCH)}
      <button data-act="close">Close</button>`;
    this.el.querySelector('[data-act=close]')!.addEventListener('click', () => this.hide());
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

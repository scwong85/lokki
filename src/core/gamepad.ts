import type { Input } from './input';

/** The parts of the browser's Gamepad we read (so tests can pass a plain object). */
export interface PadState {
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

/** Standard-mapping button indices (Xbox names; PlayStation is the same positions). */
export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, L3: 10, R3: 11 } as const;

/** Held buttons -> key codes the game already understands. */
const HOLD: [number, string][] = [
  [PAD.A, 'Space'], // flap / hop
  [PAD.RB, 'Space'],
  [PAD.RT, 'ShiftLeft'], // dive
  [PAD.R3, 'KeyT'], // taunt (co-op decoy)
];
/** Pressed buttons -> one-off key taps. */
const TAP: [number, string][] = [
  [PAD.X, 'KeyE'], // grab / drop
  [PAD.Y, 'KeyQ'], // toss
  [PAD.B, 'KeyF'], // poop
  [PAD.LEFT, 'KeyV'], // caw
  [PAD.UP, 'KeyG'], // flock
  [PAD.RIGHT, 'KeyB'], // pigeon
  [PAD.DOWN, 'KeyH'], // hawk-eye
  [PAD.LB, 'Tab'], // lock onto a target
  [PAD.BACK, 'KeyK'], // skills
  [PAD.START, 'KeyO'], // options
  [PAD.L3, 'Emote'], // emote: wave, laugh, point, facepalm in turn
];

const BUTTON_NAMES: Record<number, string> = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Back', 9: 'Start', 10: 'Left stick click', 11: 'Right stick click', 12: 'D-pad up', 13: 'D-pad down', 14: 'D-pad left', 15: 'D-pad right' };
const KEY_ACTIONS: Record<string, string> = {
  Space: 'Hop and flap', ShiftLeft: 'Dive', KeyE: 'Grab or drop', KeyQ: 'Toss', KeyF: 'Poop', KeyV: 'Crow call (skill)', KeyG: 'Flock call (skill)', KeyB: 'Pigeon disguise (skill)', KeyH: 'Hawk-eye', Tab: 'Lock onto a target (press again: next, then off)', KeyK: 'Skills and gull looks', KeyO: 'Options', KeyT: 'Taunt (hold): in co-op, people watch you instead of your partner', Emote: 'Emote (wave, laugh, point, facepalm in turn)',
};

/** The controller buttons and what they do, built from the real mapping so the help can never drift from it. */
export function padHelp(): { button: string; action: string }[] {
  const rows = [{ button: 'Left stick', action: 'Move and steer' }, { button: 'Right stick', action: 'Look' }, { button: 'LT (hold)', action: 'Brake and land: hold it with a ring ahead to glide onto it' }];
  for (const [b, code] of [...HOLD, ...TAP]) rows.push({ button: BUTTON_NAMES[b], action: KEY_ACTIONS[code] ?? code });
  return rows;
}

const dz = (v: number, dead: number) => (Math.abs(v) < dead ? 0 : (v - Math.sign(v) * dead) / (1 - dead));

/** Menu presses read from a pad: the D-pad or left stick moves (and repeats while held), A presses, B goes back. */
export type PadMenuAction = 'up' | 'down' | 'left' | 'right' | 'a' | 'b';

/** Which menu actions a pad is asking for right now. `prev` is last poll's pressed state; `held` times how long a direction has been held. Pure. */
export function readMenu(p: PadState, prev: readonly boolean[], held: { dir: PadMenuAction | null; t: number }, dt: number, dead = 0.5): PadMenuAction[] {
  const btn = (i: number) => p.buttons[i]?.pressed ?? false;
  const edge = (i: number) => btn(i) && !prev[i];
  const out: PadMenuAction[] = [];
  if (edge(PAD.A)) out.push('a');
  if (edge(PAD.B)) out.push('b');
  const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
  const dir: PadMenuAction | null = btn(PAD.UP) || ay < -dead ? 'up' : btn(PAD.DOWN) || ay > dead ? 'down' : btn(PAD.LEFT) || ax < -dead ? 'left' : btn(PAD.RIGHT) || ax > dead ? 'right' : null;
  if (!dir) {
    held.dir = null;
    held.t = 0;
  } else if (dir !== held.dir) {
    held.dir = dir;
    held.t = 0;
    out.push(dir);
  } else {
    held.t += Math.min(dt, 0.05); // a slow frame must not look like a long hold
    if (held.t >= 0.4) {
      held.t -= 0.12; // repeat while held
      out.push(dir);
    }
  }
  return out;
}

export interface PadFrame {
  /** Movement in [-1,1]: x right, y forward. The left trigger brakes (pulls back). */
  stick: { x: number; y: number };
  /** Look per second (right stick), in "mouse pixels" so the camera's sensitivity applies. */
  look: { x: number; y: number };
  held: Set<string>;
  taps: string[];
}

/** One poll of a pad -> what the game should see. `prev` is the pressed state from the last poll (for taps). Pure. */
export function readPad(p: PadState, prev: readonly boolean[], dead: number, lookSpeed: number): { frame: PadFrame; pressed: boolean[] } {
  const ax = (i: number) => p.axes[i] ?? 0;
  const btn = (i: number) => p.buttons[i]?.pressed ?? false;
  const brake = p.buttons[PAD.LT]?.value ?? 0;
  const stick = { x: dz(ax(0), dead), y: Math.max(-1, -dz(ax(1), dead) - brake) };
  const look = { x: dz(ax(2), dead) * lookSpeed, y: dz(ax(3), dead) * lookSpeed };
  const held = new Set<string>();
  for (const [b, code] of HOLD) if (btn(b)) held.add(code);
  const pressed = p.buttons.map((b) => b.pressed);
  const taps = TAP.filter(([b]) => pressed[b] && !prev[b]).map(([, code]) => code);
  return { frame: { stick, look, held, taps }, pressed };
}

/**
 * Feeds one gamepad into an `Input` every frame (gamepads are polled, not event-driven).
 * Holds become virtual keys, presses become taps, sticks become movement and look.
 */
export class GamepadSource {
  private prev: boolean[] = [];
  private held = new Set<string>();
  private stickActive = false;
  private emoteN = 0;
  connected = false;
  /** While a menu is open the pad drives the menu instead of the game. */
  menuOpen: () => boolean = () => false;
  onMenu: (a: PadMenuAction) => void = () => undefined;
  private menuHeld: { dir: PadMenuAction | null; t: number } = { dir: null, t: 0 };

  constructor(private input: Input, private index = 0) {}

  /** Call once per rendered frame. */
  poll(dt: number, dead: number, lookSpeed: number): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[this.index];
    const was = this.connected;
    this.connected = !!pad;
    if (!pad) {
      if (was) this.release(); // let go once when the pad disconnects (never fight touch or keys every frame)
      return;
    }
    if (this.menuOpen()) {
      this.release();
      for (const a of readMenu(pad, this.prev, this.menuHeld, dt)) this.onMenu(a);
      this.prev = pad.buttons.map((b) => b.pressed);
      return;
    }
    const { frame, pressed } = readPad(pad, this.prev, dead, lookSpeed);
    this.prev = pressed;
    for (const c of frame.held) if (!this.held.has(c)) this.input.setVirtual(c, true);
    for (const c of this.held) if (!frame.held.has(c)) this.input.setVirtual(c, false);
    this.held = frame.held;
    for (const t of frame.taps) this.input.tap(t === 'Emote' ? `Digit${(this.emoteN++ % 4) + 1}` : t);
    // only drive the stick while the pad is actually used, so keys and touch keep working with a pad plugged in
    if (frame.stick.x || frame.stick.y || this.stickActive) this.input.setStick(frame.stick.x, frame.stick.y);
    this.stickActive = frame.stick.x !== 0 || frame.stick.y !== 0;
    if (frame.look.x || frame.look.y) this.input.addLook(frame.look.x * dt, frame.look.y * dt);
  }

  release(): void {
    for (const c of this.held) this.input.setVirtual(c, false);
    this.held.clear();
    this.input.setStick(0, 0);
  }
}

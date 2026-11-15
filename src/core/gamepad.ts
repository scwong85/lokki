import type { Input } from './input';

/** The parts of the browser's Gamepad we read (so tests can pass a plain object). */
export interface PadState {
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

/** Standard-mapping button indices (Xbox names; PlayStation is the same positions). */
export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const;

/** Held buttons -> key codes the game already understands. */
const HOLD: [number, string][] = [
  [PAD.A, 'Space'], // flap / hop
  [PAD.RB, 'Space'],
  [PAD.RT, 'ShiftLeft'], // dive
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
  [PAD.BACK, 'KeyK'], // skills
  [PAD.START, 'KeyO'], // options
];

const dz = (v: number, dead: number) => (Math.abs(v) < dead ? 0 : (v - Math.sign(v) * dead) / (1 - dead));

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
  connected = false;

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
    const { frame, pressed } = readPad(pad, this.prev, dead, lookSpeed);
    this.prev = pressed;
    for (const c of frame.held) if (!this.held.has(c)) this.input.setVirtual(c, true);
    for (const c of this.held) if (!frame.held.has(c)) this.input.setVirtual(c, false);
    this.held = frame.held;
    for (const t of frame.taps) this.input.tap(t);
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

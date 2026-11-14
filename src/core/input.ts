/**
 * All player input in one place. Keyboard + mouse (pointer lock optional: click the canvas, Esc releases), plus
 * virtual sources that on-screen touch controls (and later a gamepad) feed with the same key codes, an analog
 * stick and look deltas. Gameplay only ever asks this class.
 */
export class Input {
  private down = new Set<string>();
  private pressedThisStep = new Set<string>();
  private clicked = false;
  private mdx = 0;
  private mdy = 0;
  locked = false;
  /** Keys held by virtual buttons (code -> how many sources hold it). */
  private virtualDown = new Map<string, number>();
  /** Analog movement from a virtual stick (used when no movement key is down). */
  private stick = { x: 0, y: 0 };
  /** Touch devices never capture the pointer. */
  pointerLockAllowed = true;

  constructor(canvas: HTMLElement) {
    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (!e.repeat) this.pressedThisStep.add(e.code);
      this.down.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => {
      this.down.clear();
      this.releaseVirtual();
    });
    canvas.addEventListener('click', () => {
      if (!this.locked && this.pointerLockAllowed) void canvas.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    addEventListener('mousedown', (e) => {
      if (this.locked && e.button === 0) this.clicked = true;
    });
    addEventListener('mousemove', (e) => {
      if (this.locked || e.buttons & 1) {
        this.mdx += e.movementX;
        this.mdy += e.movementY;
      }
    });
  }

  /** Left click while the pointer is captured (used to poop). */
  wasClicked(): boolean {
    return this.clicked;
  }

  isDown(code: string): boolean {
    return this.down.has(code) || (this.virtualDown.get(code) ?? 0) > 0;
  }

  /** A virtual button starts or stops holding a key. */
  setVirtual(code: string, held: boolean): void {
    const n = (this.virtualDown.get(code) ?? 0) + (held ? 1 : -1);
    if (n > 0) this.virtualDown.set(code, n);
    else this.virtualDown.delete(code);
    if (held && n === 1) this.pressedThisStep.add(code);
  }

  /** A one-off press (a tap on a virtual button). */
  tap(code: string): void {
    this.pressedThisStep.add(code);
  }

  /** Analog stick in [-1,1] (x right, y forward). */
  setStick(x: number, y: number): void {
    this.stick = { x, y };
  }

  /** Look input from a touch drag (pixels, like mouse movement). */
  addLook(dx: number, dy: number): void {
    this.mdx += dx;
    this.mdy += dy;
  }

  /** Drop every virtual input (touches cancelled, page hidden). */
  releaseVirtual(): void {
    this.virtualDown.clear();
    this.stick = { x: 0, y: 0 };
  }

  wasPressed(code: string): boolean {
    return this.pressedThisStep.has(code);
  }

  /** Movement axes in [-1,1]: x = right, y = forward. */
  axes(): { x: number; y: number } {
    const x = (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0);
    const y = (this.isDown('KeyW') ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0);
    if (x === 0 && y === 0) return { x: this.stick.x, y: this.stick.y };
    return { x, y };
  }

  /** Returns accumulated mouse delta since last call, then resets. */
  consumeMouse(): { dx: number; dy: number } {
    const r = { dx: this.mdx, dy: this.mdy };
    this.mdx = this.mdy = 0;
    return r;
  }

  /** Call once per sim step after reading input. */
  endStep(): void {
    this.pressedThisStep.clear();
    this.clicked = false;
  }
}

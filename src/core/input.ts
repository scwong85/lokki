/** Keyboard + mouse input. Pointer lock is optional: click canvas to capture, Esc to release. */
export class Input {
  private down = new Set<string>();
  private pressedThisStep = new Set<string>();
  private clicked = false;
  private mdx = 0;
  private mdy = 0;
  locked = false;

  constructor(canvas: HTMLElement) {
    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (!e.repeat) this.pressedThisStep.add(e.code);
      this.down.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('click', () => {
      if (!this.locked) void canvas.requestPointerLock?.();
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
    return this.down.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressedThisStep.has(code);
  }

  /** Movement axes in [-1,1]: x = right, y = forward. */
  axes(): { x: number; y: number } {
    const x = (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0);
    const y = (this.isDown('KeyW') ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0);
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

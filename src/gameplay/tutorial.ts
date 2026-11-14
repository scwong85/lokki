import { TUTORIAL, type TutorialEvent, type TutorialStep } from '../data/tutorial';

/** Walks through the tips in order; each step completes when its event happens. Pure logic. */
export class Tutorial {
  private i = 0;
  /** Seconds the "well done" line stays after the last step. */
  private outro = 0;
  private active: boolean;

  constructor(active: boolean, private steps: readonly TutorialStep[] = TUTORIAL) {
    this.active = active;
  }

  get running(): boolean {
    return this.active;
  }

  get current(): TutorialStep | null {
    return this.active && this.i < this.steps.length ? this.steps[this.i] : null;
  }

  get step(): number {
    return this.i;
  }

  get total(): number {
    return this.steps.length;
  }

  /** Returns true on the step that finishes the last tip. */
  event(e: TutorialEvent): boolean {
    const c = this.current;
    if (!c || c.on !== e) return false;
    this.i++;
    if (this.i >= this.steps.length) {
      this.outro = 3;
      return true;
    }
    return false;
  }

  /** True while the closing "have fun" line should show. */
  get outroShowing(): boolean {
    return this.active && this.i >= this.steps.length && this.outro > 0;
  }

  /** Returns true once the whole tutorial, outro included, is over. */
  tick(dt: number): boolean {
    if (!this.active || this.i < this.steps.length) return false;
    this.outro -= dt;
    if (this.outro <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  skip(): void {
    this.active = false;
  }

  restart(): void {
    this.i = 0;
    this.outro = 0;
    this.active = true;
  }
}

/** Fixed-timestep accumulator. Pure logic: no DOM, fully testable. */
export class FixedStepper {
  private acc = 0;
  constructor(
    public readonly step: number,
    private readonly maxSteps = 5,
  ) {}

  /** Feed elapsed real seconds; returns how many sim steps to run and the interpolation alpha. */
  advance(dt: number): { steps: number; alpha: number } {
    this.acc += Math.min(dt, this.step * this.maxSteps);
    let steps = 0;
    while (this.acc >= this.step && steps < this.maxSteps) {
      this.acc -= this.step;
      steps++;
    }
    if (steps === this.maxSteps) this.acc = 0; // drop backlog (spiral of death)
    return { steps, alpha: this.acc / this.step };
  }
}

export interface LoopHandlers {
  update(dt: number): void;
  render(alpha: number, frameDt: number): void;
  /** Slow motion: the simulation advances at this fraction of real time (1 = normal). */
  timeScale?(): number;
}

export const SIM_HZ = 60;

/** requestAnimationFrame driver: fixed 60 Hz simulation, variable-rate rendering. */
export function startLoop(h: LoopHandlers): () => void {
  const stepper = new FixedStepper(1 / SIM_HZ);
  let last = performance.now();
  let raf = 0;
  let errors = 0;
  const frame = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    try {
      const { steps, alpha } = stepper.advance(dt * (h.timeScale?.() ?? 1));
      for (let i = 0; i < steps; i++) h.update(stepper.step);
      h.render(alpha, dt);
    } catch (err) {
      // one bad frame must not freeze the whole game: report (a few times) and carry on
      if (errors++ < 5) console.error('frame error:', err);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

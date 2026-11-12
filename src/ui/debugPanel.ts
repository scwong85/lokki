import { exportTuning, tuning, type Param } from '../core/tuning';
import { events } from '../core/events';

/** Tiny custom debug overlay: FPS/frame time + live tuning sliders + "Copy tuning as JSON". Toggle with F3. */
export class DebugPanel {
  private stats: HTMLElement;
  private frames = 0;
  private acc = 0;
  private worst = 0;

  constructor(root: HTMLElement) {
    const el = document.createElement('div');
    el.id = 'debug';
    el.innerHTML = `<div class="stats"></div><div class="body"></div>`;
    root.appendChild(el);
    this.stats = el.querySelector('.stats')!;
    const body = el.querySelector('.body') as HTMLElement;

    for (const [group, params] of Object.entries(tuning)) {
      const h = document.createElement('h4');
      h.textContent = group;
      body.appendChild(h);
      for (const [name, prm] of Object.entries(params as Record<string, Param>)) {
        const row = document.createElement('label');
        const val = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(prm.min);
        input.max = String(prm.max);
        input.step = String(prm.step);
        input.value = String(prm.value);
        val.textContent = String(prm.value);
        input.addEventListener('input', () => {
          prm.value = Number(input.value);
          val.textContent = input.value;
          events.emit('tuningChanged', undefined);
        });
        row.append(name, input, val);
        body.appendChild(row);
      }
    }

    const copy = document.createElement('button');
    copy.textContent = 'Copy tuning as JSON';
    copy.addEventListener('click', async () => {
      const json = JSON.stringify(exportTuning(), null, 2);
      try {
        await navigator.clipboard.writeText(json);
        copy.textContent = 'Copied!';
      } catch {
        prompt('Copy tuning JSON:', json);
      }
      setTimeout(() => (copy.textContent = 'Copy tuning as JSON'), 1500);
    });
    const reset = document.createElement('button');
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => location.reload()); // tuning is not persisted yet
    body.append(copy, reset);

    addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        body.hidden = !body.hidden;
      }
    });
    body.hidden = true;
  }

  frame(dt: number): void {
    this.frames++;
    this.acc += dt;
    this.worst = Math.max(this.worst, dt);
    if (this.acc >= 0.5) {
      const fps = this.frames / this.acc;
      this.stats.textContent = `${fps.toFixed(0)} fps · ${(1000 / fps).toFixed(1)} ms · worst ${(this.worst * 1000).toFixed(0)} ms  [F3: tuning · click: mouse look · WASD]`;
      this.frames = 0;
      this.acc = 0;
      this.worst = 0;
    }
  }
}

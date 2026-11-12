import type { FlightState } from '../gull/flight';
import type { Wind } from '../gull/wind';

/** Minimal flight HUD: stamina bar, mode, speed/height, wind arrow, target counter, toasts. */
export class Hud {
  private el: HTMLElement;
  private bar: HTMLElement;
  private info: HTMLElement;
  private arrow: HTMLElement;
  private toastEl: HTMLElement;
  private toastT = 0;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'hud';
    this.el.innerHTML = `
      <div class="info"></div>
      <div class="wind"><span class="arrow">➤</span></div>
      <div class="toast"></div>
      <div class="stam"><div class="bar"></div></div>
      <div class="keys">WASD steer · Space hop / flap · Shift dive (hold; aim with mouse, height = steepness) · S flare/brake · R reset · F3 tuning</div>`;
    root.appendChild(this.el);
    this.bar = this.el.querySelector('.bar')!;
    this.info = this.el.querySelector('.info')!;
    this.arrow = this.el.querySelector('.arrow')!;
    this.toastEl = this.el.querySelector('.toast')!;
  }

  toast(msg: string, secs = 1.2): void {
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    this.toastT = secs;
  }

  update(s: FlightState, staminaMax: number, wind: Wind, camYaw: number, hits: number, total: number, dt: number): void {
    const frac = s.stamina / staminaMax;
    this.bar.style.width = `${(frac * 100).toFixed(0)}%`;
    this.bar.style.background = frac < 0.2 ? '#ff7a7a' : '#ffd36e';
    const mode = s.stunT > 0 ? 'stunned' : s.perched ? 'perched' : s.mode;
    const speed = Math.hypot(s.vx, s.vy, s.vz);
    this.info.textContent = `${mode} · ${speed.toFixed(0)} m/s · ${s.heightAbove.toFixed(0)} m up · targets ${hits}/${total}`;
    this.arrow.style.transform = `rotate(${(-(wind.angle - camYaw) * 180) / Math.PI - 90}deg) scale(${0.6 + Math.min(1.5, wind.speed / 4)})`;
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toastEl.style.opacity = '0';
    }
  }
}

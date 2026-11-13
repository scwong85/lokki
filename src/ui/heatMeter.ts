import type { CityResponse, DeterrentId } from '../gameplay/deterrents';
import { DETERRENT_NAMES, ORDER } from '../gameplay/deterrents';
import type { Heat } from '../gameplay/heat';
import { tuning } from '../core/tuning';

const TIER_NAMES = ['calm', 'wary', 'scare lines', 'nets', 'Warden hunting'];

/** Small heat indicator: bar with the four tier marks, the city's mood, what it has deployed and what gulls have learned. */
export class HeatMeter {
  private el: HTMLElement;
  private fill: HTMLElement;
  private label: HTMLElement;
  private list: HTMLElement;
  private hawk: HTMLElement;
  private lastList = '';

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'heat';
    this.el.innerHTML = `<div class="hl"><span class="name">Heat</span> <span class="mood"></span></div>
      <div class="hb"><div class="hf"></div></div><div class="hd"></div><div class="hh"></div>`;
    root.appendChild(this.el);
    this.fill = this.el.querySelector('.hf')!;
    this.label = this.el.querySelector('.mood')!;
    this.list = this.el.querySelector('.hd')!;
    this.hawk = this.el.querySelector('.hh')!;
    // tier marks
    const bar = this.el.querySelector('.hb')!;
    for (const t of [tuning.heat.tier1, tuning.heat.tier2, tuning.heat.tier3, tuning.heat.tier4]) {
      const tick = document.createElement('i');
      tick.style.left = `${t.value}%`;
      bar.appendChild(tick);
    }
  }

  update(heat: Heat, response: CityResponse, hawkReady: number, hawkActive: boolean): void {
    this.fill.style.width = `${heat.value}%`;
    this.fill.style.background = heat.tier >= 4 ? '#e5484d' : heat.tier >= 3 ? '#f08a4b' : heat.tier >= 2 ? '#f2c14e' : heat.tier >= 1 ? '#9bd8b0' : '#a9dcff';
    this.label.textContent = TIER_NAMES[heat.tier];
    const items = ORDER.filter((id) => response.deployed.has(id)).map((id: DeterrentId) => {
      const learned = response.isLearned(id);
      return `<span class="${learned ? 'learned' : ''}">${DETERRENT_NAMES[id]}${learned ? ' (learned)' : ''}</span>`;
    });
    const html = items.join(' · ');
    if (html !== this.lastList) {
      this.lastList = html;
      this.list.innerHTML = html;
    }
    this.hawk.textContent = hawkActive ? 'Hawk-eye!' : hawkReady >= 1 ? 'H: hawk-eye ready' : `hawk-eye ${Math.round(hawkReady * 100)}%`;
    this.hawk.classList.toggle('on', hawkActive);
  }
}

import { chainLeft, rankFor, type HavocRun, type ScoreResult } from '../gameplay/havoc/scoring';
import { formatClock } from '../gameplay/runTimer';

/** Havoc Hour on screen: the score, the chain meter, the clock, pop-ups for each bit of mischief, and the results card. */
export class HavocHud {
  private readonly bar: HTMLElement;
  private readonly pops: HTMLElement;
  private readonly card: HTMLElement;
  private readonly glow: HTMLElement;
  private lastMult = 0;

  constructor(root: HTMLElement) {
    this.bar = document.createElement('div');
    this.bar.id = 'havoc';
    this.bar.hidden = true;
    this.bar.innerHTML = '<div class="hv-score"></div><div class="hv-chain"><span class="hv-mult"></span><span class="hv-ring"></span></div><div class="hv-meter"><i></i></div><div class="hv-line"></div>';
    this.glow = document.createElement('div');
    this.glow.id = 'havocglow';
    this.pops = document.createElement('div');
    this.pops.id = 'havocpops';
    this.card = document.createElement('div');
    this.card.id = 'havoccard';
    this.card.hidden = true;
    root.append(this.glow, this.bar, this.pops, this.card);
  }

  get active(): boolean {
    return !this.bar.hidden;
  }

  show(on: boolean): void {
    this.bar.hidden = !on;
    this.glow.style.opacity = '0';
    this.lastMult = 0;
    if (!on) {
      this.pops.innerHTML = '';
      this.card.hidden = true;
    }
  }

  /** A line of text that floats up and fades: "Snatched! +300 x3". */
  pop(r: ScoreResult): void {
    const d = document.createElement('div');
    d.className = `hv-pop${r.repeat ? ' rep' : ''}`;
    d.innerHTML = `${r.label} <b>+${r.gained}</b>${r.mult > 1 ? ` <em>x${r.mult}</em>` : ''}`;
    this.pops.appendChild(d);
    while (this.pops.children.length > 5) this.pops.firstElementChild?.remove();
    setTimeout(() => d.remove(), 1800);
  }

  broken(points: number): void {
    if (points <= 0) return;
    const d = document.createElement('div');
    d.className = 'hv-pop broke';
    d.textContent = 'Chain broken!';
    this.pops.appendChild(d);
    setTimeout(() => d.remove(), 1500);
  }

  update(run: HavocRun): void {
    if (this.bar.hidden) return;
    const c = run.chain;
    const live = chainLeft(c, run.t);
    (this.bar.querySelector('.hv-score') as HTMLElement).textContent = `${run.score.toLocaleString('en')}`;
    (this.bar.querySelector('.hv-meter i') as HTMLElement).style.width = `${Math.round(live * 100)}%`;
    // the chain cue: a big multiplier that pops when it rises, a meter that turns red as it runs out, and a glow around the screen
    const mult = live > 0 ? c.mult : 0;
    const badge = this.bar.querySelector('.hv-mult') as HTMLElement;
    const chain = this.bar.querySelector('.hv-chain') as HTMLElement;
    chain.classList.toggle('on', mult > 0);
    if (mult !== this.lastMult) {
      if (mult > 0) {
        badge.textContent = `x${mult}`;
        badge.classList.remove('pop');
        void badge.offsetWidth;
        badge.classList.add('pop');
      }
      this.lastMult = mult;
    }
    this.bar.classList.toggle('hot', mult >= 4);
    this.bar.classList.toggle('fading', live > 0 && live < 0.3);
    this.glow.style.opacity = mult > 1 ? `${Math.min(0.85, 0.15 + mult * 0.1) * Math.min(1, live * 2)}` : '0';
    this.glow.style.boxShadow = `inset 0 0 ${60 + mult * 14}px ${10 + mult * 4}px ${mult >= 6 ? 'rgba(255,90,150,.8)' : mult >= 3 ? 'rgba(255,170,60,.8)' : 'rgba(255,220,110,.7)'}`;
    const rank = rankFor(run.score);
    (this.bar.querySelector('.hv-line') as HTMLElement).textContent = `${live > 0 ? `CHAIN x${c.mult} · ` : ''}${run.started ? formatClock(run.left) : 'move to start'} · ${rank.name}`;
  }

  results(run: HavocRun, best: number, newBest: boolean, extra: string): void {
    const rank = rankFor(run.score);
    const top = [...run.kinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    this.card.innerHTML = `<h2>Time!</h2>
      <div class="hv-big">${run.score.toLocaleString('en')}</div>
      <div class="hv-rank">${rank.name}${rank.next !== null ? ` <small>(next at ${rank.next.toLocaleString('en')})</small>` : ''}</div>
      <ul>${top.map(([k, n]) => `<li>${k} <b>x${n}</b></li>`).join('') || '<li>Nothing happened. Suspicious.</li>'}</ul>
      <p>Biggest chain <b>${run.chain.bestChain.toLocaleString('en')}</b> · top multiplier <b>x${run.chain.bestMult}</b></p>
      <p>${newBest ? '<b>New best!</b>' : `Best ${best.toLocaleString('en')}`}${extra ? ` · ${extra}` : ''}</p>
      <p class="hv-keys">R: another run · L: levels</p>`;
    this.card.hidden = false;
  }

  hideResults(): void {
    this.card.hidden = true;
  }
}

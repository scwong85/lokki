/**
 * An online co-op session on top of a PeerLink: who is host and who is guest, what has been heard from the other side.
 * The game asks it things each step (anything new from the guest? latest snapshot?) and tells it things to send.
 */
import { PROTOCOL_VERSION, type GameEvent, type InputFrame, type Msg } from './protocol';
import type { GullSnap, Snapshot } from './snapshot';

/** What a link must offer (PeerLink does; tests use a fake). */
export interface Link {
  send(m: Msg): unknown;
  onMessage(f: (m: Msg) => void): void;
  onClose(f: (why: string) => void): void;
  readonly isOpen: boolean;
}

/** Sends button presses reliably over a channel that may drop packets: each press keeps being sent for a while; the receiver counts it once. */
export class TapSender {
  private seq = 0;
  private recent: { id: number; k: string; at: number }[] = [];
  constructor(private keep = 0.5) {}
  push(k: string, now: number): void {
    this.recent.push({ id: ++this.seq, k, at: now });
  }
  /** What to put in this frame. */
  frame(now: number): [number, string][] {
    this.recent = this.recent.filter((t) => now - t.at <= this.keep);
    return this.recent.map((t) => [t.id, t.k]);
  }
}

export class TapReceiver {
  private last = 0;
  /** The presses in a frame that have not been seen before, in order. */
  accept(taps: readonly [number, string][]): string[] {
    const fresh = taps.filter(([id]) => id > this.last).sort((a, b) => a[0] - b[0]);
    if (fresh.length) this.last = fresh[fresh.length - 1][0];
    return fresh.map(([, k]) => k);
  }
}

export class NetSession {
  /** Host: the guest's newest controls. */
  guestFrame: InputFrame | null = null;
  /** Guest: the newest snapshot, until the game takes it. */
  snapshot: Snapshot | null = null;
  guestName = 'Guest';
  guestLook = 'herring';
  hostLook = 'herring';
  /** Guest: set when the host sent a level; the game loads it. */
  onLevel: ((id: string) => void) | null = null;
  /** Guest: the host has welcomed us (the other player exists now). */
  onWelcome: (() => void) | null = null;
  /** Guest: the level and restart count the host is on (snapshots repeat it, so a lost message cannot strand the guest). */
  hostLevel: { id: string; rev: number } | null = null;
  welcomed = false;
  private helloT = 0;
  private helloArgs: [string, string] | null = null;
  onEvent: ((e: GameEvent) => void) | null = null;
  onHello: (() => void) | null = null;
  onLeave: ((why: string) => void) | null = null;
  private taps = new TapReceiver();
  private pendingTaps: string[] = [];
  private inputN = 0;
  lastAck = 0;
  private left = false;

  constructor(readonly role: 'host' | 'guest', private link: Link, private now: () => number = () => performance.now() / 1000) {
    link.onMessage((m) => this.receive(m));
    link.onClose(() => this.leave('The other player disconnected.'));
  }

  get open(): boolean {
    return this.link.isOpen && !this.left;
  }

  private leave(why: string): void {
    if (this.left) return;
    this.left = true;
    this.onLeave?.(why);
  }

  private receive(m: Msg): void {
    switch (m.t) {
      case 'hello':
        if (this.role !== 'host') return;
        if (m.v !== PROTOCOL_VERSION) {
          this.link.send({ t: 'bye', why: 'The two copies of the game are different versions. Reload both pages.' });
          return;
        }
        this.guestName = m.name;
        this.guestLook = m.look;
        this.onHello?.();
        break;
      case 'welcome':
        this.hostLook = m.hostLook;
        if (!this.welcomed) {
          this.welcomed = true;
          this.onWelcome?.();
        }
        break;
      case 'level':
        this.onLevel?.(m.id);
        break;
      case 'input':
        if (m.f.n >= (this.guestFrame?.n ?? -1)) {
          this.guestFrame = m.f;
          this.pendingTaps.push(...this.taps.accept(m.f.taps));
        }
        break;
      case 'snap':
        this.snapshot = m.s;
        this.lastAck = m.ack;
        this.hostLevel = { id: m.lvl, rev: m.rev };
        break;
      case 'event':
        this.onEvent?.(m.e);
        break;
      case 'bye':
        this.leave(m.why);
        break;
      case 'ping':
        this.link.send({ t: 'pong', at: m.at });
        break;
    }
  }

  /** Host: button presses from the guest since last asked. */
  takeTaps(): string[] {
    return this.pendingTaps.splice(0);
  }

  /** Guest: the snapshot to apply (once). */
  takeSnapshot(): Snapshot | null {
    const s = this.snapshot;
    this.snapshot = null;
    return s;
  }

  // ---- sending ----
  private tapOut = new TapSender();
  tap(k: string): void {
    this.tapOut.push(k, this.now());
  }
  sendInput(f: { ax: number; ay: number; flap: boolean; dive: boolean; yaw: number; pitch: number; s: GullSnap }): void {
    this.link.send({ t: 'input', f: { n: ++this.inputN, ...f, taps: this.tapOut.frame(this.now()) } });
  }
  sendSnapshot(s: Snapshot, lvl: string, rev: number): void {
    this.link.send({ t: 'snap', s, ack: this.guestFrame?.n ?? 0, lvl, rev });
  }
  sendEvent(e: GameEvent): void {
    if (this.open) this.link.send({ t: 'event', e });
  }
  sendLevel(id: string): void {
    if (this.open) this.link.send({ t: 'level', id });
  }
  hello(name: string, look: string): void {
    this.helloArgs = [name, look];
    this.link.send({ t: 'hello', v: PROTOCOL_VERSION, name, look });
  }
  /** Each sim step: a guest repeats its hello until the host welcomes it (the channel may drop packets). */
  tick(dt: number): void {
    if (this.role !== 'guest' || this.welcomed || !this.helloArgs) return;
    this.helloT += dt;
    if (this.helloT >= 0.5) {
      this.helloT = 0;
      this.hello(...this.helloArgs);
    }
  }
  welcome(level: string, hostLook: string): void {
    this.link.send({ t: 'welcome', v: PROTOCOL_VERSION, level, hostLook });
  }
  bye(why: string): void {
    if (this.link.isOpen) this.link.send({ t: 'bye', why });
    this.left = true;
  }
}

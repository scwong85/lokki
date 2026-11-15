import { describe, expect, it } from 'vitest';
import { NetSession, TapReceiver, TapSender, type Link } from '../../src/net/session';
import type { Msg } from '../../src/net/protocol';
import type { GullSnap } from '../../src/net/snapshot';

class FakeLink implements Link {
  isOpen = true;
  sent: Msg[] = [];
  private om: ((m: Msg) => void) | null = null;
  private oc: ((w: string) => void) | null = null;
  send(m: Msg) {
    this.sent.push(m);
  }
  onMessage(f: (m: Msg) => void) {
    this.om = f;
  }
  onClose(f: (w: string) => void) {
    this.oc = f;
  }
  deliver(m: Msg) {
    this.om?.(m);
  }
  drop() {
    this.isOpen = false;
    this.oc?.('x');
  }
}
const gs: GullSnap = { id: 1, p: [1, 2, 3], v: [0, 0, 0], h: 0, mode: 'air', carry: null };

describe('taps survive a lossy channel', () => {
  it('a press is repeated for a while and counted once', () => {
    const tx = new TapSender(0.5);
    const rx = new TapReceiver();
    tx.push('KeyE', 0);
    const f1 = tx.frame(0.01);
    const f2 = tx.frame(0.02); // f1 was "lost", f2 gets there
    expect(rx.accept(f2)).toEqual(['KeyE']);
    expect(rx.accept(f1)).toEqual([]); // the late copy is ignored
    expect(rx.accept(tx.frame(0.3))).toEqual([]);
    expect(tx.frame(0.9)).toEqual([]); // stops repeating
  });
  it('keeps the order of different presses', () => {
    const tx = new TapSender();
    const rx = new TapReceiver();
    tx.push('KeyE', 0);
    tx.push('KeyF', 0.01);
    expect(rx.accept(tx.frame(0.02))).toEqual(['KeyE', 'KeyF']);
    tx.push('KeyQ', 0.03);
    expect(rx.accept(tx.frame(0.04))).toEqual(['KeyQ']);
  });
});

describe('NetSession', () => {
  it('host: takes the guest controls and their presses; ignores stale frames', () => {
    const link = new FakeLink();
    const host = new NetSession('host', link);
    const base = { ax: 0, ay: 1, flap: true, dive: false, yaw: 0, pitch: 0, s: gs };
    link.deliver({ t: 'input', f: { n: 2, ...base, taps: [[1, 'KeyE']] } });
    link.deliver({ t: 'input', f: { n: 1, ...base, ay: -1, taps: [] } }); // arrived late
    expect(host.guestFrame?.n).toBe(2);
    expect(host.guestFrame?.ay).toBe(1);
    expect(host.takeTaps()).toEqual(['KeyE']);
    expect(host.takeTaps()).toEqual([]);
  });
  it('guest: keeps the newest snapshot until taken, knows the host level, and is welcomed once', () => {
    const link = new FakeLink();
    const guest = new NetSession('guest', link);
    let welcomed = 0;
    guest.onWelcome = () => welcomed++;
    link.deliver({ t: 'welcome', v: 1, level: 'snack-attack', hostLook: 'herring' });
    link.deliver({ t: 'welcome', v: 1, level: 'snack-attack', hostLook: 'herring' }); // a repeat
    expect(welcomed).toBe(1);
    link.deliver({ t: 'snap', s: { t: 1, gulls: [], props: [], npcs: [], heat: 0, quests: [] }, ack: 5, lvl: 'bombs-away', rev: 2 });
    expect(guest.hostLevel).toEqual({ id: 'bombs-away', rev: 2 });
    expect(guest.takeSnapshot()?.t).toBe(1);
    expect(guest.takeSnapshot()).toBeNull();
  });
  it('guest: repeats hello until welcomed', () => {
    const link = new FakeLink();
    const guest = new NetSession('guest', link);
    guest.hello('G', 'herring');
    for (let i = 0; i < 90; i++) guest.tick(1 / 60); // 1.5 s
    const n = link.sent.filter((m) => m.t === 'hello').length;
    expect(n).toBeGreaterThanOrEqual(3);
    link.deliver({ t: 'welcome', v: 1, level: 'x', hostLook: 'herring' });
    for (let i = 0; i < 90; i++) guest.tick(1 / 60);
    expect(link.sent.filter((m) => m.t === 'hello').length).toBe(n);
  });
  it('a different protocol version is turned away; a dropped link ends the session once', () => {
    const link = new FakeLink();
    const host = new NetSession('host', link);
    let hello = 0;
    host.onHello = () => hello++;
    link.deliver({ t: 'hello', v: 999, name: 'x', look: 'herring' });
    expect(hello).toBe(0);
    expect(link.sent.some((m) => m.t === 'bye')).toBe(true);
    const why: string[] = [];
    host.onLeave = (w) => why.push(w);
    link.drop();
    link.drop();
    expect(why.length).toBe(1);
  });
  it('answers pings', () => {
    const link = new FakeLink();
    new NetSession('guest', link);
    link.deliver({ t: 'ping', at: 12 });
    expect(link.sent).toEqual([{ t: 'pong', at: 12 }]);
  });
});

import { decodeCode, encodeCode } from './codec';
import { decodeMsg, encodeMsg, type Msg } from './protocol';

export interface PeerOptions {
  /** STUN servers (needed to find each other across home networks; none = same network only). */
  iceServers?: RTCIceServer[];
}

export const PUBLIC_STUN: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/** How many ICE candidates of each kind an SDP lists (host = local address, srflx = found via STUN, relay = via a relay). Pure. */
export function countCandidates(sdp: string | undefined): { host: number; srflx: number; relay: number } {
  const out = { host: 0, srflx: 0, relay: 0 };
  for (const m of (sdp ?? '').matchAll(/^a=candidate:.* typ (host|srflx|prflx|relay)\b/gm)) out[m[1] === 'prflx' ? 'srflx' : (m[1] as 'host' | 'srflx' | 'relay')]++;
  return out;
}

/** Why a connection fails, in words a player can act on. Pure. */
export function explainFailure(local: { host: number; srflx: number; relay: number }, remote: { host: number; srflx: number; relay: number }): string {
  if (local.srflx === 0 && local.relay === 0) return 'Your network did not answer the address lookup (STUN is blocked), so only a relay can connect you. Add one in Settings.';
  if (remote.srflx === 0 && remote.relay === 0) return "Your friend's network did not answer the address lookup (STUN is blocked), so only a relay can connect you. Add one in Settings (both of you).";
  if (local.relay === 0 && remote.relay === 0) return 'The two networks could not reach each other directly (common on mobile data, strict Wi-Fi and some home routers). A relay fixes it: Settings → use a relay, on both devices, then try again.';
  return 'Even the relay did not connect. Check the relay settings, or try again.';
}

type Handlers = { open: (() => void)[]; close: ((why: string) => void)[]; msg: ((m: Msg) => void)[]; state: ((s: string) => void)[] };

/**
 * One WebRTC connection between two browsers, with a data channel for game messages. The two sides connect by
 * swapping short invite codes (copy and paste): the host makes an invite, the guest answers it, the host pastes the
 * answer. No server involved; STUN (optional) only helps the browsers find each other across networks.
 */
export class PeerLink {
  private pc: RTCPeerConnection;
  private ch: RTCDataChannel | null = null;
  private h: Handlers = { open: [], close: [], msg: [], state: [] };
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  isOpen = false;

  constructor(opts: PeerOptions = {}) {
    this.pc = new RTCPeerConnection({ iceServers: opts.iceServers ?? [] });
    this.pc.addEventListener('connectionstatechange', () => {
      const s = this.pc.connectionState;
      // "disconnected" is often a hiccup that recovers by itself: only give up on failed / closed
      if (s === 'failed' || s === 'closed') this.fireClose(this.isOpen ? `connection ${s}` : this.explain());
      else this.h.state.forEach((f) => f(this.status()));
    });
    this.pc.addEventListener('iceconnectionstatechange', () => this.h.state.forEach((f) => f(this.status())));
    this.pc.addEventListener('datachannel', (e) => this.attach(e.channel)); // guest side
  }

  onOpen(f: () => void): void {
    this.h.open.push(f);
  }
  onClose(f: (why: string) => void): void {
    this.h.close.push(f);
  }
  onMessage(f: (m: Msg) => void): void {
    this.h.msg.push(f);
  }

  /** Progress text for the lobby ("checking, found 2 local / 1 public addresses"). */
  onState(f: (s: string) => void): void {
    this.h.state.push(f);
  }

  private counts() {
    return { local: countCandidates(this.pc.localDescription?.sdp), remote: countCandidates(this.pc.remoteDescription?.sdp) };
  }

  /** The current connection state in plain words. */
  status(): string {
    const { local, remote } = this.counts();
    return `${this.pc.iceConnectionState}; you found ${local.host} local, ${local.srflx} public, ${local.relay} relay address(es); the other side ${remote.host}/${remote.srflx}/${remote.relay}`;
  }

  private explain(): string {
    const { local, remote } = this.counts();
    return `${explainFailure(local, remote)} (${this.status()})`;
  }

  /** Give up with an explanation if the link has not opened in time (the browser itself waits about 30 s). */
  private watchOpen(): void {
    this.openTimer ??= setTimeout(() => {
      if (!this.isOpen) this.fireClose(this.explain());
    }, 25000);
  }

  private attach(ch: RTCDataChannel): void {
    this.ch = ch;
    ch.binaryType = 'arraybuffer';
    ch.addEventListener('open', () => {
      this.isOpen = true;
      if (this.openTimer) clearTimeout(this.openTimer);
      for (const f of this.h.open) f();
    });
    ch.addEventListener('close', () => this.fireClose('channel closed'));
    ch.addEventListener('message', (e) => {
      const m = typeof e.data === 'string' ? decodeMsg(e.data) : null;
      if (m) for (const f of this.h.msg) f(m);
    });
  }

  private fireClose(why: string): void {
    if (this.closed) return;
    this.closed = true;
    this.isOpen = false;
    for (const f of this.h.close) f(why);
  }

  /** Wait until the browser has found its network addresses, so the code contains them all. */
  private gathered(): Promise<void> {
    if (this.pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((res) => {
      const done = () => {
        if (this.pc.iceGatheringState === 'complete') {
          this.pc.removeEventListener('icegatheringstatechange', done);
          res();
        }
      };
      this.pc.addEventListener('icegatheringstatechange', done);
      setTimeout(res, 4000); // do not hang on a blocked STUN server: use what we have
    });
  }

  /** Host, step 1: make an invite code to send to the friend. */
  async createInvite(): Promise<string> {
    this.attach(this.pc.createDataChannel('lokki', { ordered: false, maxRetransmits: 0 })); // newest state wins; no stale retries
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await this.gathered();
    return this.localCode();
  }

  private localCode(): Promise<string> {
    const d = this.pc.localDescription!;
    return encodeCode({ type: d.type === 'offer' ? 'offer' : 'answer', sdp: d.sdp });
  }

  /** Guest: paste the host's invite, get an answer code to send back. */
  async acceptInvite(code: string): Promise<string> {
    const d = await decodeCode(code);
    if (d.type !== 'offer') throw new Error('That is an answer code. Paste the host\'s invite code here instead.');
    await this.pc.setRemoteDescription(d);
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await this.gathered();
    this.watchOpen();
    return this.localCode();
  }

  /** Host, step 2: paste the friend's answer code. The link opens by itself. */
  async acceptAnswer(code: string): Promise<void> {
    const d = await decodeCode(code);
    if (d.type !== 'answer') throw new Error('That is an invite code. Paste the friend\'s answer code here instead.');
    await this.pc.setRemoteDescription(d);
    this.watchOpen();
  }

  send(m: Msg): boolean {
    if (!this.ch || this.ch.readyState !== 'open') return false;
    this.ch.send(encodeMsg(m));
    return true;
  }

  /** Bytes waiting to be sent (to skip a snapshot when the line is congested). */
  get buffered(): number {
    return this.ch?.bufferedAmount ?? 0;
  }

  close(): void {
    this.fireClose('closed');
    try {
      this.ch?.close();
      this.pc.close();
    } catch {
      /* already gone */
    }
  }
}

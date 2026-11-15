import { PeerLink } from '../net/peer';
import { cleanSignalUrl, loadNetConfig, parseIceServers, resolveIceServers, saveNetConfig, type NetConfig } from '../net/netConfig';
import { SignalClient } from '../net/signal';

/**
 * The co-op lobby (N, or Options > Play with a friend). No server: the host makes an invite code, the friend pastes it and
 * sends back an answer code, the host pastes that, and the two browsers connect directly.
 */
export class Lobby {
  private el: HTMLElement;
  private link: PeerLink | null = null;
  private role: 'host' | 'guest' | null = null;
  private cfg: NetConfig = loadNetConfig();
  /** Bumped whenever a page is left, so an old room wait stops. */
  private gen = 0;
  private roomCode = '';

  constructor(
    root: HTMLElement,
    private hooks: { onConnected: (role: 'host' | 'guest', link: PeerLink) => void; onLeave: () => void },
  ) {
    this.el = document.createElement('div');
    this.el.id = 'lobby';
    this.el.className = 'menu-card';
    this.el.hidden = true;
    this.el.addEventListener('keydown', (e) => {
      e.stopPropagation(); // typing a code must not trigger game keys
      if (e.code === 'Escape') this.hide();
    });
    this.el.addEventListener('keyup', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a[data-act]')) e.preventDefault();
      void this.click(e.target as HTMLElement);
    });
    root.appendChild(this.el);
    this.render('start');
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  show(): void {
    this.el.hidden = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  hide(): void {
    this.el.hidden = true;
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  /** Tell the lobby the session is on (or over), so it shows the right page. */
  setConnected(who: string | null): void {
    if (who) this.render('playing', who);
    else this.render('start');
  }

  private q<T extends HTMLElement>(sel: string): T {
    return this.el.querySelector<T>(sel)!;
  }

  private setStatus(text: string, bad = false): void {
    const s = this.el.querySelector<HTMLElement>('.lb-status');
    if (s) {
      s.textContent = text;
      s.classList.toggle('bad', bad);
    }
  }

  private render(page: 'start' | 'host' | 'join' | 'playing' | 'roomhost' | 'roomjoin', who = ''): void {
    const head = '<h3>Play with a friend</h3>';
    const copyRow = (id: string) => `<textarea id="${id}" rows="4" readonly></textarea><button data-act="copy" data-for="${id}">Copy</button>`;
    const pages = {
      start: `${head}<p>Two players, two devices, no account. The host chooses the levels; the game runs between your browsers.</p>
        ${this.cfg.signalUrl
          ? `<button class="big" data-act="roomhost">Host a game</button><button class="big" data-act="roomjoin">Join with a room code</button>
             <p class="lb-note">No room service? <a href="#" data-act="host">host with codes</a> · <a href="#" data-act="join">join with codes</a></p>`
          : `<button class="big" data-act="host">Host a game</button><button class="big" data-act="join">Join a game</button>
             <p class="lb-note">You swap two long codes in any chat. For short room codes, set up the free room service (docs/online-setup.md) and enter its address under Settings.</p>`}
        <details class="lb-set"><summary>Settings</summary>
          <label>Room service<input id="lb-url" type="text" placeholder="https://lokki-rooms.you.workers.dev" value="${this.cfg.signalUrl}"></label>
          <label>Relay (optional)<textarea id="lb-relay" rows="3" placeholder='{"urls":"turn:…","username":"…","credential":"…"}'>${this.cfg.relayJson.replace(/</g, '&lt;')}</textarea></label>
          <button data-act="openrelay">Use a free public relay</button> <button data-act="savecfg">Save</button><span class="lb-status" id="lb-cfgstatus"></span>
        </details>
        <p class="lb-note">Connecting uses a public STUN server (Google's) to find your network address, only while setting up co-op. Single player never goes online.</p><button data-act="close">Close</button>`,
      roomhost: `${head}<p>Tell your friend this room code:</p><div class="lb-room" id="lb-room">······</div><button data-act="copyroom">Copy</button>
        <p class="lb-status">Making the room…</p><p class="lb-note">The game starts when your friend joins. Rooms last 10 minutes.</p><button data-act="back">Cancel</button>`,
      roomjoin: `${head}<p>Type the room code your friend gave you:</p><input id="lb-code" class="lb-code" type="text" maxlength="9" autocomplete="off" autocapitalize="characters" placeholder="K7QX2M">
        <button data-act="roomgo" class="big">Join</button><p class="lb-status">&nbsp;</p><button data-act="back">Back</button>`,
      host: `${head}<ol><li>Send this invite code to your friend:</li></ol>${copyRow('lb-invite')}
        <ol start="2"><li>Paste the answer code they send back:</li></ol><textarea id="lb-answer" rows="4" placeholder="LK1.…"></textarea>
        <button data-act="connect" class="big">Connect</button><p class="lb-status">Making your invite…</p><button data-act="back">Back</button>`,
      join: `${head}<ol><li>Paste the host's invite code:</li></ol><textarea id="lb-invite-in" rows="4" placeholder="LK1.…"></textarea>
        <button data-act="answer" class="big">Make my answer code</button>
        <ol start="2"><li>Send this answer code back to the host:</li></ol>${copyRow('lb-answer-out')}<p class="lb-status">&nbsp;</p><button data-act="back">Back</button>`,
      playing: `${head}<p>Playing with <b>${who}</b>.</p><p class="lb-note">${this.role === 'host' ? 'You pick the levels (L); your friend follows. Your progress is saved on your side.' : 'The host picks the levels and your game follows. Your own skills and looks stay yours.'}</p>
        <button data-act="leave">Leave the game</button><button data-act="close">Close</button>`,
    };
    this.el.innerHTML = pages[page];
  }

  private async click(t: HTMLElement): Promise<void> {
    const b = t.closest<HTMLElement>('[data-act]');
    if (!b) return;
    switch (b.dataset.act) {
      case 'close':
        this.hide();
        break;
      case 'back':
        this.reset();
        this.render('start');
        break;
      case 'leave':
        this.reset();
        this.hooks.onLeave();
        this.render('start');
        break;
      case 'copy': {
        const ta = this.q<HTMLTextAreaElement>(`#${b.dataset.for}`);
        ta.select();
        try {
          await navigator.clipboard.writeText(ta.value);
          this.setStatus('Copied. Paste it into your chat.');
        } catch {
          this.setStatus('Select the text and copy it by hand.');
        }
        break;
      }
      case 'openrelay':
        // a free community relay (Metered Open Relay); traffic is encrypted end to end, the relay only forwards it. Availability is not guaranteed.
        this.q<HTMLTextAreaElement>('#lb-relay').value = JSON.stringify([
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        ]);
        this.q<HTMLElement>('#lb-cfgstatus').textContent = 'Filled in. Press Save, on both devices.';
        break;
      case 'savecfg': {
        const url = this.q<HTMLInputElement>('#lb-url').value;
        const relay = this.q<HTMLTextAreaElement>('#lb-relay').value;
        const bad = parseIceServers(relay).error;
        const el = this.q<HTMLElement>('#lb-cfgstatus');
        if (bad) {
          el.textContent = bad;
          el.classList.add('bad');
          break;
        }
        this.cfg = { signalUrl: cleanSignalUrl(url), relayJson: relay.trim() };
        saveNetConfig(this.cfg);
        this.render('start');
        this.setStatus(this.cfg.signalUrl ? 'Saved. Room codes are on.' : 'Saved. Using copy-paste codes.');
        break;
      }
      case 'roomhost':
        await this.roomHost();
        break;
      case 'roomjoin':
        this.role = 'guest';
        this.render('roomjoin');
        break;
      case 'roomgo':
        await this.roomJoin(this.q<HTMLInputElement>('#lb-code').value);
        break;
      case 'copyroom':
        try {
          await navigator.clipboard.writeText(this.roomCode);
          this.setStatus('Copied.');
        } catch {
          this.setStatus('Select the code and copy it by hand.');
        }
        break;
      case 'host':
        this.role = 'host';
        this.render('host');
        this.wire(await this.newLink());
        try {
          this.q<HTMLTextAreaElement>('#lb-invite').value = await this.link!.createInvite();
          this.setStatus('Send the invite, then paste the answer you get back.');
        } catch (err) {
          this.setStatus(`Could not make an invite: ${(err as Error).message}`, true);
        }
        break;
      case 'connect':
        try {
          this.setStatus('Connecting…');
          await this.link!.acceptAnswer(this.q<HTMLTextAreaElement>('#lb-answer').value);
        } catch (err) {
          this.setStatus((err as Error).message, true);
        }
        break;
      case 'join':
        this.role = 'guest';
        this.render('join');
        this.wire(await this.newLink());
        break;
      case 'answer':
        try {
          this.setStatus('Making your answer…');
          this.q<HTMLTextAreaElement>('#lb-answer-out').value = await this.link!.acceptInvite(this.q<HTMLTextAreaElement>('#lb-invite-in').value);
          this.setStatus('Send this answer to the host. The game starts when they connect.');
        } catch (err) {
          this.setStatus((err as Error).message, true);
        }
        break;
    }
  }

  private async newLink(): Promise<PeerLink> {
    const { servers, warning } = await resolveIceServers(this.cfg);
    if (warning) this.setStatus(warning, true);
    return new PeerLink({ iceServers: servers });
  }

  /** Host with a room code: publish the invite, wait for the answer to appear. */
  private async roomHost(): Promise<void> {
    this.role = 'host';
    this.render('roomhost');
    const my = ++this.gen;
    const api = new SignalClient(this.cfg.signalUrl);
    try {
      const link = await this.newLink();
      if (my !== this.gen) return link.close();
      this.wire(link);
      const code = await api.createRoom(await link.createInvite());
      this.roomCode = code;
      this.q('#lb-room').textContent = code;
      this.setStatus('Waiting for your friend…');
      const answer = await api.waitForAnswer(code, () => my !== this.gen);
      if (answer && my === this.gen) {
        this.setStatus('Connecting…');
        await link.acceptAnswer(answer);
      }
      void api.closeRoom(code);
    } catch (err) {
      if (my === this.gen) this.setStatus((err as Error).message, true);
    }
  }

  /** Join with a room code: fetch the invite, post the answer. */
  private async roomJoin(typed: string): Promise<void> {
    const my = ++this.gen;
    const api = new SignalClient(this.cfg.signalUrl);
    try {
      this.setStatus('Looking for the room…');
      const link = await this.newLink();
      if (my !== this.gen) return link.close();
      this.wire(link);
      const offer = await api.getOffer(typed.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      const answer = await link.acceptInvite(offer);
      await api.postAnswer(typed.toUpperCase().replace(/[^A-Z0-9]/g, ''), answer);
      this.setStatus('Connecting to the host…');
    } catch (err) {
      this.reset();
      if (my === this.gen) this.setStatus((err as Error).message, true);
    }
  }

  private wire(link: PeerLink): void {
    this.closeLink();
    this.link = link;
    link.onOpen(() => {
      const l = this.link;
      if (!l || !this.role) return;
      this.hooks.onConnected(this.role, l);
      this.link = null; // the session owns it now
    });
    link.onState((s) => {
      if (this.link === link && !link.isOpen) this.setStatus(`Connecting… (${s})`);
    });
    link.onClose((why) => {
      if (this.link === link) this.setStatus(why || 'The connection closed.', true);
    });
  }

  private reset(): void {
    this.gen++;
    this.closeLink();
  }

  private closeLink(): void {
    this.link?.close();
    this.link = null;
  }
}

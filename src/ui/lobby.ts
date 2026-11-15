import { PeerLink, PUBLIC_STUN } from '../net/peer';

/**
 * The co-op lobby (N, or Options > Play with a friend). No server: the host makes an invite code, the friend pastes it and
 * sends back an answer code, the host pastes that, and the two browsers connect directly.
 */
export class Lobby {
  private el: HTMLElement;
  private link: PeerLink | null = null;
  private role: 'host' | 'guest' | null = null;

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
    this.el.addEventListener('click', (e) => this.click(e.target as HTMLElement));
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

  private render(page: 'start' | 'host' | 'join' | 'playing', who = ''): void {
    const head = '<h3>Play with a friend</h3>';
    const copyRow = (id: string) => `<textarea id="${id}" rows="4" readonly></textarea><button data-act="copy" data-for="${id}">Copy</button>`;
    const pages = {
      start: `${head}<p>Two players, two devices, no account. You swap two codes in any chat; the game then runs between your browsers. The host chooses the levels.</p>
        <button class="big" data-act="host">Host a game</button><button class="big" data-act="join">Join a game</button>
        <p class="lb-note">Connecting uses a public STUN server (Google's) to find your network address, only while setting up co-op. Single player never goes online.</p><button data-act="close">Close</button>`,
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
      case 'host':
        this.role = 'host';
        this.render('host');
        this.wire(new PeerLink({ iceServers: PUBLIC_STUN }));
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
        this.wire(new PeerLink({ iceServers: PUBLIC_STUN }));
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

  private wire(link: PeerLink): void {
    this.reset();
    this.link = link;
    link.onOpen(() => {
      const l = this.link;
      if (!l || !this.role) return;
      this.hooks.onConnected(this.role, l);
      this.link = null; // the session owns it now
    });
    link.onClose((why) => {
      if (this.link === link) this.setStatus(why || 'The connection closed.', true);
    });
  }

  private reset(): void {
    this.link?.close();
    this.link = null;
  }
}

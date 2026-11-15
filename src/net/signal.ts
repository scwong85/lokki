/** Client for the room service (`server/signal`): short room codes instead of two long copy-pasted ones. */
export class SignalError extends Error {}

export class SignalClient {
  constructor(private base: string, private fetchFn: typeof fetch = (...a) => fetch(...a)) {}

  private async call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    let r: Response;
    try {
      r = await this.fetchFn(`${this.base}${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new SignalError('Could not reach the room service. Check the address, or use the copy-paste codes.');
    }
    const data = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) throw new SignalError(data.error ?? `The room service said ${r.status}.`);
    return data;
  }

  /** Host: publish the invite, get the room code. */
  async createRoom(offer: string): Promise<string> {
    return (await this.call<{ code: string }>('/room', 'POST', { offer })).code;
  }

  /** Guest: fetch the invite for a typed room code. */
  async getOffer(code: string): Promise<string> {
    return (await this.call<{ offer: string }>(`/room/${encodeURIComponent(code)}`)).offer;
  }

  /** Guest: send the answer back. */
  async postAnswer(code: string, answer: string): Promise<void> {
    await this.call(`/room/${encodeURIComponent(code)}/answer`, 'POST', { answer });
  }

  /** Host: wait for the guest's answer (checks every `every` ms until `until()` says stop). Resolves null when stopped. */
  async waitForAnswer(code: string, until: () => boolean, every = 1500, sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): Promise<string | null> {
    while (!until()) {
      try {
        const { answer } = await this.call<{ answer: string | null }>(`/room/${encodeURIComponent(code)}/answer`);
        if (answer) return answer;
      } catch (e) {
        if (e instanceof SignalError && /No such room/.test(e.message)) throw e;
        /* a hiccup: try again */
      }
      await sleep(every);
    }
    return null;
  }

  async closeRoom(code: string): Promise<void> {
    await this.call(`/room/${encodeURIComponent(code)}`, 'DELETE').catch(() => undefined);
  }
}

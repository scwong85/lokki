import { expect, test } from '@playwright/test';
import { handle, type KVLike } from '../../server/signal/src/handler';

class MemKV implements KVLike {
  m = new Map<string, string>();
  async get(k: string) {
    return this.m.get(k) ?? null;
  }
  async put(k: string, v: string) {
    this.m.set(k, v);
  }
  async delete(k: string) {
    this.m.delete(k);
  }
}

test('online co-op with a short room code through the room service', async ({ browser }) => {
  test.setTimeout(420_000);
  const kv = new MemKV();
  const ctx = await browser.newContext();
  // the real room service code answers for a made-up address
  await ctx.route('https://rooms.test/**', async (route) => {
    const req = route.request();
    const res = await handle(new Request(req.url(), { method: req.method(), body: req.postData() ?? undefined }), { ROOMS: kv });
    await route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() });
  });
  await ctx.addInitScript(() => localStorage.setItem('lokki.net', JSON.stringify({ signalUrl: 'https://rooms.test', relayJson: '' })));
  const host = await ctx.newPage();
  const guest = await ctx.newPage();
  const errors: string[] = [];
  for (const p of [host, guest]) {
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('/?level=snack-attack&play');
    await p.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  }
  await host.keyboard.press('KeyN');
  await host.getByRole('button', { name: 'Host a game' }).click();
  await expect.poll(() => host.locator('#lb-room').textContent(), { timeout: 60_000 }).toMatch(/^[A-Z0-9]{6}$/);
  const code = (await host.locator('#lb-room').textContent())!;

  await guest.keyboard.press('KeyN');
  await guest.getByRole('button', { name: 'Join with a room code' }).click();
  await guest.locator('#lb-code').fill(code.toLowerCase());
  await guest.getByRole('button', { name: 'Join', exact: true }).click();

  const players = (p: typeof host) => p.evaluate(() => (window as unknown as { __lokki: { players: unknown[] } }).__lokki.players.length);
  await expect.poll(() => players(host), { timeout: 150_000 }).toBe(2);
  await expect.poll(() => players(guest), { timeout: 150_000 }).toBe(2);
  expect(errors).toEqual([]);
  await ctx.close();
});

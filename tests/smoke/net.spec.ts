import { expect, test } from '@playwright/test';

type L = { PeerLink: new () => Link };
type Link = {
  isOpen: boolean;
  createInvite: () => Promise<string>;
  acceptInvite: (c: string) => Promise<string>;
  acceptAnswer: (c: string) => Promise<void>;
  onMessage: (f: (m: unknown) => void) => void;
  onClose: (f: (why: string) => void) => void;
  send: (m: unknown) => boolean;
  close: () => void;
};

test('two browser pages connect with invite and answer codes, exchange messages, and see the other leave', async ({ browser }) => {
  test.setTimeout(240_000); // the headless software renderer keeps both pages very busy
  const ctx = await browser.newContext();
  const host = await ctx.newPage();
  const guest = await ctx.newPage();
  const errors: string[] = [];
  for (const p of [host, guest]) {
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('/');
    await p.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
    await p.evaluate(() => {
      const w = window as unknown as { __lokki: L; link: Link; got: unknown[]; why: string };
      w.link = new w.__lokki.PeerLink();
      w.got = [];
      w.why = '';
      w.link.onMessage((m) => w.got.push(m));
      w.link.onClose((why) => (w.why = why));
    });
  }
  const invite = await host.evaluate(() => (window as unknown as { link: Link }).link.createInvite());
  expect(invite.startsWith('LK1.')).toBe(true);
  const answer = await guest.evaluate((c) => (window as unknown as { link: Link }).link.acceptInvite(c), invite);
  expect(answer.startsWith('LK1.')).toBe(true);
  await host.evaluate((c) => (window as unknown as { link: Link }).link.acceptAnswer(c), answer);
  for (const p of [host, guest]) await expect.poll(() => p.evaluate(() => (window as unknown as { link: Link }).link.isOpen), { timeout: 90_000 }).toBe(true);
  // unreliable channel: send a few times until the message arrives
  await expect.poll(async () => {
    await host.evaluate(() => (window as unknown as { link: Link }).link.send({ t: 'ping', at: 1 }));
    await guest.evaluate(() => (window as unknown as { link: Link }).link.send({ t: 'pong', at: 2 }));
    await host.waitForTimeout(200);
    const a = await guest.evaluate(() => (window as unknown as { got: { t: string }[] }).got.some((m) => m.t === 'ping'));
    const b = await host.evaluate(() => (window as unknown as { got: { t: string }[] }).got.some((m) => m.t === 'pong'));
    return a && b;
  }, { timeout: 60_000 }).toBe(true);
  // the host leaves: the guest finds out
  await host.evaluate(() => (window as unknown as { link: Link }).link.close());
  await expect.poll(() => guest.evaluate(() => (window as unknown as { why: string }).why), { timeout: 90_000 }).not.toBe('');
  expect(errors).toEqual([]);
  await ctx.close();
});

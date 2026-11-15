import { expect, test } from '@playwright/test';

type P = { id: number; gull: { state: Record<string, number | string> }; input: { tap: (c: string) => void; setVirtual: (c: string, d: boolean) => void } };
type Lk = {
  players: P[];
  interaction: { beak: (id: number) => { carried: { def: { name: string } } | null }; props: { props: { type: string; heldBy: number | null; body: { translation: () => { x: number; y: number; z: number } } }[] } };
  snapshot: () => { gulls: { id: number; carry: number | null }[]; props: { id: number; by: number | null }[] };
};

test('?coop adds a second gull with its own beak, and the snapshot describes both', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    (window as unknown as { L: () => unknown }).L = () => (window as unknown as { __lokki: unknown }).__lokki;
  });
  await page.goto('/?coop');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { L: () => Lk }).L().players.length)).toBe(2);

  // put player 2 next to a loose bottle, facing it, and press its grab (as a gamepad would)
  await page.evaluate(() => {
    const L = (window as unknown as { L: () => Lk }).L();
    const b = L.interaction.props.props.find((p) => p.type === 'bottle' && p.heldBy === null)!.body.translation();
    Object.assign(L.players[1].gull.state, { x: b.x, y: 0.5, z: b.z + 1.8, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground' });
  });
  await page.waitForTimeout(800);
  await expect
    .poll(async () => {
      const name = await page.evaluate(() => (window as unknown as { L: () => Lk }).L().interaction.beak(1).carried?.def.name ?? null);
      if (name !== 'bottle') {
        await page.evaluate(() => (window as unknown as { L: () => Lk }).L().players[1].input.tap('KeyE'));
        await page.waitForTimeout(400);
      }
      return page.evaluate(() => (window as unknown as { L: () => Lk }).L().interaction.beak(1).carried?.def.name ?? null);
    }, { timeout: 20_000 })
    .toBe('bottle');
  expect(await page.evaluate(() => (window as unknown as { L: () => Lk }).L().interaction.beak(0).carried)).toBeNull(); // player 1's beak is empty

  // player 2 flaps on its own (held button)
  await page.evaluate(() => (window as unknown as { L: () => Lk }).L().players[1].input.setVirtual('Space', true));
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().players[1].gull.state.mode), { timeout: 15_000 }).toBe('air');
  await page.evaluate(() => (window as unknown as { L: () => Lk }).L().players[1].input.setVirtual('Space', false));

  const snap = await page.evaluate(() => (window as unknown as { L: () => Lk }).L().snapshot());
  expect(snap.gulls.map((g) => g.id)).toEqual([0, 1]);
  const carry = snap.gulls[1].carry!;
  expect(snap.props.find((p) => p.id === carry)?.by).toBe(1);
  expect(errors).toEqual([]);
});

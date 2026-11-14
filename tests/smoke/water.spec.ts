import { expect, test } from '@playwright/test';

type Lk = {
  gull: { state: Record<string, number | string | boolean> };
  interaction: { props: { props: { type: string; heldBy: number | null; body: { setTranslation: (v: object, w: boolean) => void; translation: () => { x: number; y: number; z: number } } }[] } };
};

test('the gull splashes down and swims on the sea, and dropped items float', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    (window as unknown as { L: () => unknown }).L = () => (window as unknown as { __lokki: unknown }).__lokki;
  });
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  // dive-speed drop onto open water: a splash, not a stunned crash
  await page.evaluate(() => {
    const s = (window as unknown as { L: () => Lk }).L().gull.state;
    Object.assign(s, { x: 40, y: 6, z: 60, vx: 0, vy: -14, vz: 0, mode: 'air' });
    const b = (window as unknown as { L: () => Lk }).L().interaction.props.props.find((p) => p.type === 'bottle' && p.heldBy === null)!;
    b.body.setTranslation({ x: 44, y: 1, z: 60 }, true);
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { L: () => Lk }).L().gull.state.mode), { timeout: 20_000 }).toBe('ground');
  const s = await page.evaluate(() => (window as unknown as { L: () => Lk }).L().gull.state);
  expect(s.overWater).toBe(true);
  expect(s.stunT).toBe(0);
  // the bottle floats at the surface instead of lying on the sea floor
  await page.waitForTimeout(2500);
  const y = await page.evaluate(() => (window as unknown as { L: () => Lk }).L().interaction.props.props.find((p) => p.type === 'bottle' && p.heldBy === null)!.body.translation().y);
  expect(y).toBeGreaterThan(0.12);
  expect(y).toBeLessThan(0.6);
  expect(errors).toEqual([]);
});

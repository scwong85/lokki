import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  gate: { arc: number; stage: number } | null;
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean }[] }[] };
  gull: { state: Record<string, unknown> };
  interaction: { updateGull: (id: number, s: unknown, i: unknown, dt: number, t: number) => { type: string }[]; carried: { tag?: string } | null; props: { props: { tag?: string }[] } };
};
const L = (page: Page) => <T, A = undefined>(fn: (l: Lk, a: A) => T, arg?: A) =>
  page.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as Promise<Awaited<T>>;
const done = (l: ReturnType<typeof L>, q: string, o: string) => l((x, a) => x.quests.quests.find((m) => m.id === a![0])!.objectives.find((m) => m.id === a![1])!.done, [q, o] as never);

test('stage 1.1: gated to flying and snatching, three objectives, the bun chain runs on real triggers', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a1s1&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  const l = L(page);
  expect(await l((x) => x.gate)).toEqual({ arc: 1, stage: 1 });
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['map', 'breakfast', 'neighbours']);
  // land by the bench: the first step of "Neighbours"
  await l((x) => { Object.assign(x.gull.state, { x: -10, y: 0.5, z: -13.4, vx: 0, vy: 0, vz: 0, heading: 0, mode: 'ground' }); return 0; });
  await expect.poll(() => done(l, 'neighbours', 'land'), { timeout: 20_000, intervals: [500] }).toBe(true);
  // pick up the bun (E)
  await page.waitForTimeout(1500);
  await page.keyboard.press('KeyE');
  await expect.poll(() => done(l, 'neighbours', 'bun'), { timeout: 20_000, intervals: [500] }).toBe(true);
  // over the ferry, let go
  await page.waitForTimeout(1500);
  await l((x) => { Object.assign(x.gull.state, { x: 0, y: 6, z: 7, vx: 0, vy: 0, vz: 0, mode: 'air' }); return 0; });
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');
  await expect.poll(() => done(l, 'neighbours', 'ferry'), { timeout: 30_000, intervals: [500] }).toBe(true);
  expect(errors).toEqual([]);
});

test('the level list puts the campaign first and the Playground after', async ({ page }) => {
  test.setTimeout(200_000);
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.goto('/?level=a1s1&play');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  await page.keyboard.press('KeyL');
  await expect(page.locator('#levelselect .ls-district').first()).toBeVisible();
  const heads = await page.locator('#levelselect .ls-district').allTextContents();
  expect(heads[0]).toContain('Act 1');
  expect(heads.some((h) => h.includes('Playground'))).toBe(true);
  expect(heads.some((h) => h.includes('Free play'))).toBe(true);
});

import { expect, test } from '@playwright/test';

const ev = <T>(page: import('@playwright/test').Page, js: string) => page.evaluate(`(() => { const l = window.__lokki; ${js} })()`) as Promise<T>;
const toRoof = (tag: string, dx: number) => `{ const p = l.interaction.props.props.find((q) => q.tag === '${tag}'); const n = l.npcs.npcs.find((m) => m.holding === p.id); if (n) n.holding = null; l.interaction.props.drop(p, { x: 0, y: 0, z: 0 }); p.byGull = true; p.body.setTranslation({ x: -14 + ${dx}, y: 5.4, z: -17 }, true); p.body.setLinvel({ x: 0, y: 0, z: 0 }, true); return 0; }`;

test('resume (M121): rows and a served course survive a reload; the flyover shows the next course; the report copies', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lokki-options-v1', JSON.stringify({ graphics: 'low', tutorialDone: true })));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?level=a1s1&play&flyover&resume');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  const row = (o: string) => ev<boolean>(page, `return l.quests.quests.find((q) => q.id === 'picnic').objectives.find((x) => x.id === '${o}').done;`);
  // two rows on the roof serve the first course: the flyover shows the second
  await ev(page, toRoof('selfieCone', -1));
  await expect.poll(() => row('cone'), { timeout: 60_000 }).toBe(true);
  await ev(page, toRoof('dockLunch', 1));
  await expect.poll(() => row('lunch'), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => ev<boolean>(page, 'return l.flyover.active;'), { timeout: 20_000 }).toBe(true);
  await page.screenshot({ path: 'tests/__screenshots__/flyover.png' });
  await page.keyboard.press('Space');
  await expect.poll(() => ev<boolean>(page, 'return l.flyover.active;'), { timeout: 20_000 }).toBe(false);
  // the report
  const report = await ev<string>(page, 'return l.copyReport();');
  expect(report).toContain('1.1 First Light (a1s1)');
  expect(report).toContain('rows 2/4');
  expect(report).toContain('flyovers skipped 1');
  // reload: the offer, then Continue
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  await expect(page.locator('#resume')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#resume')).toContainText('2 things on the roof');
  await page.locator('#resume [data-r=go]').click();
  await expect.poll(() => row('lunch'), { timeout: 20_000 }).toBe(true);
  expect(await row('cone')).toBe(true);
  expect(await ev<number>(page, 'return l.picnicGuests.count;')).toBe(2);
  await expect.poll(() => ev<boolean>(page, "return l.npcs.npcs.some((n) => n.role === 'passenger');"), { timeout: 20_000 }).toBe(true); // the ferry crowd came back
  // the second course goes on from there
  await ev(page, toRoof('thermos', 0));
  await expect.poll(() => row('thermos'), { timeout: 60_000 }).toBe(true);
  // R starts over: the saved run is gone
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(1500); // R is read on the next game step
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 120_000 });
  await page.waitForTimeout(2000);
  await expect(page.locator('#resume')).toBeHidden();
  expect(errors).toEqual([]);
});

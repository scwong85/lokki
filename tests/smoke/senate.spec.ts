import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type Lk = {
  quests: { quests: { id: string; status: string; objectives: { id: string; done: boolean; count: number }[] }[]; onEvent: (e: string) => unknown };
  bell: { clock: number; left: number };
  interaction: { props: { props: { type: string; tag?: string }[] } };
};
type Ask = <T>(fn: (l: Lk, a?: unknown) => T, arg?: unknown) => Promise<Awaited<T>>;
const lk = (p: Page): Ask => (fn, arg) => p.evaluate(([src, a]) => new Function('l', 'a', `return (${src})(l, a)`)((window as unknown as { __lokki: Lk }).__lokki, a), [fn.toString(), arg] as [string, unknown]) as never;
const open = async (page: Page, level: string) => {
  await page.goto(`/?level=${level}&play`);
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 90_000 });
  return lk(page);
};

test('S1: the cheese waits on the landing at the top of the steps', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const L = await open(page, 'cheese-run');
  expect(await L((l) => l.interaction.props.props.some((p) => p.type === 'cheese' && p.tag === 'cheese'))).toBe(true);
  expect(errors).toEqual([]);
});

test('S2: the photographers are in place and the level loads', async ({ page }) => {
  test.setTimeout(300_000);
  const L = await open(page, 'say-pigeon');
  expect(await L((l) => l.quests.quests.some((q) => q.id === 'photos'))).toBe(true);
});

test('S3: the bell rings on schedule', async ({ page }) => {
  test.setTimeout(400_000);
  const L = await open(page, 'ding-dong');
  expect(await L((l) => l.quests.quests.some((q) => q.id === 'bell'))).toBe(true);
  await expect.poll(() => L((l) => l.bell.clock), { timeout: 300_000 }).toBeGreaterThan(9);
  expect(await L((l) => l.bell.clock)).toBeGreaterThan(8); // past the first ring at 8 s
});

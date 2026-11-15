import { expect, test } from '@playwright/test';

type Lk = {
  level: string;
  notes: (n: unknown) => void;
  quests: { quests: { id: string; status: string }[]; onEvent: (e: string) => unknown; tick: (c: unknown) => unknown };
  skills: { ids: string[] };
  saveData: () => { levels: Record<string, { stars: boolean[]; best: number | null }> };
};
const L = (page: import('@playwright/test').Page) => <T>(fn: (l: Lk) => T) => page.evaluate((src) => new Function('l', `return (${src})(l)`)((window as unknown as { __lokki: Lk }).__lokki), fn.toString()) as Promise<T>;

test('a level loads from data, is cleared with stars and a skill, the record is saved, and the title shows it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?level=snack-stub');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  const l = L(page);
  expect(await l((x) => x.level)).toBe('snack-stub');
  expect(await l((x) => x.quests.quests.map((q) => q.id))).toEqual(['icecream', 'statuePerch', 'firstSplat']);
  await expect(page.locator('#todo')).toContainText('???'); // the secret to-do
  expect(await page.locator('#heat').count()).toBe(0); // a calm city: no heat meter

  // snack + escape, then the victory perch
  await l((x) => {
    x.notes(x.quests.onEvent('alert'));
    x.notes(x.quests.onEvent('snatch:icecream'));
    for (let i = 0; i < 400; i++) x.notes(x.quests.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 }));
    x.notes(x.quests.onEvent('statuePerch'));
    return 0;
  });
  await expect(page.locator('#levelcomplete')).toBeVisible();
  await expect(page.locator('#levelcomplete')).toContainText('★');
  const rec = await l((x) => x.saveData().levels['snack-stub']);
  expect(rec.stars[0]).toBe(true);
  expect(rec.stars[1]).toBe(false); // the secret is still undiscovered
  expect(await l((x) => x.skills.ids)).toContain('flight'); // the level's reward

  // the secret afterwards adds its star
  await l((x) => {
    x.notes(x.quests.onEvent('poopNpc'));
    return 0;
  });
  await expect.poll(() => l((x) => x.saveData().levels['snack-stub'].stars[1])).toBe(true);

  // the title screen's level select shows the stars and offers free play
  await page.goto('/?level=snack-stub&title');
  await page.waitForFunction(() => (window as unknown as { __lokkiReady?: boolean }).__lokkiReady === true, null, { timeout: 60_000 });
  await expect(page.locator('[data-level=snack-stub]')).toContainText('★★');
  await expect(page.locator('[data-level=sandbox]')).toContainText('free play');
  expect(errors).toEqual([]);
});

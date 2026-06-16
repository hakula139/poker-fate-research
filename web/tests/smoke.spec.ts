import { expect, test } from '@playwright/test';

test('loads generated player stats and filters players', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('poker-fate.locale', 'en');
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Player stats' })).toBeVisible();
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  await expect(page.getByText('2026-06-12 08:50 UTC', { exact: true })).toBeVisible();

  const firstUid = await page
    .locator('tbody tr')
    .first()
    .locator('td')
    .first()
    .locator('span')
    .innerText();
  await page.getByLabel('Search').fill(firstUid);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText(firstUid).first()).toBeVisible();
  await expect(page.getByText('#4 Throne Points · Last week')).toBeVisible();

  const omaha = page.getByRole('radio', { name: 'Omaha' });
  await omaha.click();
  await expect(omaha).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.getByRole('combobox', { name: 'Language' }).click();
  await page.getByRole('option', { name: '简体中文' }).click();
  await expect(page.getByRole('heading', { name: '玩家数据' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
});

import { expect, test } from '@playwright/test';

import { samplePlayers, sampleUpdatedAt } from './fixtures/sample-snapshot';

test('loads generated player stats and filters players', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('poker-fate.locale', 'en');
  });
  await page.route('**/api/players', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        players: samplePlayers,
        updatedAt: sampleUpdatedAt,
      },
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Player stats' })).toBeVisible();
  await expect(page.locator('tbody tr')).not.toHaveCount(0);

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
  await expect(page.getByText('Leaderboard ranks')).toBeVisible();
  await expect(page.getByText('Classic Winnings').first()).toBeVisible();
  await expect(page.getByText('#1')).toBeVisible();
  await expect(page.getByText('Current week').first()).toBeVisible();

  await expect(page.getByRole('radio', { name: 'Omaha' })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.getByRole('combobox', { name: 'Language' }).click();
  await page.getByRole('option', { name: '简体中文' }).click();
  await expect(page.getByRole('heading', { name: '玩家数据' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
});

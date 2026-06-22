import { expect, test } from '@playwright/test';

import { sampleSnapshot } from './fixtures/sample-snapshot';

test('loads generated player stats and filters players', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('poker-fate.locale', 'en');
  });
  await page.route('**/api/snapshots', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        generatedAt: sampleSnapshot.generatedAt,
        snapshots: [
          {
            id: sampleSnapshot.id,
            label: sampleSnapshot.label,
            playerCount: sampleSnapshot.players.length,
            source: sampleSnapshot.source,
            path: 'api/snapshots/sample',
          },
        ],
      },
    });
  });
  await page.route('**/api/snapshots/sample', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: sampleSnapshot,
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Player stats' })).toBeVisible();
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  await expect(page.getByText('Sample data').first()).toBeVisible();

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

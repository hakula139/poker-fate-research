import { expect, test } from '@playwright/test';

test('loads generated player stats and filters players', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Player stats' })).toBeVisible();
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  await expect(page.getByText('2026-06-12 08:50 UTC', { exact: true })).toBeVisible();

  const firstUid = await page.locator('tbody tr .player-button span').first().innerText();
  await page.getByLabel('Search').fill(firstUid);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText(firstUid).first()).toBeVisible();

  const omaha = page.getByRole('button', { name: 'Omaha' });
  await omaha.click();
  await expect(omaha).toHaveClass(/active-segment/);
});

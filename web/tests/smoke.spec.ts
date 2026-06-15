import { expect, test } from '@playwright/test';

test('loads generated player stats and filters players', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Player stats' })).toBeVisible();
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  await expect(page.getByText('2026-06-12 08:50 UTC', { exact: true })).toBeVisible();

  const firstUid = await page.locator('tbody tr').first().locator('td').first().locator('span').innerText();
  await page.getByLabel('Search').fill(firstUid);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText(firstUid).first()).toBeVisible();

  const omaha = page.getByRole('button', { name: 'Omaha' });
  await omaha.click();
  await expect(omaha).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

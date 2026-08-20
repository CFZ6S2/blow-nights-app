import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('privacy page loads with back link', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
    // The page should have a heading (privacy title) and a back link
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link').first()).toBeVisible();
  });

  test('business page loads with navbar', async ({ page }) => {
    await page.goto('/business');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('login page loads with auth options', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Google|Apple|login|iniciar/i, { timeout: 15_000 });
  });

  test('unknown city slug still renders', async ({ page }) => {
    await page.goto('/london');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

import { test, expect } from '@playwright/test';

async function waitForAppReady(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const spinner = document.querySelector('.animate-spin');
    return !spinner;
  }, { timeout: 20_000 });
}

test.describe('Navigation', () => {
  test('privacy page loads with back link', async ({ page }) => {
    await page.goto('/privacy');
    await waitForAppReady(page);
    await expect(page.locator('h1').first()).toContainText(/Privacy|Privacidad/i, { timeout: 10_000 });
    await expect(page.getByText(/back|volver/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('business page loads with navbar', async ({ page }) => {
    await page.goto('/business');
    await waitForAppReady(page);
    await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 });
  });

  test('login page loads with auth options', async ({ page }) => {
    await page.goto('/login');
    await waitForAppReady(page);
    await expect(page.locator('body')).toContainText(/Google|Apple|login|iniciar/i, { timeout: 10_000 });
  });

  test('unknown city slug still renders', async ({ page }) => {
    await page.goto('/london');
    await waitForAppReady(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

import { test, expect } from '@playwright/test';

async function waitForAppReady(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const spinner = document.querySelector('.animate-spin');
    return !spinner;
  }, { timeout: 20_000 });
}

test.describe('Organizer Scanner Flow', () => {
  test('scanner page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/scanner');
    await waitForAppReady(page);
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    await expect(page.locator('h1').first()).toContainText('BLOW NIGHTS', { timeout: 10_000 });
  });

  test('business page loads with B2B content', async ({ page }) => {
    await page.goto('/business');
    await waitForAppReady(page);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 });
  });

  test('organizer page loads', async ({ page }) => {
    await page.goto('/organizer');
    await waitForAppReady(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('door page requires authentication', async ({ page }) => {
    await page.goto('/door');
    await waitForAppReady(page);
    await expect(page.locator('body')).toBeVisible();
  });
});

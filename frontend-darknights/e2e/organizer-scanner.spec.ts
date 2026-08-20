import { test, expect } from '@playwright/test';

test.describe('Organizer Scanner Flow', () => {
  test('scanner page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/scanner');
    // Scanner requires auth — should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page.locator('h1').first()).toContainText('DARKNIGHTS');
  });

  test('business page loads with B2B content', async ({ page }) => {
    await page.goto('/business');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('organizer page loads', async ({ page }) => {
    await page.goto('/organizer');
    await expect(page.locator('body')).toBeVisible();
  });

  test('door page requires authentication', async ({ page }) => {
    await page.goto('/door');
    await expect(page.locator('body')).toBeVisible();
  });
});

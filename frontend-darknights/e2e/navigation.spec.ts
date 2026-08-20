import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('privacy page loads with back link', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1').first()).toContainText(/Privacy/i);
    await expect(page.getByText(/back/i).first()).toBeVisible();
  });

  test('business page loads with navbar', async ({ page }) => {
    await page.goto('/business');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('login page loads with auth options', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toContainText(/Google|Apple|login|iniciar/i);
  });

  test('unknown city slug still renders', async ({ page }) => {
    await page.goto('/london');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

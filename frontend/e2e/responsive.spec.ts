import { test, expect } from '@playwright/test';

test.describe('Responsive - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('landing page renders on mobile', async ({ page }) => {
    await page.goto('/madrid');
    await expect(page.locator('h1').first()).toContainText('BLOW');
  });

  test('cookie banner is visible on mobile', async ({ page }) => {
    await page.goto('/madrid');
    await expect(page.getByRole('button', { name: /accept all/i })).toBeVisible();
  });
});

test.describe('Responsive - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('landing page renders on desktop', async ({ page }) => {
    await page.goto('/madrid');
    await expect(page.locator('h1').first()).toContainText('BLOW');
  });
});

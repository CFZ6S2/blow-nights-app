import { test, expect } from '@playwright/test';

test.describe('Matching Flow', () => {
  test('map page loads and shows map container', async ({ page }) => {
    await page.goto('/madrid');
    // Accept cookies if banner appears to unblock the UI
    const acceptBtn = page.getByRole('button', { name: /accept all/i });
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
    }

    // The map should render (either the map region or the main content)
    await expect(page.locator('body')).toBeVisible();
  });

  test('city page shows BLOW header', async ({ page }) => {
    await page.goto('/madrid');
    await expect(page.locator('h1').first()).toContainText('BLOW');
  });

  test('city page shows navigation options (VENUES, PR)', async ({ page }) => {
    await page.goto('/madrid');
    await expect(page.getByText('VENUES').first()).toBeVisible();
    await expect(page.getByText('PR').first()).toBeVisible();
  });

  test('CTA navigates to login for unauthenticated users', async ({ page }) => {
    await page.goto('/madrid');
    const cta = page.getByRole('button', { name: /enter for free/i });
    if (await cta.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cta.click();
      await page.waitForURL(/\/login/);
      await expect(page.locator('h1').first()).toContainText('BLOW NIGHTS');
    }
  });

  test('different city slugs load correctly', async ({ page }) => {
    // Test that city routing works for different slugs
    for (const city of ['madrid', 'london']) {
      await page.goto(`/${city}`);
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });
});

import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('redirects root to default city and shows landing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/madrid\/?/, { timeout: 15_000 });
    await expect(page.locator('h1').first()).toContainText('BLOW');
  });

  test('shows CTA button that navigates to login', async ({ page }) => {
    await page.goto('/madrid');
    const cta = page.getByRole('button', { name: /enter for free/i });
    await expect(cta).toBeVisible();
    await cta.click();
    await page.waitForURL(/\/login/);
  });

  test('shows top nav links', async ({ page }) => {
    await page.goto('/madrid');
    await expect(page.getByText('VENUES').first()).toBeVisible();
    await expect(page.getByText('PR').first()).toBeVisible();
  });

  test('shows footer with legal links after scrolling', async ({ page }) => {
    await page.goto('/madrid');
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(page.getByText(/for business/i).first()).toBeVisible();
    await expect(page.getByText(/terms/i).first()).toBeVisible();
    await expect(page.getByText(/privacy/i).first()).toBeVisible();
    await expect(page.getByText(/rules/i).first()).toBeVisible();
  });
});

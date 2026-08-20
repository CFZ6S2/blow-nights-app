import { test, expect } from '@playwright/test';

async function waitForAppReady(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const spinner = document.querySelector('.animate-spin');
    return !spinner;
  }, { timeout: 20_000 });
}

test.describe('Landing Page', () => {
  test('redirects root to default city and shows landing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/madrid\/?/, { timeout: 15_000 });
    await waitForAppReady(page);
    await expect(page.locator('h1').first()).toContainText('BLOW');
  });

  test('shows CTA button that navigates to login', async ({ page }) => {
    await page.goto('/madrid');
    await waitForAppReady(page);
    const cta = page.getByRole('button', { name: /enter for free|entrar gratis|entra gratis/i });
    await expect(cta).toBeVisible({ timeout: 10_000 });
    await cta.click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('shows top nav links', async ({ page }) => {
    await page.goto('/madrid');
    await waitForAppReady(page);
    await expect(page.getByText('VENUES').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('PR').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows footer with legal links after scrolling', async ({ page }) => {
    await page.goto('/madrid');
    await waitForAppReady(page);
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(page.getByText(/for business|empresas/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/terms|términos/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/privacy|privacidad/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/rules|normas/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

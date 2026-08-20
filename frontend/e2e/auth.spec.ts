import { test, expect } from '@playwright/test';

async function waitForAppReady(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const spinner = document.querySelector('.animate-spin');
    return !spinner;
  }, { timeout: 20_000 });
}

test.describe('Auth Flow', () => {
  test('login page shows BLOW NIGHTS branding', async ({ page }) => {
    await page.goto('/login');
    await waitForAppReady(page);
    await expect(page.locator('h1').first()).toContainText('BLOW NIGHTS', { timeout: 10_000 });
  });

  test('login page shows Google and Apple buttons (disabled by default)', async ({ page }) => {
    await page.goto('/login');
    await waitForAppReady(page);

    const googleBtn = page.getByRole('button', { name: /google/i });
    const appleBtn = page.getByRole('button', { name: /apple/i });
    await expect(googleBtn).toBeVisible({ timeout: 10_000 });
    await expect(appleBtn).toBeVisible({ timeout: 10_000 });

    await expect(googleBtn).toBeDisabled();
    await expect(appleBtn).toBeDisabled();
  });

  test('age confirmation checkbox enables auth buttons', async ({ page }) => {
    await page.goto('/login');
    await waitForAppReady(page);

    const checkbox = page.getByRole('checkbox');
    await expect(checkbox).toBeVisible({ timeout: 10_000 });
    await checkbox.check();

    const googleBtn = page.getByRole('button', { name: /google/i });
    const appleBtn = page.getByRole('button', { name: /apple/i });
    await expect(googleBtn).toBeEnabled();
    await expect(appleBtn).toBeEnabled();
  });

  test('login page shows trust badges (Seguro, Privado, Real)', async ({ page }) => {
    await page.goto('/login');
    await waitForAppReady(page);
    await expect(page.getByText('Seguro')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Privado')).toBeVisible();
    await expect(page.getByText('Real')).toBeVisible();
  });

  test('login page has links to Terms and Privacy', async ({ page }) => {
    await page.goto('/login');
    await waitForAppReady(page);
    const termsLink = page.getByRole('link', { name: /términos/i });
    const privacyLink = page.getByRole('link', { name: /privacidad/i });
    await expect(termsLink).toBeVisible({ timeout: 10_000 });
    await expect(privacyLink).toBeVisible();

    await expect(termsLink).toHaveAttribute('href', /\/terms\/?/);
    await expect(privacyLink).toHaveAttribute('href', /\/privacy\/?/);
  });

  test('root redirects to default city', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/madrid\/?/, { timeout: 15_000 });
  });
});

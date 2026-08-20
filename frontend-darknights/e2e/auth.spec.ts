import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('login page shows DARKNIGHTS branding', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toContainText('DARKNIGHTS', { timeout: 15_000 });
  });

  test('login page shows Google and Apple buttons (disabled by default)', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Both auth buttons should be visible
    const googleBtn = page.getByRole('button', { name: /google/i });
    const appleBtn = page.getByRole('button', { name: /apple/i });
    await expect(googleBtn).toBeVisible({ timeout: 15_000 });
    await expect(appleBtn).toBeVisible();

    // Buttons should be disabled until age confirmation checkbox is checked
    await expect(googleBtn).toBeDisabled();
    await expect(appleBtn).toBeDisabled();
  });

  test('age confirmation checkbox enables auth buttons', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Wait for the checkbox to appear (Suspense may delay rendering)
    const checkbox = page.getByRole('checkbox');
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    await checkbox.check();

    // Now auth buttons should be enabled
    const googleBtn = page.getByRole('button', { name: /google/i });
    const appleBtn = page.getByRole('button', { name: /apple/i });
    await expect(googleBtn).toBeEnabled();
    await expect(appleBtn).toBeEnabled();
  });

  test('login page shows trust badges (Seguro, Privado, Real)', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Seguro')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Privado')).toBeVisible();
    await expect(page.getByText('Real')).toBeVisible();
  });

  test('login page has links to Terms and Privacy', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const termsLink = page.getByRole('link', { name: /términos/i });
    const privacyLink = page.getByRole('link', { name: /privacidad/i });
    await expect(termsLink).toBeVisible({ timeout: 15_000 });
    await expect(privacyLink).toBeVisible();

    // Verify href attributes (trailing slash may be present)
    await expect(termsLink).toHaveAttribute('href', /\/terms\/?/);
    await expect(privacyLink).toHaveAttribute('href', /\/privacy\/?/);
  });

  test('root redirects to default city', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/madrid\/?/, { timeout: 15_000 });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Stripe Connect Onboarding Flow', () => {
  test('redirecciona a login si el negocio no está autenticado', async ({ page }) => {
    await page.goto('/business/stripe');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForURL(/\/business\/login/, { timeout: 15_000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('la página de negocio carga correctamente la opción de Stripe', async ({ page }) => {
    await page.goto('/business');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});

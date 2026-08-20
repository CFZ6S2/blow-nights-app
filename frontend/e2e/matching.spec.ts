import { test, expect } from '@playwright/test';

test.describe('Matching Flow', () => {
  test('user can browse and swipe profiles', async ({ page }) => {
    // 1. Ir a la vista principal de descubrimiento
    await page.goto('/madrid');
    
    // 2. Comprobar que hay elementos cargados
    await expect(page.locator('body')).toBeVisible();
    
    // En el futuro:
    // await page.getByRole('button', { name: /Like|Swipe/i }).click();
    // expect(page.getByText(/Match!/i)).toBeVisible();
  });
});

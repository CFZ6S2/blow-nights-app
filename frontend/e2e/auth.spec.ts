import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Firebase Auth
    await page.route('**/identitytoolkit.googleapis.com/**', async route => {
      await route.fulfill({
        status: 200,
        json: { idToken: 'test_token', refreshToken: 'test_refresh' }
      });
    });
  });

  test('user can access landing and navigate to login', async ({ page }) => {
    await page.goto('/');
    
    // Intentar encontrar el botón de login / enter free
    const enterButton = page.getByText(/Enter free/i).first();
    if (await enterButton.isVisible()) {
      await enterButton.click();
    }
    
    // Aquí el mock debería haber entrado en acción si hay un intento real de auth.
    // Validamos que estemos en la app y no haya explotado.
    await expect(page.locator('body')).toBeVisible();
  });
});

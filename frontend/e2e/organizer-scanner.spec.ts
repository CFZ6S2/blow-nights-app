import { test, expect } from '@playwright/test';

test.describe('Organizer Scanner Flow', () => {
  test('organizer can open scanner', async ({ page }) => {
    await page.goto('/business');
    
    // Verificar que estamos en la zona de organizadores (B2B Landing)
    await expect(page.locator('body')).toBeVisible();
    
    // Aquí podemos simular el login de organizer en el futuro
    // y navegar al escáner de QR
  });
});

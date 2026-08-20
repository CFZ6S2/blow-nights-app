import { test, expect } from '@playwright/test';

test.describe('Cookie Consent', () => {
  test('shows cookie banner on first visit', async ({ page }) => {
    await page.goto('/madrid', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /accept all/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /essential only/i })).toBeVisible();
  });

  test('accept all hides banner and stores consent', async ({ page }) => {
    await page.goto('/madrid', { waitUntil: 'domcontentloaded' });
    const acceptBtn = page.getByRole('button', { name: /accept all/i });
    await acceptBtn.click();
    await expect(acceptBtn).toBeHidden();

    const consent = await page.evaluate(() => localStorage.getItem('cookie_consent'));
    expect(consent).toBe('accepted');
  });

  test('essential only hides banner and stores consent', async ({ page }) => {
    await page.goto('/madrid', { waitUntil: 'domcontentloaded' });
    const rejectBtn = page.getByRole('button', { name: /essential only/i });
    await rejectBtn.click();
    await expect(rejectBtn).toBeHidden();

    const consent = await page.evaluate(() => localStorage.getItem('cookie_consent'));
    expect(consent).toBe('rejected');
  });

  test('banner stays hidden after consent', async ({ page }) => {
    await page.goto('/madrid', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.setItem('cookie_consent', 'accepted'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /accept all/i })).toBeHidden();
  });
});

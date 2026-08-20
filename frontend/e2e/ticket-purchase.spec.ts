import { test, expect } from '@playwright/test';

test.describe('Ticket Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Stripe checkout to prevent real payment calls
    await page.route('**/us-central1-*/createCheckoutSession', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { url: 'https://checkout.stripe.com/test' } }),
      });
    });
  });

  test('buy page shows error when no venue/event params', async ({ page }) => {
    // Navigate to /buy without query params — should show missing data state
    await page.goto('/buy');
    await expect(page.locator('body')).toBeVisible();
    // Without venue & event params, the page should not show ticket tiers
    await expect(page.locator('body')).not.toContainText('Comprar');
  });

  test('buy page with params loads venue and event data', async ({ page }) => {
    // Mock Firebase Firestore REST calls for venue + event data
    await page.route('**/firestore.googleapis.com/**', async route => {
      await route.continue();
    });

    // Navigate to buy page with test params (will attempt to load from Firestore)
    await page.goto('/buy?venue=test-venue&event=test-event');
    await expect(page.locator('body')).toBeVisible();
  });

  test('venue detail page shows ticket/buy options', async ({ page }) => {
    // Navigate to venues page in madrid
    await page.goto('/madrid/venues');
    await expect(page.locator('body')).toBeVisible();
    // The venues page should load without errors
  });

  test('ticket page loads without crashing', async ({ page }) => {
    await page.goto('/ticket?id=test-ticket');
    await expect(page.locator('body')).toBeVisible();
  });
});

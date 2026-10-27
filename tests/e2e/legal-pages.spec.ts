import { test, expect } from '@playwright/test';

for (const path of ['/privacy', '/terms']) {
  test(`${path} shows a last updated date`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main')).toContainText(/Last updated: \d{1,2} [A-Z][a-z]+ \d{4}/);
  });
}

test.describe('Privacy policy', () => {
  test('covers collection, sharing, retention, rights and EU/UK visitors', async ({ page }) => {
    await page.goto('/privacy');
    for (const heading of [
      'What we collect',
      'Who we share it with',
      'How long we keep it',
      'Your choices and rights',
      'If you are in the EU or UK',
    ]) {
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
    }
  });

  test('names the services that receive data, and says analytics are self-hosted with no cookies', async ({ page }) => {
    await page.goto('/privacy');
    const main = page.locator('main');
    await expect(main).toContainText('HubSpot');
    await expect(main).toContainText('Stripe');
    await expect(main).toContainText('analytics that run on our own server');
    await expect(main).toContainText('They use no cookies');
    // Self-hosted tools that receive nothing from third parties aren't named (decided 27 Oct 2026).
    await expect(main).not.toContainText('Umami');
  });

  test('says how to see or delete your information and where to complain', async ({ page }) => {
    await page.goto('/privacy');
    const main = page.locator('main');
    await expect(main).toContainText('ask us to delete it');
    await expect(main).toContainText('Office of the Australian Information Commissioner');
  });
});

test.describe('Terms', () => {
  test('covers ordering, price, turnaround, transit, refunds and the tournament clause', async ({ page }) => {
    await page.goto('/terms');
    for (const heading of [
      'Ordering and assessment',
      'Price and payment',
      'Turnaround',
      'Sending and returning paddles',
      'Cancellations, refunds and problems',
    ]) {
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
    }
    await expect(page.locator('main')).toContainText('not allowed in sanctioned tournaments');
  });

  test('states A$60 plus return postage, payment after assessment and no GST', async ({ page }) => {
    await page.goto('/terms');
    const main = page.locator('main');
    await expect(main).toContainText('A$60 per paddle');
    await expect(main).toContainText('plus return postage');
    await expect(main).toContainText('after we accept your paddle and before you post it');
    await expect(main).toContainText('our prices do not include GST');
    await expect(main).toContainText('within 10 business days');
  });
});

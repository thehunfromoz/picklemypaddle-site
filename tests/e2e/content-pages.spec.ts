import { test, expect } from '@playwright/test';

test.describe('About page', () => {
  test('tells the "Pickled, not retired." story', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Pickled, not retired.', level: 2 })).toBeVisible();
  });
});

test.describe('FAQ', () => {
  test('has a question for each thing customers ask before ordering', async ({ page }) => {
    await page.goto('/faq');
    const questions = await page.locator('summary').allInnerTexts();
    const covers = (re: RegExp) => questions.some((q) => re.test(q));

    expect(covers(/how long/i), 'turnaround').toBe(true);
    expect(covers(/how do i pay/i), 'payment').toBe(true);
    expect(covers(/postage/i), 'postage').toBe(true);
    expect(covers(/track/i), 'private status link').toBe(true);
    expect(covers(/tournament/i), 'tournament legality').toBe(true);
    expect(covers(/can.t be re-gritted/i), 'paddle that cannot be re-gritted').toBe(true);
  });

  test('says payment comes after the photo check', async ({ page }) => {
    await page.goto('/faq');
    await expect(
      page.locator('details', { hasText: 'only pay after we have checked your photos' }),
    ).toHaveCount(1);
  });

  test('answers match the landing page: A$60, 10 business days, 1 business day', async ({ page }) => {
    await page.goto('/faq');
    const answers = page.locator('details');
    await expect(answers.filter({ hasText: 'A$60 per paddle' })).toHaveCount(1);
    await expect(answers.filter({ hasText: 'within 10 business days' })).toHaveCount(1);
    await expect(answers.filter({ hasText: 'within 1 business day' })).toHaveCount(1);
  });
});

test.describe('Clubs page', () => {
  test('lists the payment options and keeps the commission off the page', async ({ page }) => {
    await page.goto('/clubs');
    const main = page.locator('main');
    await expect(main).toContainText('PayID');
    await expect(main).toContainText('Stripe invoice');
    await expect(main).toContainText('cash on delivery');
    await expect(main).not.toContainText(/commission|10%/i);
  });

  test('explains how to request an intro by email', async ({ page }) => {
    await page.goto('/clubs');
    await expect(
      page.locator('main').getByRole('link', { name: 'Email us about your club' }),
    ).toHaveAttribute('href', /^mailto:sales@picklemypaddle\.com/);
  });
});

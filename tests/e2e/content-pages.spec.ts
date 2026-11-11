import { test, expect } from '@playwright/test';

test.describe('About page', () => {
  test('tells the "Pickled, not retired." story', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Pickled, not retired.', level: 2 })).toBeVisible();
  });

  test('tells who runs it, with the sound-bites standing out', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Who we are', level: 2 })).toBeVisible();
    await expect(
      page.locator('main strong', { hasText: /engineer who fell into the world of pickleball/ }),
    ).toHaveCount(1);
    for (const heading of ['Rescuing your trusted paddle from landfill', 'A premium service for fellow players']) {
      await expect(page.getByRole('heading', { name: heading, level: 3 })).toBeVisible();
    }
  });

  test('keeps the tournament disclaimer', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('main')).toContainText('official tournaments');
  });
});

test.describe('Added weight estimate', () => {
  // The figure is an estimate until measured (SCRUM-30 review). Update both pages together.
  test('About and FAQ quote the same estimate', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('main')).toContainText('about 20 grams');
    await page.goto('/faq');
    await expect(page.locator('details', { hasText: 'about 20 grams' })).toHaveCount(1);
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
    await expect(main).toContainText('card');
    await expect(main).not.toContainText('Stripe invoice');
    await expect(main).toContainText('agree a short written club agreement by email');
    await expect(main).not.toContainText('sign a short written club agreement');
    await expect(main).toContainText('PayID, card or cash');
    await expect(main).not.toContainText(/commission|10%/i);
  });

  test('offers pickup or post, and no longer says pickups only or "no postage" (UAT 10 Nov 2026)', async ({ page }) => {
    await page.goto('/clubs');
    const main = page.locator('main');
    await expect(main).toContainText('post a box');
    await expect(main).toContainText('box we supply');
    await expect(main).toContainText('6 paddles or more');
    await expect(main).not.toContainText('Return postage on us');
    await expect(main).not.toContainText(/no postage|without anyone posting/i);
    await expect(main).not.toContainText('How club pickups work');
    await page.goto('/faq');
    await expect(page.locator('details', { hasText: 'Can my club organise paddles' })).toContainText('posts a box');
  });

  test('shows the local pickup area map with its alt text, and its suburbs (SCRUM-102)', async ({ page }) => {
    await page.goto('/clubs');
    await expect(page.getByRole('heading', { name: 'Local pickup and drop-off area' })).toBeVisible();
    const map = page.getByTestId('service-area-map');
    // The list's version is in the URL, so a browser that cached an older map fetches the new one.
    await expect(map).toHaveAttribute('src', /^\/images\/service-area\.svg\?v=2026-11-11-launch-35$/);
    await expect(map).toHaveAttribute('alt', 'Map of the PickleMyPaddle local pickup and drop-off area, covering northern and central Sydney, including the north shore, the northern beaches and the Hills.');
    await expect(map).toHaveAttribute('width', '1000');
    await expect(map).toHaveAttribute('height', '940');
    await expect(map).toHaveAttribute('loading', 'lazy');
    await map.scrollIntoViewIfNeeded();
    expect(await map.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page.getByTestId('service-area-suburbs').locator('li').filter({ hasText: 'Hornsby 2077' })).toHaveCount(1);
    await expect(page.locator('main')).toContainText('Clubs outside it use post');
    // The postage allowance is for the club's postage TO us, shown with posting, not with the return.
    await expect(page.locator('main')).toContainText('On boxes of 6 paddles or more, we take the standard cost of that postage off your invoice.');
    await expect(page.locator('main')).toContainText('The standard cost of posting to us off your invoice');
    await expect(page.locator('main')).toContainText('Get in touch anyway');
  });

  test('explains how to request an intro by email', async ({ page }) => {
    await page.goto('/clubs');
    await expect(
      page.locator('main').getByRole('link', { name: 'Email us about your club' }),
    ).toHaveAttribute('href', /^mailto:sales@picklemypaddle\.com/);
  });
});

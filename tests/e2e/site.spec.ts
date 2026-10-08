import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/about', '/faq', '/clubs', '/blog', '/privacy', '/terms'];

test.describe('Every page', () => {
  for (const path of pages) {
    test(`${path} loads with one h1, a title and no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(e.message));

      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/Pickle My Paddle/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test(`${path} has no WCAG 2.2 AA accessibility violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  test('unknown pages return the custom 404', async ({ page }) => {
    const res = await page.goto('/no-such-page');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('gone missing');
  });
});

test.describe('Landing page', () => {
  test('shows every section in order', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('main section[id]').evaluateAll((els) => els.map((e) => e.id));
    // Gallery and testimonials stay hidden until there's real content (3+ each).
    expect(ids).toEqual(['how-it-works', 'pricing', 'order']);
  });

  test('shows no placeholders to visitors', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.placeholder')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('[To confirm');
  });

  test('states the turnaround, reply time and what the price covers', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#pricing')).toContainText('per paddle, both faces');
    await expect(page.locator('#how-it-works')).toContainText('within 10 business days');
    await expect(page.locator('#order')).toContainText('within 1 business day');
  });

  test('tells tournament players re-gritted paddles are not tournament-approved', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('tournament-note')).toContainText('sanctioned tournaments');
  });

  test('hides nav links to sections that are not shown yet', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header a[href="/#gallery"]')).toHaveCount(0);
  });

  test('order call-to-action jumps to the order form', async ({ page }) => {
    await page.goto('/');
    await page.locator('main').getByRole('link', { name: 'Send in your paddle' }).first().click();
    await expect(page).toHaveURL(/#order$/);
    await expect(page.getByRole('heading', { name: 'Send in your paddle', level: 2 })).toBeInViewport();
  });

  test('shows the A$60 price', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#pricing')).toContainText('A$60');
  });
});

test.describe('Mobile order bar', () => {
  test('is one tap away on phones and steps aside at the order form', async ({ page, isMobile }) => {
    await page.goto('/');
    const bar = page.getByTestId('mobile-order-bar');
    if (!isMobile) {
      await expect(bar).toBeHidden();
      return;
    }
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Send in your paddle' })).toBeInViewport();
    await page.locator('#order').scrollIntoViewIfNeeded();
    await expect(bar).toHaveClass(/is-hidden/);
  });

  test('does not cover the end of the page on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');
    await page.goto('/faq');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footerBottom = await page.locator('footer').evaluate((f) => f.getBoundingClientRect().bottom);
    const barTop = await page.getByTestId('mobile-order-bar').evaluate((b) => b.getBoundingClientRect().top);
    expect(footerBottom).toBeLessThanOrEqual(barTop + 1);
  });
});

test.describe('Order form (client-side)', () => {
  test('empty submit lists errors and focuses the first field', async ({ page }) => {
    await page.goto('/#order');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.locator('#form-status')).toContainText('Please fix');
    await expect(page.locator('#name')).toBeFocused();
    await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#email-error')).toBeVisible();
  });

  test('adding and removing paddles updates the estimate', async ({ page }) => {
    await page.goto('/#order');
    await expect(page.locator('#estimate')).toHaveText('A$60');
    await page.getByRole('button', { name: '+ Add another paddle' }).click();
    await expect(page.locator('fieldset.paddle')).toHaveCount(2);
    await expect(page.locator('#estimate')).toHaveText('A$120');
    await page.getByRole('button', { name: 'Remove this paddle' }).first().click();
    await expect(page.locator('fieldset.paddle')).toHaveCount(1);
    await expect(page.locator('#estimate')).toHaveText('A$60');
  });

  test('a complete form passes validation', async ({ page }) => {
    await page.goto('/#order');
    await page.fill('#name', 'Test Player');
    await page.fill('#email', 'test@example.com');
    await page.fill('#street', '1 Court St');
    await page.fill('#suburb', 'Sydney');
    await page.selectOption('#state', 'NSW');
    await page.fill('#postcode', '2000');
    await page.fill('#paddles-0-brand', 'Test brand');
    const png = { name: 'face.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') };
    await page.setInputFiles('#paddles-0-front', png);
    await page.setInputFiles('#paddles-0-back', png);
    await page.check('#consent');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.locator('#form-status')).not.toContainText('Please fix');
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  });
});

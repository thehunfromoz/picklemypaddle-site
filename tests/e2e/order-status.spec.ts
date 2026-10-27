import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TOKEN, WCAG } from './helpers/orders';

// The private status page (SCRUM-70), against a mocked service. The token travels in the URL
// fragment and a POST body only: never in a request URL.

const view = {
  reference: 'PMP-ABCDE',
  status: 'submitted',
  statusLabel: 'Received: we’re checking your photos',
  history: [{ status: 'submitted', label: 'Received: we’re checking your photos', at: '2026-10-26T01:00:00.000Z' }],
  paddles: [{ brand: 'Selkirk', model: 'Vanguard Power Air' }, { brand: 'Homemade', model: null }],
  trackingNumber: null,
  backInPostBy: null,
  queuePosition: null,
  test: true,
};

test.describe('Order status page', () => {
  test('shows the order from its private link, with the TEST banner', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    let body: unknown;
    await page.route('**/api/orders/status', async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ json: view, headers: { 'Cache-Control': 'no-store' } });
    });
    await page.goto(`/order/status#${TOKEN}`);
    await expect(page.getByTestId('status-reference')).toHaveText('PMP-ABCDE');
    await expect(page.getByTestId('status-label')).toHaveText('Received: we’re checking your photos');
    await expect(page.getByTestId('status-test')).toBeVisible();
    await expect(page.getByTestId('status-paddles').locator('li')).toHaveText(['Selkirk Vanguard Power Air', 'Homemade']);
    await expect(page.getByTestId('status-history').locator('li')).toHaveCount(1);
    await expect(page.getByTestId('status-history')).toContainText('26 Oct 2026');
    expect(body).toEqual({ token: TOKEN });
    // The token never appears in any request URL (so never in logs, analytics or a Referer).
    expect(urls.filter((u) => u.includes(TOKEN))).toEqual([]);
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('an unknown or expired link: one message and the "email me my links" form', async ({ page }) => {
    await page.route('**/api/orders/status', (route) =>
      route.fulfill({ status: 404, json: { error: 'invalid_link', message: 'This link isn’t valid or has expired.' } }),
    );
    let asked: unknown;
    await page.route('**/api/orders/links', async (route) => {
      asked = route.request().postDataJSON();
      await route.fulfill({ status: 202, json: { message: 'If we have orders for that address, we’ve emailed the links.' } });
    });
    await page.goto(`/order/status#${TOKEN}`);
    await expect(page.getByTestId('status-invalid')).toBeVisible();
    await expect(page.getByTestId('status-view')).toBeHidden();
    await page.fill('#links-email', 'player@test.picklemypaddle.com');
    await page.getByRole('button', { name: 'Email me my links' }).click();
    await expect(page.getByTestId('links-status')).toHaveText('If we have orders for that address, we’ve emailed the links.');
    expect(asked).toEqual({ email: 'player@test.picklemypaddle.com' });
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('a malformed or missing token never calls the service', async ({ page }) => {
    let called = false;
    await page.route('**/api/orders/status', async (route) => {
      called = true;
      await route.abort();
    });
    for (const path of ['/order/status', '/order/status#short']) {
      await page.goto(path);
      await expect(page.getByTestId('status-invalid')).toBeVisible();
    }
    expect(called).toBe(false);
  });

  test('checks the email address before asking', async ({ page }) => {
    await page.goto('/order/status');
    await page.fill('#links-email', 'nope');
    await page.getByRole('button', { name: 'Email me my links' }).click();
    await expect(page.locator('#links-email-error')).toHaveText('Enter a valid email address.');
    await expect(page.locator('#links-email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('is noindex and sends no Referer; not cached when served by Caddy', async ({ page, request }) => {
    await page.goto('/order/status');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    test.skip(!process.env.BASE_URL, 'response headers come from the image\'s Caddy (deploy/Caddyfile)');
    const res = await request.get('/order/status');
    expect(res.headers()['referrer-policy']).toBe('no-referrer');
    expect(res.headers()['cache-control']).toBe('no-store');
  });

  test('is not in the sitemap', async ({ request }) => {
    expect(await (await request.get('/sitemap.xml')).text()).not.toContain('/order/status');
  });
});

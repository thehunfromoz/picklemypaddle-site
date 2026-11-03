import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { WCAG, fillOrder, mockOrderApi, parseMultipart, TOKEN } from './helpers/orders';

// SCRUM-63: the discount code field. The service is mocked; it decides, the form only shows.
const REFUSED = 'That code can’t be used. Check it, or carry on without one.';

async function mockCheck(page: Page) {
  const seen: unknown[] = [];
  await page.route('**/api/discount-codes/check', async (route) => {
    const body = route.request().postDataJSON() as { code: string };
    seen.push(body);
    await route.fulfill({
      json: body.code === 'LAUNCH10'
        ? { valid: true, code: 'LAUNCH10', kind: 'free', value: 1, label: 'Free re-grit for 1 paddle' }
        : { valid: false, message: REFUSED },
    });
  });
  return seen;
}

test.describe('Discount code on the order form', () => {
  test('a valid code updates the estimate, is sent with the order and shows on the confirmation', async ({ page }) => {
    let parts: ReturnType<typeof parseMultipart> = [];
    await mockOrderApi(page, {
      submit: async (route) => {
        const req = route.request();
        parts = parseMultipart(req.postDataBuffer()!, req.headers()['content-type'] ?? '');
        await route.fulfill({ status: 201, json: { reference: 'PMP-ABCDE', statusToken: TOKEN, test: true } });
      },
    });
    const seen = await mockCheck(page);
    await page.goto('/#order');
    await fillOrder(page);
    await page.getByTestId('discount-code').fill(' launch10 ');
    await page.getByTestId('discount-apply').click();
    // home-server runs this as a smoke test on a slow CPU: allow the answer time to arrive.
    await expect(page.getByTestId('discount-status')).toHaveText('Code LAUNCH10: Free re-grit for 1 paddle. Confirmed when we accept your order.', { timeout: 15_000 });
    await expect(page.locator('#estimate')).toHaveText('A$0 (A$60 less A$60 with LAUNCH10)', { timeout: 15_000 });
    expect(seen.filter((b) => (b as { code: string }).code === 'LAUNCH10')).toHaveLength(1); // Apply and blur ask once
    await expect(page.getByTestId('estimate-line')).toContainText('plus return postage');
    expect(seen.at(-1)).toMatchObject({ code: 'LAUNCH10' });

    const results = await new AxeBuilder({ page }).include('#order-form').withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByTestId('order-done')).toBeVisible({ timeout: 30_000 });
    expect(parts.find((p) => p.name === 'discountCode')?.data.toString()).toBe('LAUNCH10');
    await expect(page.getByTestId('done-discount')).toContainText('Code LAUNCH10 applied: it’s confirmed when we accept your order.', { timeout: 15_000 });
  });

  test('an invalid code shows the one message and doesn’t block the order', async ({ page }) => {
    let submitted = false;
    await mockOrderApi(page, {
      submit: async (route) => {
        submitted = true;
        await route.fulfill({ status: 201, json: { reference: 'PMP-FGHJK', statusToken: TOKEN, test: true } });
      },
    });
    await mockCheck(page);
    await page.goto('/#order');
    await fillOrder(page);
    await page.getByTestId('discount-code').fill('NOPE123');
    await page.getByTestId('discount-apply').click();
    await expect(page.getByTestId('discount-error')).toHaveText(REFUSED);
    await expect(page.locator('#estimate')).toHaveText('A$60');
    await page.getByTestId('discount-code').fill('');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByTestId('order-done')).toBeVisible({ timeout: 30_000 });
    expect(submitted).toBe(true);
    await expect(page.getByTestId('done-discount')).toBeHidden();
  });

  test('a code the service refuses at submit is shown on the field, with everything kept', async ({ page }) => {
    await mockOrderApi(page, {
      submit: (route) => route.fulfill({ status: 400, json: { errors: { discountCode: REFUSED } } }),
    });
    await mockCheck(page);
    await page.goto('/#order');
    await fillOrder(page);
    await page.getByTestId('discount-code').fill('LAUNCH10');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByTestId('discount-error')).toHaveText(REFUSED);
    await expect(page.getByTestId('discount-code')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#order-form')).toBeVisible();
  });

  test('the status page shows the code: the estimate before acceptance, the fixed amount after', async ({ page }) => {
    const base = {
      reference: 'PMP-ABCDE', status: 'submitted', statusLabel: 'Received: we’re checking your photos',
      history: [{ status: 'submitted', label: 'Received: we’re checking your photos', at: '2026-10-26T01:00:00.000Z' }],
      paddles: [{ brand: 'Selkirk', model: null }], trackingNumber: null, backInPostBy: null, paddlesAhead: null, queuePosition: null,
      test: true, review: null,
    };
    let view: Record<string, unknown> = { ...base, discount: { code: 'LAUNCH10', label: 'Free re-grit for 1 paddle', cents: 6000, confirmed: false } };
    await page.route('**/api/orders/status', (route) => route.fulfill({ json: view }));
    await page.goto(`/order/status#${TOKEN}`);
    await expect(page.getByTestId('status-discount')).toHaveText(
      'Discount code LAUNCH10 applied (Free re-grit for 1 paddle, about A$60 off): confirmed when we accept your order.',
    );
    view = { ...base, status: 'accepted', statusLabel: 'Accepted: payment link sent', discount: { code: 'LAUNCH10', label: 'Free re-grit for 1 paddle', cents: 6000, confirmed: true } };
    await page.reload();
    await expect(page.getByTestId('status-discount')).toHaveText('Discount code LAUNCH10: A$60 off the re-grit.');
  });
});

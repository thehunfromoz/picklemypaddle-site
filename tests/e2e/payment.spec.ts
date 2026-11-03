import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TOKEN, WCAG } from './helpers/orders';

// SCRUM-82: Pay now on the status page, Stripe's return to /order/paid, and Cancel. The service
// and Stripe are mocked here; the real payment is Attila's staging walk-through with a test card.

const base = {
  reference: 'PMP-ABCDE', paddles: [{ brand: 'Selkirk', model: null }], trackingNumber: null, backInPostBy: null, paddlesAhead: null,
  queuePosition: null, test: true, review: null, discount: null,
};
const accepted = {
  ...base, status: 'accepted', statusLabel: 'Accepted: payment link sent',
  history: [{ status: 'accepted', label: 'Accepted: payment link sent', at: '2026-11-02T01:00:00.000Z' }],
  payment: { amountCents: 7170, canPay: true, paidAt: null },
};
const paid = {
  ...accepted, status: 'paid', statusLabel: 'Paid: waiting for your paddle to arrive',
  payment: { amountCents: 7170, canPay: false, paidAt: '2026-11-02T02:00:00.000Z' },
};
const CHECKOUT = 'https://checkout.stripe.com/c/pay/cs_test_fake1234567890';

async function stubStripe(page: Page) {
  await page.route('https://checkout.stripe.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Stripe Checkout (fake)</title><h1>Fake Checkout</h1>' }));
}

test.describe('Paying for an accepted order', () => {
  test('Pay now goes to Stripe Checkout with the token kept in this tab, never sent to Stripe', async ({ page }) => {
    let sent: unknown;
    await page.route('**/api/orders/status', (route) => route.fulfill({ json: accepted }));
    await page.route('**/api/orders/pay', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { url: CHECKOUT } });
    });
    await stubStripe(page);
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto(`/order/status#${TOKEN}`);
    await expect(page.getByTestId('status-amount')).toHaveText('A$71.70');
    await expect(page.getByTestId('pay-now')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await page.getByTestId('pay-now').click();
    await expect(page).toHaveURL(CHECKOUT);
    expect(sent).toEqual({ token: TOKEN });
    await page.goBack(); // sessionStorage belongs to our origin, not Stripe's
    expect(await page.evaluate(() => sessionStorage.getItem('pmp-pay-token'))).toBe(TOKEN);
    expect(urls.filter((u) => u.includes(TOKEN))).toEqual([]);
  });

  test('a refusal (already paid) shows the message and the order as it stands', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/orders/status', (route) => route.fulfill({ json: calls++ === 0 ? accepted : paid }));
    await page.route('**/api/orders/pay', (route) => route.fulfill({ status: 409, json: { error: 'already_paid', message: 'This order has already been paid. Thank you!' } }));
    await page.goto(`/order/status#${TOKEN}`);
    await page.getByTestId('pay-now').click();
    await expect(page.getByTestId('status-paid')).toHaveText('Paid A$71.70 on 2 November 2026.');
    await expect(page.getByTestId('pay-now')).toBeHidden();
  });

  test('without online payment yet, the amount shows with no Pay now', async ({ page }) => {
    await page.route('**/api/orders/status', (route) => route.fulfill({ json: { ...accepted, payment: { ...accepted.payment, canPay: false } } }));
    await page.goto(`/order/status#${TOKEN}`);
    await expect(page.getByTestId('status-pay-later')).toContainText('A$71.70');
    await expect(page.getByTestId('pay-now')).toBeHidden();
  });

  test('back from Stripe: /order/paid confirms, drops the session id from the URL and links to the order', async ({ page }) => {
    let sent: unknown;
    await page.route('**/api/orders/paid', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { paid: true, reference: 'PMP-ABCDE' } });
    });
    await page.goto('/');
    await page.evaluate((t) => sessionStorage.setItem('pmp-pay-token', t), TOKEN);
    await page.goto('/order/paid?session_id=cs_test_fake1234567890');
    await expect(page.getByTestId('paid-heading')).toHaveText('Thanks, payment received');
    await expect(page.getByTestId('paid-reference')).toHaveText('PMP-ABCDE');
    expect(sent).toEqual({ sessionId: 'cs_test_fake1234567890' });
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByTestId('paid-status-link')).toHaveAttribute('href', `/order/status#${TOKEN}`);
    expect(await page.evaluate(() => sessionStorage.getItem('pmp-pay-token'))).toBeNull();
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('back from Stripe before the confirmation arrives: says so, and not to pay twice', async ({ page }) => {
    await page.route('**/api/orders/paid', (route) => route.fulfill({ json: { paid: false } }));
    await page.goto('/order/paid?session_id=cs_test_fake1234567890');
    await expect(page.getByTestId('paid-pending')).toContainText('Please don’t pay a second time.');
  });

  test('Cancel on Stripe brings the order back, from the token kept in this tab', async ({ page }) => {
    await page.route('**/api/orders/status', (route) => route.fulfill({ json: accepted }));
    await page.goto('/');
    await page.evaluate((t) => sessionStorage.setItem('pmp-pay-token', t), TOKEN);
    await page.goto('/order/status?payment=cancelled');
    await expect(page.getByTestId('status-cancelled')).toBeVisible();
    await expect(page.getByTestId('status-reference')).toHaveText('PMP-ABCDE');
    expect(new URL(page.url()).hash).toBe(`#${TOKEN}`);
  });

});

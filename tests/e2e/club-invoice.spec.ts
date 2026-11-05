import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TOKEN, WCAG } from './helpers/orders';

// SCRUM-85: a club batch's printable invoice, opened from its email. The service is mocked; the
// real invoice is Attila's staging walk-through.

const snapshot = {
  v: 1, number: 'PMP-INV-0042', kind: 'invoice', heading: 'Invoice', issuedOn: '2026-11-04', treatment: 'not_registered', test: true,
  seller: { name: 'PickleMyPaddle', abn: '[To confirm: ABN]', email: 'info@picklemypaddle.com', website: 'www.picklemypaddle.com' },
  buyer: { name: 'Inner West Pickleball Club', address: 'Attn: Jo Treasurer\n1 Court St\nNewtown NSW 2042' },
  reference: 'PMPB-4K7QX',
  lines: [{ description: 'Paddle re-grit, both faces: club batch collected 28 October 2026, returned 4 November 2026', quantity: 23, unitCents: 5400, amountCents: 124200 }],
  totalCents: 124200, gstCents: 0, gstLine: 'No GST has been charged', dueOn: '2026-11-18', payId: 'payments@picklemypaddle.com',
  notes: ['Due by 18 November 2026.', 'How to pay: PayID or bank transfer to payments@picklemypaddle.com, with PMP-INV-0042 as the reference.'],
};
const invoice = { sha256: 'abc', paid: null, snapshot };
const taxInvoice = {
  ...invoice,
  snapshot: {
    ...snapshot, test: false, heading: 'Tax invoice', treatment: 'gst_exclusive', subtotalCents: 124200, gstCents: 12420, totalCents: 136620,
    gstLine: 'GST (10%) A$124.20', notes: ['All items are taxable sales.', ...snapshot.notes], seller: { ...snapshot.seller, abn: '51 824 753 556' },
  },
};

test.describe('Club invoices', () => {
  test('shows the invoice as issued: club batch, due date, how to pay; the token goes in the body only', async ({ page }) => {
    let sent: unknown;
    await page.route('**/api/clubs/invoice', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: invoice });
    });
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto(`/club/invoice?n=PMP-INV-0042#${TOKEN}`);
    await expect(page.getByTestId('doc-heading')).toHaveText('Invoice');
    expect(sent).toEqual({ token: TOKEN, number: 'PMP-INV-0042' });
    expect(urls.filter((u) => u.includes(TOKEN))).toEqual([]);
    await expect(page.locator('#doc-meta')).toContainText('Club batch');
    await expect(page.locator('#doc-meta')).toContainText('PMPB-4K7QX');
    await expect(page.locator('#doc-meta')).toContainText('Due by');
    await expect(page.locator('#doc-meta')).toContainText('18 November 2026');
    await expect(page.getByTestId('doc-buyer')).toContainText('Inner West Pickleball Club');
    await expect(page.getByTestId('doc-total')).toHaveText('A$1242.00');
    await expect(page.getByTestId('doc-gst')).toHaveText('No GST has been charged');
    await expect(page.locator('#doc-subtotals tr')).toHaveCount(0);
    await expect(page.locator('#doc-notes')).toContainText('PayID or bank transfer to payments@picklemypaddle.com');
    await expect(page.getByTestId('doc-test')).toContainText('TEST DOCUMENT');
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });

  test('once GST-registered: the subtotal excluding GST and the GST on their own lines, then the total', async ({ page }) => {
    await page.route('**/api/clubs/invoice', (route) => route.fulfill({ json: taxInvoice }));
    await page.goto(`/club/invoice?n=PMP-INV-0042#${TOKEN}`);
    await expect(page.getByTestId('doc-heading')).toHaveText('Tax invoice');
    const rows = page.locator('#doc-subtotals tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Subtotal (excluding GST)');
    await expect(rows.nth(0)).toContainText('A$1242.00');
    await expect(rows.nth(1)).toContainText('GST (10%)');
    await expect(rows.nth(1)).toContainText('A$124.20');
    await expect(page.getByTestId('doc-total')).toHaveText('A$1366.20');
    await expect(page.getByTestId('doc-gst')).toHaveText('');
    await expect(page.getByTestId('doc-test')).toBeHidden();
  });

  test('a bad or expired link says so, without asking the service when the link is malformed', async ({ page }) => {
    let asked = 0;
    await page.route('**/api/clubs/invoice', async (route) => {
      asked++;
      await route.fulfill({ status: 404, json: { error: 'invalid_link' } });
    });
    await page.goto('/club/invoice?n=PMP-INV-0042#short');
    await expect(page.getByTestId('doc-invalid')).toBeVisible();
    expect(asked).toBe(0);
    await page.goto(`/club/invoice?n=PMP-INV-0042#${TOKEN}`);
    await page.reload();
    await expect(page.getByTestId('doc-invalid')).toBeVisible();
    expect(asked).toBeGreaterThan(0);
    await expect(page.getByTestId('doc-invalid')).toContainText('reply to that email');
  });

  test('part-paid: the payments so far and what’s owing; Pay by card keeps the link in the tab and goes to Stripe', async ({ page }) => {
    const partPaid = { ...invoice, balanceCents: 114200, payments: [{ method: 'PayID', amountCents: 10000, paidOn: '2026-11-04' }], canPayByCard: true };
    await page.route('**/api/clubs/invoice', (route) => route.fulfill({ json: partPaid }));
    let paySent: unknown;
    await page.route('**/api/clubs/pay', async (route) => {
      paySent = route.request().postDataJSON();
      await route.fulfill({ json: { url: 'https://checkout.stripe.com/c/pay/cs_test_club' } });
    });
    await page.route('https://checkout.stripe.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>Stripe</title>' }));
    await page.goto(`/club/invoice?n=PMP-INV-0042#${TOKEN}`);
    await expect(page.getByTestId('club-payment-list')).toHaveText('A$100.00 by PayID on 4 November 2026');
    await expect(page.getByTestId('club-owing')).toHaveText('Still owing: A$1142.00');
    await expect(page.getByTestId('club-pay-now')).toHaveText('Pay A$1142.00 by card');
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
    await page.getByTestId('club-pay-now').click();
    await page.waitForURL('https://checkout.stripe.com/**');
    expect(paySent).toEqual({ token: TOKEN, number: 'PMP-INV-0042' });
    expect(page.url()).not.toContain(TOKEN);

    // Cancel on Stripe: back without the fragment; the tab's memory reopens the invoice.
    await page.goto('/club/invoice?n=PMP-INV-0042&payment=cancelled');
    await expect(page.getByTestId('pay-cancelled')).toBeVisible();
    await expect(page.getByTestId('doc-heading')).toHaveText('Invoice');
    expect(new URL(page.url()).hash).toBe(`#${TOKEN}`);
  });

  test('no card button when card isn’t offered or it’s paid; a refused start says why', async ({ page }) => {
    let view: Record<string, unknown> = { ...invoice, balanceCents: 124200, payments: [], canPayByCard: false };
    await page.route('**/api/clubs/invoice', (route) => route.fulfill({ json: view }));
    await page.goto(`/club/invoice?n=PMP-INV-0042#${TOKEN}`);
    await expect(page.getByTestId('doc-view')).toBeVisible();
    await expect(page.getByTestId('club-pay')).toBeHidden();
    await expect(page.getByTestId('club-payments')).toBeHidden();

    view = { ...invoice, paid: { on: '2026-11-05', method: 'PayID' }, balanceCents: 0, payments: [{ method: 'PayID', amountCents: 124200, paidOn: '2026-11-05' }], canPayByCard: false };
    await page.reload();
    await expect(page.getByTestId('doc-heading')).toHaveText('Invoice: paid');
    await expect(page.getByTestId('club-pay')).toBeHidden();
    await expect(page.getByTestId('club-owing')).toBeHidden();

    view = { ...invoice, balanceCents: 124200, payments: [], canPayByCard: true };
    await page.route('**/api/clubs/pay', (route) => route.fulfill({ status: 503, json: { message: 'Card payment isn’t available yet.' } }));
    await page.reload();
    await page.getByTestId('club-pay-now').click();
    await expect(page.getByTestId('club-pay-error')).toHaveText('Card payment isn’t available yet.');
    await expect(page.getByTestId('club-pay-now')).toBeEnabled();
  });

  test('paid in full while the page was open: the 409 reloads the invoice, nothing owing is left on screen, and the reason is shown', async ({ page }) => {
    let view: Record<string, unknown> = { ...invoice, balanceCents: 114200, payments: [{ method: 'PayID', amountCents: 10000, paidOn: '2026-11-04' }], canPayByCard: true };
    await page.route('**/api/clubs/invoice', (route) => route.fulfill({ json: view }));
    await page.route('**/api/clubs/pay', (route) => route.fulfill({ status: 409, json: { message: 'This invoice has been paid in full. Thank you!' } }));
    await page.goto(`/club/invoice?n=PMP-INV-0042#${TOKEN}`);
    await expect(page.getByTestId('club-owing')).toHaveText('Still owing: A$1142.00');
    // PayID for the rest is recorded while the page is open.
    view = { ...invoice, paid: { on: '2026-11-05', method: 'PayID' }, balanceCents: 0, canPayByCard: false,
      payments: [{ method: 'PayID', amountCents: 10000, paidOn: '2026-11-04' }, { method: 'PayID', amountCents: 114200, paidOn: '2026-11-05' }] };
    await page.getByTestId('club-pay-now').click();
    await expect(page.getByTestId('doc-heading')).toHaveText('Invoice: paid');
    await expect(page.getByTestId('club-owing')).toBeHidden();
    await expect(page.getByTestId('club-pay')).toBeHidden();
    await expect(page.getByTestId('club-payment-list')).toContainText('A$1142.00 by PayID on 5 November 2026');
    await expect(page.getByTestId('club-pay-notice')).toHaveText('This invoice has been paid in full. Thank you!');
  });

  test('a cancelled return with nothing remembered (another tab) says the link is needed', async ({ page }) => {
    await page.goto('/club/invoice?n=PMP-INV-0042&payment=cancelled');
    await expect(page.getByTestId('doc-invalid')).toBeVisible();
  });
});

test.describe('After paying a club invoice by card', () => {
  test('confirms with the service, links back to the invoice, and drops the session id from the address', async ({ page }) => {
    let sent: unknown;
    await page.route('**/api/clubs/paid', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { paid: true, number: 'PMP-INV-0042' } });
    });
    await page.goto('/');
    await page.evaluate((token) => sessionStorage.setItem('pmp-club-pay', JSON.stringify({ number: 'PMP-INV-0042', token })), TOKEN);
    await page.goto('/club/paid?session_id=cs_test_a1B2c3D4e5F6g7H8');
    await expect(page.getByTestId('paid-heading')).toHaveText('Thanks, payment received');
    await expect(page.getByTestId('paid-number')).toHaveText('PMP-INV-0042');
    expect(sent).toEqual({ sessionId: 'cs_test_a1B2c3D4e5F6g7H8' });
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByTestId('paid-invoice-link')).toHaveAttribute('href', `/club/invoice?n=PMP-INV-0042#${TOKEN}`);
    expect(await page.evaluate(() => sessionStorage.getItem('pmp-club-pay'))).toBeNull();
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });

  test('charged but not applied (the invoice was paid or changed meanwhile): says so, not "within a few minutes"', async ({ page }) => {
    await page.route('**/api/clubs/paid', (route) => route.fulfill({ json: { paid: false, review: true } }));
    await page.goto('/club/paid?session_id=cs_test_a1B2c3D4e5F6g7H8');
    await expect(page.getByTestId('paid-review')).toContainText('refund');
    await expect(page.getByTestId('paid-review')).toContainText('attila@picklemypaddle.com');
    await expect(page.getByTestId('paid-pending')).toBeHidden();
    await expect(page.getByTestId('paid-done')).toBeHidden();
    await expect(page.getByTestId('paid-heading')).toHaveText('We need to check your payment');
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });

  test('not confirmed yet: says so and not to pay twice', async ({ page }) => {
    await page.route('**/api/clubs/paid', (route) => route.fulfill({ json: { paid: false } }));
    await page.goto('/club/paid?session_id=cs_test_a1B2c3D4e5F6g7H8');
    await expect(page.getByTestId('paid-pending')).toContainText('Please don’t pay a second time');
    await expect(page.getByTestId('paid-invoice-link')).toBeHidden();
  });
});

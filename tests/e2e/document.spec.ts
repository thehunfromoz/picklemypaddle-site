import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TOKEN, WCAG } from './helpers/orders';

// SCRUM-84: the printable receipt and credit note, and their links on the status page. The
// service is mocked; the real documents are Attila's staging walk-through.

const receipt = {
  sha256: 'abc',
  paid: { on: '2026-11-03', method: 'card' },
  snapshot: {
    v: 1, number: 'PMP-INV-0001', kind: 'receipt', heading: 'Invoice', issuedOn: '2026-11-03', treatment: 'not_registered', test: true,
    seller: { name: 'PickleMyPaddle', abn: '[To confirm: ABN]', email: 'info@picklemypaddle.com', website: 'www.picklemypaddle.com' },
    buyer: { name: 'Sam Player' }, reference: 'PMP-ABCDE',
    lines: [
      { description: 'Paddle re-grit, both faces', quantity: 1, unitCents: 6000, amountCents: 6000 },
      { description: 'Return postage', quantity: 1, unitCents: 1170, amountCents: 1170 },
    ],
    totalCents: 7170, gstCents: 0, gstLine: 'No GST has been charged', notes: [],
  },
};
const taxInvoice = {
  ...receipt,
  snapshot: { ...receipt.snapshot, test: false, heading: 'Tax invoice', treatment: 'gst_inclusive', gstCents: 652, gstLine: 'Total includes GST of A$6.52', notes: ['All items are taxable sales.'], seller: { ...receipt.snapshot.seller, abn: '51 824 753 556' } },
};

test.describe('Printable receipts', () => {
  test('shows the receipt as issued, asks with the token in the body only, and prints without the site around it', async ({ page }) => {
    let sent: unknown;
    await page.route('**/api/orders/document', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: receipt });
    });
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto(`/order/document?n=PMP-INV-0001#${TOKEN}`);
    await expect(page.getByTestId('doc-heading')).toHaveText('Invoice: paid');
    expect(sent).toEqual({ token: TOKEN, number: 'PMP-INV-0001' });
    expect(urls.filter((u) => u.includes(TOKEN))).toEqual([]);
    await expect(page.getByTestId('doc-test')).toContainText('TEST DOCUMENT');
    await expect(page.getByTestId('doc-seller')).toContainText('ABN [To confirm: ABN]');
    await expect(page.getByTestId('doc-buyer')).toHaveText('Sam Player');
    await expect(page.getByTestId('doc-lines').locator('tbody tr')).toHaveCount(2);
    await expect(page.getByTestId('doc-total')).toHaveText('A$71.70');
    await expect(page.getByTestId('doc-gst')).toHaveText('No GST has been charged');
    await expect(page.getByTestId('doc-paid')).toHaveText('Paid in full by card on 3 November 2026.');
    await expect(page.getByText(/tax invoice/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Back to your order' })).toHaveAttribute('href', `/order/status#${TOKEN}`);
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('body > header')).toBeHidden();
    await expect(page.locator('body > footer')).toBeHidden();
    await expect(page.getByTestId('doc-print')).toBeHidden();
    await expect(page.getByTestId('doc')).toBeVisible();
  });

  test('a tax invoice shows the ABN, the GST included and that items are taxable', async ({ page }) => {
    await page.route('**/api/orders/document', (route) => route.fulfill({ json: taxInvoice }));
    await page.goto(`/order/document?n=PMP-INV-0001#${TOKEN}`);
    await expect(page.getByTestId('doc-heading')).toHaveText('Tax invoice: paid');
    await expect(page.getByTestId('doc-seller')).toContainText('ABN 51 824 753 556');
    await expect(page.getByTestId('doc-gst')).toHaveText('Total includes GST of A$6.52');
    await expect(page.getByText('All items are taxable sales.')).toBeVisible();
    await expect(page.getByTestId('doc-test')).toBeHidden();
  });

  test('a bad or expired link says so, and a malformed one never asks the service', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/orders/document', (route) => {
      calls++;
      return route.fulfill({ status: 404, json: { error: 'invalid_link', message: 'This link isn’t valid or has expired.' } });
    });
    await page.goto(`/order/document?n=PMP-INV-0001#${TOKEN}`);
    await expect(page.getByTestId('doc-invalid')).toBeVisible();
    await page.goto('/order/document?n=PMP-INV-0001#short');
    await expect(page.getByTestId('doc-invalid')).toBeVisible();
    expect(calls).toBe(1);
  });

  test('the status page lists the receipt and credit note, and a refund', async ({ page }) => {
    const view = {
      reference: 'PMP-ABCDE', paddles: [{ brand: 'Selkirk', model: null }], trackingNumber: null, backInPostBy: null, paddlesAhead: null,
      queuePosition: null, test: true, review: null, discount: null, status: 'paid', statusLabel: 'Paid: waiting for your paddle to arrive',
      history: [{ status: 'paid', label: 'Paid: waiting for your paddle to arrive', at: '2026-11-03T02:00:00.000Z' }],
      payment: { amountCents: 7170, canPay: false, paidAt: '2026-11-03T02:00:00.000Z', refundedCents: 1170 },
      documents: [{ number: 'PMP-INV-0001', title: 'Receipt', issuedOn: '2026-11-03' }, { number: 'PMP-CN-0001', title: 'Credit note', issuedOn: '2026-11-04' }],
    };
    await page.route('**/api/orders/status', (route) => route.fulfill({ json: view }));
    await page.goto(`/order/status#${TOKEN}`);
    await expect(page.getByTestId('status-refunded')).toHaveText('A$11.70 refunded.');
    const links = page.getByTestId('status-documents').getByRole('link');
    await expect(links).toHaveText(['Receipt PMP-INV-0001', 'Credit note PMP-CN-0001']);
    await expect(links.first()).toHaveAttribute('href', `/order/document?n=PMP-INV-0001#${TOKEN}`);
    await expect(page.getByTestId('status-documents')).toContainText('(3 November 2026)');
  });
});

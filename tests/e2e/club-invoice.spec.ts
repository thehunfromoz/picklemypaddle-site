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
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TOKEN, WCAG } from './helpers/orders';

// SCRUM-94: the club agreement's printable page, opened from its email. The service is mocked; the
// real send and the recorded reply are Attila's staging walk-through.

const view = {
  title: 'PickleMyPaddle club partner agreement', label: '0.1', dated: '2026-11-04', sentOn: '2026-11-09', acceptedOn: null, test: true,
  sections: [
    { heading: '1. Who this agreement is between', blocks: [{ p: '1.1 This agreement is between PickleMyPaddle and the club named in the Schedule.' }, { list: ['no cracks;', 'the edge guard is intact.'] }] },
    { heading: '6. Price', blocks: [{ p: 'Payment is in full for each invoice. Part payments aren’t accepted.' }, { p: '<img src=x onerror=alert(1)> is text, not markup' }] },
  ],
  schedule: [['Club name', 'Inner West Pickleball Club'], ['Usual way of paying', 'PayID, card or cash']],
};

test.describe('Club agreement', () => {
  test('shows the agreement as sent, with the token in the body only; no CSP or accessibility violations', async ({ page }) => {
    let sent: unknown;
    await page.route('**/api/clubs/agreement', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: view });
    });
    const urls: string[] = [];
    const violations: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    page.on('console', (m) => /Content.Security.Policy/i.test(m.text()) && violations.push(m.text()));
    await page.goto(`/club/agreement#${TOKEN}`);
    await expect(page.getByTestId('agreement-title')).toHaveText('PickleMyPaddle club partner agreement, version 0.1');
    expect(sent).toEqual({ token: TOKEN });
    expect(urls.filter((u) => u.includes(TOKEN))).toEqual([]);
    await expect(page.getByTestId('agreement-status')).toHaveText(/sent on 9 November 2026.*“I agree”/);
    await expect(page.getByTestId('agreement-test')).toBeVisible();
    await expect(page.getByTestId('agreement-body')).toContainText('Payment is in full for each invoice. Part payments aren’t accepted.');
    await expect(page.getByTestId('agreement-body').getByRole('listitem')).toHaveCount(2);
    // Text from the service is text: it never becomes markup.
    await expect(page.getByTestId('agreement-body')).toContainText('<img src=x onerror=alert(1)> is text, not markup');
    await expect(page.getByTestId('agreement-body').locator('img')).toHaveCount(0);
    await expect(page.getByTestId('agreement-schedule')).toContainText('Inner West Pickleball Club');
    await expect(page.getByTestId('agreement-print')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
    expect(violations).toEqual([]);
  });

  test('says it was accepted, and is not a trial in production', async ({ page }) => {
    await page.route('**/api/clubs/agreement', (route) => route.fulfill({ json: { ...view, test: false, acceptedOn: '2026-11-10' } }));
    await page.goto(`/club/agreement#${TOKEN}`);
    await expect(page.getByTestId('agreement-status')).toHaveText('Version 0.1: accepted on 10 November 2026.');
    await expect(page.getByTestId('agreement-test')).toBeHidden();
  });

  test('a missing, malformed or refused link says it isn’t valid, and asks the service nothing when the link is malformed', async ({ page }) => {
    let asked = 0;
    await page.route('**/api/clubs/agreement', async (route) => {
      asked++;
      await route.fulfill({ status: 404, json: { error: 'invalid_link' } });
    });
    await page.goto('/club/agreement');
    await expect(page.getByTestId('agreement-invalid')).toBeVisible();
    await page.goto('about:blank'); // a change of fragment alone wouldn't load the page again
    await page.goto('/club/agreement#short');
    await expect(page.getByTestId('agreement-invalid')).toBeVisible();
    expect(asked).toBe(0);
    await page.goto('about:blank');
    await page.goto(`/club/agreement#${TOKEN}`);
    await expect(page.getByTestId('agreement-invalid')).toBeVisible();
    expect(asked).toBe(1);
    await expect(page.getByTestId('agreement-invalid').getByRole('link')).toHaveAttribute('href', 'mailto:attila@picklemypaddle.com');
  });
});

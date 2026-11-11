import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { WCAG } from './helpers/orders';

// SCRUM-93: the Clubs page's "Talk to us about your club" form. The service is mocked; the real
// lead, its emails and the pipeline are Attila's staging walk-through.

const TOKEN = '1760000000000.' + 'a'.repeat(43);

async function fill(page: import('@playwright/test').Page, over: Record<string, string> = {}) {
  const values: Record<string, string> = {
    clubName: 'Inner West Pickleball Club', suburb: 'Newtown', postcode: '2042', memberCount: '40', contactName: 'Jo Treasurer', contactEmail: 'jo@club.org.au', ...over,
  };
  for (const [k, v] of Object.entries(values)) await page.locator(`#${k}`).fill(v);
}

test.describe('Clubs page: what to tell members (SCRUM-104)', () => {
  test('tells clubs the grit is black and hides logos and artwork, so they can advise members', async ({ page }) => {
    await page.goto('/clubs');
    const notes = page.getByTestId('club-member-notes');
    await expect(notes).toContainText('Logos and artwork are hidden');
    await expect(notes).toContainText('black and not see-through');
    await expect(notes).toContainText('sanctioned tournaments');
  });
});

test.describe('Clubs page: Talk to us', () => {
  test('shows the form with no third-party origin, no CSP violation and no accessibility violations', async ({ page }) => {
    const violations: string[] = [];
    const origins = new Set<string>();
    page.on('console', (m) => /Content.Security.Policy/i.test(m.text()) && violations.push(m.text()));
    page.on('request', (r) => origins.add(new URL(r.url()).origin));
    await page.goto('/clubs');
    await expect(page.getByRole('heading', { name: 'Talk to us about your club' })).toBeVisible();
    for (const label of ['Club name', 'Venue suburb', 'Postcode', 'Roughly how many members play?', 'Your name', 'Email']) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    await expect(page.getByLabel(/Phone/)).toBeVisible();
    // Nothing about members' details or a street address is asked for.
    await expect(page.getByLabel(/street|address/i)).toHaveCount(0);
    await expect(page.getByTestId('club-honeypot')).toHaveAttribute('aria-hidden', 'true');
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
    expect(violations).toEqual([]);
    expect([...origins].filter((o) => o !== new URL(page.url()).origin)).toEqual([]);
  });

  test('sends the details with the form token and says thanks; the honeypot is empty', async ({ page }) => {
    let sent: Record<string, unknown> | undefined;
    await page.route('**/api/clubs/lead/form', (route) => route.fulfill({ json: { open: true, formToken: TOKEN } }));
    await page.route('**/api/clubs/lead', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { ok: true, test: true } });
    });
    await page.goto('/clubs');
    await fill(page, { contactPhone: '0412 345 678', preferredTimes: 'Weeknights', message: 'Keen to talk.' });
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByTestId('club-lead-done')).toBeVisible();
    await expect(page.getByTestId('club-lead-form')).toBeHidden();
    expect(sent).toMatchObject({ clubName: 'Inner West Pickleball Club', suburb: 'Newtown', postcode: '2042', contactName: 'Jo Treasurer', contactEmail: 'jo@club.org.au', memberCount: '40', contactPhone: '0412 345 678', preferredTimes: 'Weeknights', message: 'Keen to talk.', formToken: TOKEN, website: '' });
    expect(Object.keys(sent!).sort()).toEqual(['clubName', 'contactEmail', 'contactName', 'contactPhone', 'formToken', 'memberCount', 'message', 'postcode', 'preferredTimes', 'suburb', 'website']);
  });

  test('says whether the venue is in the local pickup area once suburb and postcode are in, and never blocks sending (SCRUM-102)', async ({ page }) => {
    let sent: Record<string, unknown> | undefined;
    await page.route('**/api/clubs/lead/form', (route) => route.fulfill({ json: { open: true, formToken: TOKEN } }));
    await page.route('**/api/clubs/lead', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { ok: true, test: true } });
    });
    await page.goto('/clubs');
    const note = page.getByTestId('service-area-note');
    await expect(note).toBeHidden();
    await page.locator('#suburb').fill('Hornsby');
    await expect(note).toBeHidden(); // no postcode yet
    await page.locator('#postcode').fill('2077');
    await expect(note).toHaveText('Great, you’re in our local pickup area.');
    await page.locator('#suburb').fill('Mt Annan');
    await page.locator('#postcode').fill('2567');
    await expect(note).toHaveText('You’re outside our local pickup area, so we’ll use post for your batches.');
    await page.locator('#suburb').fill('Hornsby');
    await page.locator('#postcode').fill('2560'); // right suburb, wrong postcode: outside
    await expect(note).toContainText('outside our local pickup area');
    await fill(page, { suburb: 'Campbelltown', postcode: '2560' });
    await expect(note).toContainText('outside our local pickup area');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByTestId('club-lead-done')).toBeVisible(); // outside is never a reason to refuse
    expect(sent).toMatchObject({ suburb: 'Campbelltown', postcode: '2560' });
  });

  test('shows mistakes beside the field before sending anything, and the service’s own errors after', async ({ page }) => {
    let posts = 0;
    await page.route('**/api/clubs/lead/form', (route) => route.fulfill({ json: { open: true, formToken: TOKEN } }));
    await page.route('**/api/clubs/lead', async (route) => {
      posts++;
      await route.fulfill({ status: 400, json: { errors: { contactEmail: 'This is a test site, so only the test email addresses work here.' } } });
    });
    await page.goto('/clubs');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('#clubName-error')).toHaveText(/club’s name/);
    await expect(page.locator('#contactEmail-error')).toHaveText('Enter a valid email address.');
    await expect(page.locator('#clubName')).toHaveAttribute('aria-invalid', 'true');
    expect(posts).toBe(0);
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);

    await fill(page);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('#contactEmail-error')).toHaveText(/test site/);
    await expect(page.getByTestId('club-lead-done')).toBeHidden();
    expect(posts).toBe(1);
  });

  test('when the service is closed or away, the form gives way to the email address', async ({ page }) => {
    await page.route('**/api/clubs/lead/form', (route) => route.fulfill({ status: 503, json: {} }));
    await page.goto('/clubs');
    await page.locator('#clubName').focus();
    await expect(page.getByTestId('club-lead-closed')).toBeVisible();
    await expect(page.getByTestId('club-lead-closed').getByRole('link')).toHaveAttribute('href', /^mailto:sales@picklemypaddle\.com/);
    await expect(page.getByTestId('club-lead-form')).toBeHidden();
  });

  test('a rate-limited send says so and keeps the details', async ({ page }) => {
    await page.route('**/api/clubs/lead/form', (route) => route.fulfill({ json: { open: true, formToken: TOKEN } }));
    await page.route('**/api/clubs/lead', (route) => route.fulfill({ status: 429, json: { error: 'rate_limited', message: 'We’ve received a lot of requests from you recently.' } }));
    await page.goto('/clubs');
    await fill(page);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('status').first()).toContainText('a lot of requests');
    await expect(page.locator('#clubName')).toHaveValue('Inner West Pickleball Club');
  });
});

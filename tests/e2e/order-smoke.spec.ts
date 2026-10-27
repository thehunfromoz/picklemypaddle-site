import { test, expect } from '@playwright/test';
import { fillOrder, pngFile } from './helpers/orders';

// SCRUM-68: a REAL order through the staging gateway → integrations → Postgres, run by the
// home-server updater after each site deploy (EXPECT_STAGING=1). Smoke orders come from
// smoke+<run>@example.com, which the service deletes 24 hours later.
const staging = process.env.EXPECT_STAGING === '1';

test('staging takes a real test order end to end and its status link works', async ({ page }, info) => {
  test.skip(!staging, 'only against staging, where the integrations service runs');
  test.skip(info.project.name !== 'desktop', 'one order per smoke run');
  const email = `smoke+${Date.now()}@example.com`;

  await page.goto('/#order');
  const started = Date.now();
  await fillOrder(page, { email, photo: pngFile('smoke.png', 1600, 1200) });
  // The service treats a form sent under 3 seconds after it was opened as a bot.
  await page.waitForTimeout(Math.max(0, 3500 - (Date.now() - started)));
  await page.getByRole('button', { name: 'Submit for review' }).click();

  await expect(page.getByTestId('order-done')).toBeVisible({ timeout: 30_000 });
  const reference = (await page.getByTestId('done-reference').textContent()) ?? '';
  expect(reference).toMatch(/^PMP-[A-HJ-KM-NP-Z2-9]{5}$/);
  await expect(page.getByTestId('done-test')).toBeVisible();
  console.log(`smoke order ${reference} placed through the gateway`);

  await page.getByTestId('done-status-link').click();
  await expect(page.getByTestId('status-reference')).toHaveText(reference);
  await expect(page.getByTestId('status-label')).toContainText('Received');
  await expect(page.getByTestId('status-test')).toBeVisible();
});

import { test, expect } from '@playwright/test';

// SCRUM-38: staging shows a "Preview" ribbon and a test-order notice and is not
// indexed; the live site shows neither. The site image ships an empty /env.css;
// the staging gateway serves one that reveals [data-env="staging-only"].
//
// EXPECT_STAGING=1 is set by the staging updater when it runs this suite through
// the gateway. Everywhere else (astro preview, the plain image in CI) this checks
// the live-site behaviour.
const staging = process.env.EXPECT_STAGING === '1';
const pages = ['/', '/about', '/faq', '/clubs', '/blog', '/privacy', '/terms'];

test('/env.css is served as CSS', async ({ request }) => {
  const res = await request.get('/env.css');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/css');
});

for (const path of pages) {
  test(`${path}: Preview ribbon is ${staging ? 'shown' : 'hidden'}`, async ({ page }) => {
    await page.goto(path);
    const ribbon = page.getByTestId('preview-ribbon');
    await expect(ribbon).toHaveCount(1);
    if (staging) await expect(ribbon).toBeVisible();
    else await expect(ribbon).toBeHidden();
  });
}

test(`order form: test-order notice is ${staging ? 'shown' : 'hidden'}`, async ({ page }) => {
  await page.goto('/#order');
  const notice = page.getByTestId('test-order-notice');
  await expect(notice).toHaveCount(1);
  if (staging) await expect(notice).toBeVisible();
  else await expect(notice).toBeHidden();
});

test('staging is not indexed', async ({ request }) => {
  test.skip(!staging, 'only the staging gateway sets noindex');
  const page = await request.get('/');
  expect(page.headers()['x-robots-tag']).toContain('noindex');
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toMatch(/^Disallow: \/$/m);
});

import { test, expect } from '@playwright/test';

// SCRUM-34: the blog after the move to language folders (src/content/blog/<lang>/). English keeps
// /blog/<slug>, the RSS feed lists the posts, and the Keystatic editor is never part of the public site
// (it runs only on staging, on a separate Tailscale-only address).
//
// Self-contained like the rest of tests/e2e: the smoke image runs this file against staging, so it reads
// what the server returns, never src/. The first post is found from /blog, not hard-coded, so a new post
// doesn't break it.
test.skip(({ isMobile }) => isMobile, 'content checks do not depend on the viewport; the desktop project is enough');

async function firstPostPath(page: import('@playwright/test').Page) {
  await page.goto('/blog');
  const href = await page.locator('main ul[role="list"] a').first().getAttribute('href');
  expect(href, 'the blog index links at least one post').toBeTruthy();
  return href!;
}

test.describe('Blog', () => {
  test('lists posts at /blog/<slug>, with no language folder in the URL', async ({ page }) => {
    const href = await firstPostPath(page);
    expect(href).toMatch(/^\/blog\/[a-z0-9-]+\/?$/);
    expect(href).not.toMatch(/^\/blog\/en\//);
  });

  test('a post opens with its title, date and a way back to the blog', async ({ page }) => {
    const href = await firstPostPath(page);
    const title = (await page.locator(`main a[href="${href}"]`).first().innerText()).trim();
    const res = await page.goto(href);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('main time').first()).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link')).toHaveAttribute('href', '/blog');
  });

  test('the welcome post kept its original URL', async ({ request }) => {
    expect((await request.get('/blog/welcome')).status()).toBe(200);
    expect((await request.get('/blog/en/welcome')).status()).toBe(404);
  });

  test('a cover image, when a post has one, carries alt text', async ({ page }) => {
    await page.goto(await firstPostPath(page));
    for (const img of await page.getByTestId('post-cover').all()) {
      expect((await img.getAttribute('alt'))?.trim()).toBeTruthy();
    }
  });

  test('single-language posts carry no hreflang links', async ({ page }) => {
    await page.goto(await firstPostPath(page));
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  });
});

test.describe('RSS feed', () => {
  test('/rss.xml lists every post on /blog, linked at its canonical URL', async ({ page, request }) => {
    const res = await request.get('/rss.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/);
    const xml = await res.text();
    expect(xml).toContain('<rss version="2.0"');
    const links = [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((m) => new URL(m[1]).pathname);
    expect(links.length).toBeGreaterThan(0);

    await page.goto('/blog');
    const listed = await page.locator('main ul[role="list"] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(links.sort()).toEqual(listed.map((h) => `${h!.replace(/\/$/, '')}/`).sort());

    for (const path of links) expect((await request.get(path)).status(), path).toBe(200);
  });

  test('every page advertises the feed', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/rss.xml');
  });
});

test.describe('Editor is not on the public site', () => {
  for (const path of ['/keystatic', '/keystatic/', '/api/keystatic/github/login']) {
    test(`${path} is not served`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `${path} must not exist here`).toBe(404);
    });
  }
});

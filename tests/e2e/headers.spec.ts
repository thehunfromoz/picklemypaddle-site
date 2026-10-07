import { test, expect } from '@playwright/test';

// Security headers come from Caddy, so these run only against a real server
// (BASE_URL set: the Docker image in CI, or staging).
test.skip(!process.env.BASE_URL, 'headers are served by Caddy, not astro preview');

test('security headers are set', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("default-src 'self'");
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).not.toContain('unsafe-inline');
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['permissions-policy']).toContain('camera=()');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['server']).toBeUndefined();
});

test('pages raise no Content-Security-Policy violations', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (m) => /Content.Security.Policy/i.test(m.text()) && violations.push(m.text()));
  for (const path of ['/', '/faq', '/clubs', '/blog']) await page.goto(path);
  expect(violations).toEqual([]);
});

test('health check responds', async ({ request }) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
});

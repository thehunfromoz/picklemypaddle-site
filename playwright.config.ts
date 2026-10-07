import { defineConfig, devices } from '@playwright/test';

/**
 * BASE_URL unset  → builds the site and tests `astro preview` (functional tests).
 * BASE_URL set    → tests an already-running server, e.g. the Docker image in CI
 *                   or staging at http://home-server:8088 (also runs header tests).
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:4321';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'pnpm build && pnpm preview', url: baseURL, reuseExistingServer: !process.env.CI, timeout: 180_000 },
});

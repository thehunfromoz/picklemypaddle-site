#!/usr/bin/env node
// SCRUM-37: Lighthouse budget, enforced in CI by `pnpm check:lighthouse` (the required checks / Checks job).
// Serves the built site (dist/) the way Caddy does (gzip, long-lived /_astro/ files), audits each page in
// lighthouse-budget.json in Lighthouse's mobile emulation, and fails if the median of the runs breaks a
// budget. The median run's full HTML report per page goes to lighthouse-report/, which CI uploads as an
// artifact when this fails.
//
//   pnpm build && pnpm check:lighthouse                  # all pages, 3 runs each
//   pnpm check:lighthouse --runs=1 --only=/,/faq         # a quicker look
//   CHROME_PATH=/path/to/chrome pnpm check:lighthouse    # use another Chrome (default: Playwright's Chromium)
//
// Needs Node 22.19 or newer (Lighthouse 13).
import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { evaluate, formatFailures, formatTable } from './lib/lighthouse-budget.mjs';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const budget = JSON.parse(readFileSync('lighthouse-budget.json', 'utf8'));
const runs = Number(arg('runs') ?? budget.runs);
const only = arg('only')?.split(',');
const paths = only ?? budget.urls;
const dist = resolve('dist');
const reportDir = resolve('lighthouse-report');

if (!existsSync(join(dist, 'index.html'))) {
  console.log('No dist/ yet: building the site first.');
  execSync('pnpm build', { stdio: 'inherit' });
} else {
  console.log(`Using dist/ as built at ${statSync(join(dist, 'index.html')).mtime.toISOString()}.`);
}

// ── Static server: what Caddy does for the site (deploy/Caddyfile), without the security headers ──
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json', '.ico': 'image/x-icon',
};
const compressible = /^(text\/|application\/(xml|json)|image\/svg)/;

const server = createServer((req, res) => {
  let file = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (file !== dist && !file.startsWith(dist + sep)) return void res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  else if (!existsSync(file) && existsSync(join(file, 'index.html'))) file = join(file, 'index.html');
  let status = 200;
  if (!existsSync(file)) [file, status] = [join(dist, '404.html'), 404];
  const type = types[extname(file)] ?? 'application/octet-stream';
  const headers = { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' };
  if (req.url.startsWith('/_astro/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  let body = readFileSync(file);
  if (compressible.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
    body = gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
  }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers).end(body);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

// ── Lighthouse ──
const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const pages = [];
try {
  rmSync(reportDir, { recursive: true, force: true });
  mkdirSync(reportDir, { recursive: true });
  for (const path of paths) {
    const url = origin + path;
    const results = [];
    for (let i = 1; i <= runs; i++) {
      // Defaults are Lighthouse's mobile preset: Moto G Power emulation, simulated slow 4G, 4x CPU slowdown.
      const { lhr, report } = await lighthouse(url, { port: chrome.port, output: 'html', logLevel: 'error' });
      const perf = Math.round((lhr.categories.performance?.score ?? 0) * 100);
      console.log(`${path.padEnd(16)} run ${i}/${runs}: performance ${perf}, LCP ${Math.round(lhr.audits['largest-contentful-paint']?.numericValue ?? -1)} ms`);
      results.push({ lhr, report, perf });
    }
    pages.push({ path, url, lhrs: results.map((r) => r.lhr) });
    // Keep the median run's full report.
    const median = [...results].sort((a, b) => a.perf - b.perf)[Math.floor(results.length / 2)];
    const slug = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\W+/g, '-');
    writeFileSync(join(reportDir, `${slug}.html`), median.report);
  }
} finally {
  chrome.kill();
  server.close();
}

// ── Verdict ──
const rows = evaluate(pages, budget);
const table = formatTable(rows);
const failures = formatFailures(rows);
writeFileSync(join(reportDir, 'summary.md'), `${table}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Lighthouse budget (mobile, median of ${runs})\n\n${table}\n`);
}
console.log(`\n${table}\n`);
if (failures.length) {
  console.log(`LIGHTHOUSE BUDGET FAILED: ${failures.length} check(s). Full reports: lighthouse-report/ (CI artifact "report").`);
  for (const f of failures) console.log(f);
  process.exitCode = 1;
} else {
  console.log(`Lighthouse budget passed: ${rows.length} checks on ${pages.length} page(s), median of ${runs} run(s).`);
}

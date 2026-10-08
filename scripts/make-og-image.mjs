#!/usr/bin/env node
// Generates public/og-image.png (social share preview, 1200×630) and
// public/apple-touch-icon.png (180×180) from the brand mark, rendered in Chromium
// with the real brand fonts (Sora, Work Sans from @fontsource).
// Run after changing the logo: `pnpm brand:og`, then commit the PNGs.
import { chromium } from '@playwright/test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const icon = await readFile('public/favicon.svg', 'utf8');
const font = (pkg, file) => pathToFileURL(resolve(`node_modules/@fontsource/${pkg}/files/${file}`)).href;
const css = `
  @font-face { font-family: Sora; font-weight: 700; src: url(${font('sora', 'sora-latin-700-normal.woff2')}); }
  @font-face { font-family: 'Work Sans'; font-weight: 400; src: url(${font('work-sans', 'work-sans-latin-400-normal.woff2')}); }
  html, body { margin: 0; background: #FBFAF6; }
  svg { display: block; }`;

const og = `<!doctype html><html><head><style>${css}
  .wrap { width: 1200px; height: 630px; display: flex; }
  .mark { width: 460px; height: 630px; background: #E6F0E2; display: flex; align-items: center; justify-content: center; }
  .mark svg { width: 240px; height: 320px; }
  .text { display: flex; flex-direction: column; justify-content: center; padding-left: 60px; }
  h1 { font: 700 72px/1.1 Sora, sans-serif; color: #1E2E52; margin: 0 0 28px; }
  p { font: 400 36px/1.4 'Work Sans', sans-serif; margin: 0; color: #3A4A68; }
  p.tag { color: #4565A6; }
</style></head><body><div class="wrap">
  <div class="mark">${icon}</div>
  <div class="text"><h1>pickle my paddle</h1><p>Pickleball paddle re-gritting</p><p class="tag">Pickled, not retired.</p></div>
</div></body></html>`;

const touch = `<!doctype html><html><head><style>${css}
  .wrap { width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; }
  .wrap svg { width: 112px; height: 150px; }
</style></head><body><div class="wrap">${icon}</div></body></html>`;

const dir = await mkdtemp(join(tmpdir(), 'brand-'));
const browser = await chromium.launch();
for (const [name, html, width, height] of [
  ['og-image.png', og, 1200, 630],
  ['apple-touch-icon.png', touch, 180, 180],
]) {
  const file = join(dir, `${name}.html`);
  await writeFile(file, html);
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/${name}` });
  await page.close();
}
await browser.close();
console.log('Wrote public/og-image.png and public/apple-touch-icon.png');

#!/usr/bin/env node
// SCRUM-14: broken-link check on the built site (dist/). Offline and fast:
// every internal href/src must resolve to a built file, and every in-page
// anchor (#id, or /page#id) must exist on the target page. External links are
// listed but not fetched (CI shouldn't fail because someone else's site is down).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, posix } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const pages = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('.html')) pages.push(p);
  }
})(dist);

const ids = new Map(); // file -> Set(ids)
const idsOf = (file) => {
  if (!ids.has(file)) {
    const html = readFileSync(file, 'utf8');
    ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(file);
};

// Resolve a site path (/about, /about/, /a.css) to a file in dist.
function resolve(path) {
  const clean = decodeURIComponent(path).replace(/\/+$/, '') || '/';
  const candidates = clean === '/' ? ['index.html'] : [clean, `${clean}.html`, `${clean}/index.html`];
  for (const c of candidates) {
    const f = join(dist, c);
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

const broken = [];
const external = new Set();
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const pagePath = '/' + relative(dist, page).split('\\').join('/');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const url = m[1].replace(/&amp;/g, '&');
    if (!url || /^(mailto:|tel:|data:|javascript:)/i.test(url)) continue;
    if (/^(https?:)?\/\//i.test(url)) { external.add(url); continue; }
    checked++;
    const [pathAndQuery, hash] = url.split('#');
    const path = (pathAndQuery ?? '').split('?')[0];
    let target = page;
    if (path) {
      const abs = path.startsWith('/') ? path : posix.join(posix.dirname(pagePath), path);
      target = resolve(abs);
      if (!target) { broken.push(`${pagePath}: ${url} (no such file)`); continue; }
    }
    if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) {
      broken.push(`${pagePath}: ${url} (no element with id="${hash}")`);
    }
  }
}

if (broken.length) {
  console.error(`Broken internal links (${broken.length}):\n  ${[...new Set(broken)].join('\n  ')}`);
  process.exit(1);
}
console.log(`Links OK: ${checked} internal links on ${pages.length} pages; ${external.size} external links not fetched.`);

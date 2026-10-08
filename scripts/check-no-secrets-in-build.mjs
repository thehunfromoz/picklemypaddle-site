#!/usr/bin/env node
// SCRUM-18: the static site may only contain public values. Fails if anything that
// looks like a private key or token ended up in the built pages (dist/).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const patterns = [
  [/\b(sk|rk)_(live|test)_[A-Za-z0-9]{10,}/, 'Stripe secret/restricted key'],
  [/\bwhsec_[A-Za-z0-9]{10,}/, 'Stripe webhook secret'],
  [/\bpat-[a-z0-9]{2,}-[A-Za-z0-9-]{20,}/, 'HubSpot private app token'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}|\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
];
const textExt = /\.(html|js|mjs|css|json|xml|txt|map|svg|webmanifest)$/i;

const files = [];
(function walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (textExt.test(name)) files.push(p);
  }
})(dir);

const hits = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [re, what] of patterns) if (re.test(text)) hits.push(`${file}: looks like a ${what}`);
}

if (hits.length) {
  console.error(`Private values found in the built site (only PUBLIC_ settings may reach pages):\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`No private keys or tokens in ${files.length} built files.`);

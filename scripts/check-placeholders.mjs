#!/usr/bin/env node
// Release gate: fails if any "[To confirm: …]" placeholder is left in the built
// site (dist/). Run after `pnpm build`; CI runs it on release tags only, so
// staging can show work in progress.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const found = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      for (const m of html.matchAll(/\[To confirm:[^\]]*\]/g)) found.push(`${path}: ${m[0]}`);
    }
  }
}

await walk(root);
if (found.length) {
  console.error(`${found.length} placeholder(s) still to confirm before release:\n${[...new Set(found)].join('\n')}`);
  process.exit(1);
}
console.log('No placeholders left.');

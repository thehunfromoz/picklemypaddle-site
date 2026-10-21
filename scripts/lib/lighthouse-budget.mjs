// SCRUM-37: judge Lighthouse reports against lighthouse-budget.json. Pure functions, no I/O, so the
// rules are unit-tested (tests/unit/lighthouse-budget.test.ts) without running a browser.

/** @param {number[]} nums */
export function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const ms = (v) => `${Math.round(v)} ms`;

/** Items of a Lighthouse "table" audit, or undefined when the audit is missing from the report. */
const items = (lhr, id) => lhr.audits?.[id]?.details?.items;

/** The resource-summary row for a resource type ('total', 'script', ...). */
function summaryRow(lhr, type) {
  return items(lhr, 'resource-summary')?.find((i) => i.resourceType === type);
}

/**
 * @param {{ path: string, url: string, lhrs: any[] }[]} pages every page with all of its runs
 * @param {any} budget the parsed lighthouse-budget.json
 * @returns {{ path: string, check: string, actual: string, limit: string, pass: boolean }[]}
 */
export function evaluate(pages, budget) {
  const rows = [];
  for (const { path, url, lhrs } of pages) {
    const add = (check, actual, limit, pass) => rows.push({ path, check, actual, limit, pass });
    // A missing audit is a failure, never a pass: a Lighthouse upgrade that renames an audit must
    // not turn a guard off without anyone noticing.
    const missing = (check, what) => add(check, `${what} missing from the report`, 'present', false);
    const med = (pick) => {
      const values = lhrs.map(pick).filter((v) => typeof v === 'number' && !Number.isNaN(v));
      return values.length === lhrs.length ? median(values) : undefined;
    };

    for (const [id, min] of Object.entries(budget.scores)) {
      const score = med((l) => (l.categories?.[id]?.score == null ? undefined : Math.round(l.categories[id].score * 100)));
      if (score === undefined) missing(`${id} score`, `category ${id}`);
      else add(`${id} score`, String(score), `>= ${min}`, score >= min);
    }

    for (const [id, max] of Object.entries(budget.metrics)) {
      const value = med((l) => l.audits?.[id]?.numericValue);
      const isTime = id !== 'cumulative-layout-shift';
      if (value === undefined) missing(id, `audit ${id}`);
      else add(id, isTime ? ms(value) : value.toFixed(3), `< ${isTime ? ms(max) : max}`, value < max);
    }

    const { structure } = budget;
    const requests = med((l) => summaryRow(l, 'total')?.requestCount);
    if (requests === undefined) missing('requests', 'resource-summary');
    else add('requests', String(requests), `<= ${structure.maxRequests}`, requests <= structure.maxRequests);

    const blocking = med((l) => items(l, 'render-blocking-insight')?.length);
    if (blocking === undefined) missing('render-blocking requests', 'audit render-blocking-insight');
    else {
      add('render-blocking requests', String(blocking), `<= ${structure.maxRenderBlocking}`, blocking <= structure.maxRenderBlocking);
    }

    if (structure.sameOriginOnly) {
      const requested = items(lhrs[0], 'network-requests');
      if (!requested) missing('same-origin requests only', 'audit network-requests');
      else {
        const origin = new URL(url).origin;
        const foreign = [...new Set(requested.map((r) => r.url).filter((u) => /^https?:/.test(u) && new URL(u).origin !== origin))];
        add('same-origin requests only', foreign.length ? foreign.join(', ') : 'yes', 'yes', foreign.length === 0);
      }
    }

    for (const [flag, id, check] of [
      [structure.fontDisplay, 'font-display-insight', 'fonts swap in (font-display)'],
      [structure.imageDelivery, 'image-delivery-insight', 'images responsive and optimised'],
    ]) {
      if (!flag) continue;
      const audit = lhrs[0].audits?.[id];
      if (!audit) missing(check, `audit ${id}`);
      else add(check, audit.score == null ? 'n/a' : audit.score >= 0.9 ? 'ok' : 'flagged', 'ok', audit.score == null || audit.score >= 0.9);
    }

    if (path === '/') {
      const scripts = med((l) => summaryRow(l, 'script')?.transferSize ?? 0);
      const total = med((l) => summaryRow(l, 'total')?.transferSize);
      add('JavaScript transferred', kb(scripts), `< ${kb(budget.home.scriptBytes)}`, scripts < budget.home.scriptBytes);
      if (total === undefined) missing('page weight', 'resource-summary');
      else add('page weight', kb(total), `< ${kb(budget.home.totalBytes)}`, total < budget.home.totalBytes);
    }
  }
  return rows;
}

/** Markdown table of every check, in page order. */
export function formatTable(rows) {
  const lines = ['| Page | Check | Result | Limit | |', '| --- | --- | --- | --- | --- |'];
  for (const r of rows) lines.push(`| ${r.path} | ${r.check} | ${r.actual} | ${r.limit} | ${r.pass ? 'pass' : '**FAIL**'} |`);
  return lines.join('\n');
}

/** One line per failed check, for the CI annotation. */
export function formatFailures(rows) {
  return rows.filter((r) => !r.pass).map((r) => `FAIL ${r.path}  ${r.check}: ${r.actual} (limit ${r.limit})`);
}

import { describe, expect, it } from 'vitest';
import { evaluate, formatFailures, median } from '../../scripts/lib/lighthouse-budget.mjs';
import budget from '../../lighthouse-budget.json';

// SCRUM-37: the rules that judge a Lighthouse run. A budget that silently passes is worse than none, so
// these pin down exactly what fails, including a report that is missing an audit.

interface Fake {
  performance?: number;
  accessibility?: number;
  bestPractices?: number;
  seo?: number;
  lcp?: number;
  cls?: number;
  requests?: number;
  blocking?: number;
  scriptBytes?: number;
  totalBytes?: number;
  foreignUrl?: string;
  fontScore?: number | null;
  imageScore?: number | null;
  drop?: string[];
}

/** A Lighthouse result shaped like the real one, healthy unless a field says otherwise. */
function fakeLhr(f: Fake = {}) {
  const audits: Record<string, unknown> = {
    'largest-contentful-paint': { numericValue: f.lcp ?? 1700 },
    'cumulative-layout-shift': { numericValue: f.cls ?? 0 },
    'resource-summary': {
      details: {
        items: [
          { resourceType: 'total', requestCount: f.requests ?? 12, transferSize: f.totalBytes ?? 120_000 },
          { resourceType: 'script', requestCount: 4, transferSize: f.scriptBytes ?? 6_000 },
        ],
      },
    },
    'render-blocking-insight': {
      details: { items: Array.from({ length: f.blocking ?? 2 }, (_, i) => ({ url: `http://127.0.0.1:1/b${i}.css` })) },
    },
    'network-requests': {
      details: { items: [{ url: 'http://127.0.0.1:1/' }, { url: 'data:image/svg+xml,x' }, ...(f.foreignUrl ? [{ url: f.foreignUrl }] : [])] },
    },
    'font-display-insight': { score: f.fontScore === undefined ? 1 : f.fontScore },
    'image-delivery-insight': { score: f.imageScore === undefined ? 1 : f.imageScore },
  };
  for (const id of f.drop ?? []) delete audits[id];
  return {
    categories: {
      performance: { score: (f.performance ?? 99) / 100 },
      accessibility: { score: (f.accessibility ?? 100) / 100 },
      'best-practices': { score: (f.bestPractices ?? 100) / 100 },
      seo: { score: (f.seo ?? 100) / 100 },
    },
    audits,
  };
}

const page = (path: string, ...lhrs: ReturnType<typeof fakeLhr>[]) => ({ path, url: `http://127.0.0.1:1${path}`, lhrs });
const failed = (rows: ReturnType<typeof evaluate>) => rows.filter((r) => !r.pass).map((r) => `${r.path} ${r.check}`);

describe('median', () => {
  it('takes the middle value, or the mean of the middle two', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('Lighthouse budget', () => {
  it('passes a healthy page', () => {
    expect(failed(evaluate([page('/', fakeLhr()), page('/faq', fakeLhr())], budget))).toEqual([]);
  });

  it('holds the thresholds agreed in SCRUM-37', () => {
    expect(budget.scores).toEqual({ performance: 90, accessibility: 100, 'best-practices': 95, seo: 95 });
    expect(budget.metrics['largest-contentful-paint']).toBe(2500);
    expect(budget.metrics['cumulative-layout-shift']).toBe(0.1);
    expect(budget.home).toMatchObject({ scriptBytes: 50 * 1024, totalBytes: 1024 * 1024 });
    expect(budget.urls).toEqual(expect.arrayContaining(['/', '/faq']));
    expect(budget.urls.some((u: string) => u.startsWith('/blog/'))).toBe(true);
  });

  it('fails each category under its minimum, and accessibility must be exactly 100', () => {
    const rows = evaluate([page('/', fakeLhr({ performance: 89, accessibility: 99, bestPractices: 94, seo: 94 }))], budget);
    expect(failed(rows)).toEqual(['/ performance score', '/ accessibility score', '/ best-practices score', '/ seo score']);
    expect(failed(evaluate([page('/', fakeLhr({ performance: 90, bestPractices: 95, seo: 95 }))], budget))).toEqual([]);
  });

  it('LCP must be under 2.5 s and CLS under 0.1 (strictly)', () => {
    expect(failed(evaluate([page('/', fakeLhr({ lcp: 2500 }))], budget))).toEqual(['/ largest-contentful-paint']);
    expect(failed(evaluate([page('/', fakeLhr({ cls: 0.1 }))], budget))).toEqual(['/ cumulative-layout-shift']);
    expect(failed(evaluate([page('/', fakeLhr({ lcp: 2499, cls: 0.099 }))], budget))).toEqual([]);
  });

  it('limits JavaScript and total page weight on the landing page only', () => {
    expect(failed(evaluate([page('/', fakeLhr({ scriptBytes: 50 * 1024 }))], budget))).toEqual(['/ JavaScript transferred']);
    expect(failed(evaluate([page('/', fakeLhr({ totalBytes: 2 * 1024 * 1024 }))], budget))).toEqual(['/ page weight']);
    // The same weight on another page is not part of the budget.
    expect(failed(evaluate([page('/faq', fakeLhr({ totalBytes: 2 * 1024 * 1024, scriptBytes: 99_999 }))], budget))).toEqual([]);
  });

  it('fails a third render-blocking request or too many requests', () => {
    expect(failed(evaluate([page('/', fakeLhr({ blocking: 3 }))], budget))).toEqual(['/ render-blocking requests']);
    expect(failed(evaluate([page('/faq', fakeLhr({ requests: 21 }))], budget))).toEqual(['/faq requests']);
  });

  it('fails any request to another origin, but allows data: URLs', () => {
    const rows = evaluate([page('/', fakeLhr({ foreignUrl: 'https://fonts.googleapis.com/css2?family=Sora' }))], budget);
    expect(failed(rows)).toEqual(['/ same-origin requests only']);
    expect(rows.find((r) => r.check === 'same-origin requests only')?.actual).toContain('fonts.googleapis.com');
  });

  it('fails when fonts or images are flagged, and ignores audits that do not apply', () => {
    expect(failed(evaluate([page('/', fakeLhr({ fontScore: 0 }))], budget))).toEqual(['/ fonts swap in (font-display)']);
    expect(failed(evaluate([page('/', fakeLhr({ imageScore: 0.5 }))], budget))).toEqual(['/ images responsive and optimised']);
    expect(failed(evaluate([page('/', fakeLhr({ fontScore: null, imageScore: null }))], budget))).toEqual([]);
  });

  it('judges the median of the runs: one bad run passes, two bad runs fail', () => {
    const slow = fakeLhr({ performance: 70, lcp: 4000 });
    expect(failed(evaluate([page('/faq', fakeLhr(), slow, fakeLhr())], budget))).toEqual([]);
    expect(failed(evaluate([page('/faq', fakeLhr(), slow, slow)], budget))).toEqual(['/faq performance score', '/faq largest-contentful-paint']);
  });

  it('fails, rather than passes, when the report lacks an audit', () => {
    for (const id of ['resource-summary', 'render-blocking-insight', 'network-requests', 'font-display-insight', 'image-delivery-insight', 'largest-contentful-paint']) {
      const rows = evaluate([page('/', fakeLhr({ drop: [id] }))], budget);
      expect(failed(rows), `without ${id}`).not.toEqual([]);
      expect(rows.some((r) => !r.pass && r.actual.includes('missing from the report')), `without ${id}`).toBe(true);
    }
  });

  it('lists every failure on its own line for the CI annotation', () => {
    const rows = evaluate([page('/', fakeLhr({ totalBytes: 3 * 1024 * 1024, blocking: 4 }))], budget);
    const lines = formatFailures(rows);
    expect(lines).toHaveLength(2);
    expect(lines.join('\n')).toMatch(/FAIL \/ {2}page weight: 3072\.0 KB \(limit < 1024\.0 KB\)/);
  });
});

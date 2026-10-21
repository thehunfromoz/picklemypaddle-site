import { test, expect, type APIRequestContext } from '@playwright/test';

// SCRUM-36: search and share basics. Titles and descriptions fit what Google shows and are unique, the
// canonical, sitemap and robots.txt agree with each other and come from SITE_URL, share previews use the
// rendered og-image.png, and the JSON-LD is the right shape. Staging noindex is a gateway job and is
// tested in environment.spec.ts; the inverse ("the live site is indexable") is tested here.
//
// This file must stay self-contained: the smoke-test image (tests/smoke/Dockerfile) packages only
// tests/e2e and runs it against staging, so it reads what the page shows, never src/.
//
// Schema.org validity of the JSON-LD is enforced at compile time: src/lib/schema.ts is typed with
// schema-dts (generated from the schema.org vocabulary) and `pnpm check` fails on an unknown property.
test.skip(({ isMobile }) => isMobile, 'content checks do not depend on the viewport; the desktop project is enough');

const staging = process.env.EXPECT_STAGING === '1';
// Staging and production run the same image, so even on staging the canonical points at production.
const productionOrigin = (process.env.EXPECT_SITE_URL ?? 'https://www.picklemypaddle.com').replace(/\/$/, '');

// JSON-LD is parsed from the page and probed property by property below, so it is deliberately loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonLd = Record<string, any>;

interface Head {
  path: string;
  title: string;
  description: string;
  canonical: string;
  meta: Record<string, string>;
  jsonld: JsonLd[];
}

async function sitemapPaths(request: APIRequestContext) {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return { xml, locs, paths: locs.map((l) => new URL(l).pathname) };
}

async function readHead(request: APIRequestContext, path: string): Promise<Head> {
  const res = await request.get(path);
  const html = await res.text();
  const meta: Record<string, string> = {};
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g)) meta[m[1]] = decode(m[2]);
  return {
    path,
    title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
    description: meta['description'] ?? '',
    canonical: html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '',
    meta,
    jsonld: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(decode(m[1]))),
  };
}

function ofType(list: JsonLd[], type: string): JsonLd {
  const found = list.find((j) => j['@type'] === type);
  if (!found) throw new Error(`no ${type} in the page's JSON-LD (found: ${list.map((j) => j['@type']).join(', ') || 'none'})`);
  return found;
}

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test.describe('sitemap and robots', () => {
  test('sitemap.xml is a urlset of unique, same-origin canonical URLs', async ({ request }) => {
    const { xml, locs, paths } = await sitemapPaths(request);
    expect(xml).toContain('<urlset');
    expect(new Set(locs).size).toBe(locs.length);
    expect(new Set(locs.map((l) => new URL(l).origin)).size).toBe(1);
    expect(paths).toEqual(expect.arrayContaining(['/', '/about/', '/clubs/', '/faq/', '/blog/', '/blog/welcome/', '/privacy/', '/terms/']));
    expect(paths).not.toContain('/404/');
    if (process.env.BASE_URL) expect(new URL(locs[0]).origin).toBe(productionOrigin);
  });

  test('every sitemap URL is a live page whose canonical is that exact URL', async ({ request }) => {
    const { locs, paths } = await sitemapPaths(request);
    for (const [i, path] of paths.entries()) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const { canonical } = await readHead(request, path);
      expect(canonical, path).toBe(locs[i]);
    }
  });

  test('robots.txt allows crawling and names the sitemap', async ({ request }) => {
    test.skip(staging, 'staging serves a disallow-all robots.txt from its gateway');
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/^User-agent: \*$/m);
    expect(body).not.toMatch(/^Disallow: \/\s*$/m);
    const { locs } = await sitemapPaths(request);
    expect(body).toContain(`Sitemap: ${new URL('/sitemap.xml', locs[0])}`);
  });
});

test.describe('titles, descriptions and canonicals', () => {
  test('every page has a title up to 60 characters and a 70 to 160 character description', async ({ request }) => {
    const { paths } = await sitemapPaths(request);
    for (const path of paths) {
      const { title, description } = await readHead(request, path);
      expect(title.length, `${path} title "${title}"`).toBeGreaterThan(0);
      expect(title.length, `${path} title "${title}"`).toBeLessThanOrEqual(60);
      expect(description.length, `${path} description "${description}"`).toBeGreaterThanOrEqual(70);
      expect(description.length, `${path} description "${description}"`).toBeLessThanOrEqual(160);
    }
  });

  test('titles and descriptions are unique across pages, the 404 page included', async ({ request }) => {
    const { paths } = await sitemapPaths(request);
    const heads = [];
    for (const path of paths) heads.push(await readHead(request, path));
    const notFound = await request.get('/no-such-page-for-seo-test');
    expect(notFound.status()).toBe(404);
    const notFoundHtml = await notFound.text();
    heads.push({
      path: '404',
      title: decode(notFoundHtml.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
      description: decode(notFoundHtml.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
    } as Head);
    for (const key of ['title', 'description'] as const) {
      const values = heads.map((h) => h[key]);
      const dupes = values.filter((v, i) => values.indexOf(v) !== i);
      expect(dupes, `duplicate ${key}s`).toEqual([]);
    }
    expect(notFoundHtml).toContain('<meta name="robots" content="noindex">');
  });

  test('canonical is an absolute URL on the production origin', async ({ request }) => {
    test.skip(!process.env.BASE_URL, 'astro preview is built with the local SITE_URL; the image is built with the production one');
    const { paths } = await sitemapPaths(request);
    for (const path of paths) {
      const { canonical } = await readHead(request, path);
      expect(canonical.startsWith(`${productionOrigin}/`), `${path} -> ${canonical}`).toBe(true);
    }
  });
});

test.describe('share previews', () => {
  test('Open Graph and Twitter tags agree with the page and use og-image.png', async ({ request }) => {
    const { paths } = await sitemapPaths(request);
    for (const path of paths) {
      const { title, description, canonical, meta } = await readHead(request, path);
      expect(meta['og:title'], path).toBe(title);
      expect(meta['og:description'], path).toBe(description);
      expect(meta['og:url'], path).toBe(canonical);
      expect(meta['og:image'], path).toBe(new URL('/og-image.png', canonical).toString());
      expect(meta['og:image:width'], path).toBe('1200');
      expect(meta['og:image:height'], path).toBe('630');
      expect(meta['og:image:type'], path).toBe('image/png');
      expect(meta['og:image:alt'], path).not.toBe('');
      expect(meta['twitter:card'], path).toBe('summary_large_image');
      expect(meta['twitter:title'], path).toBe(title);
      expect(meta['twitter:description'], path).toBe(description);
      expect(meta['twitter:image'], path).toBe(meta['og:image']);
      expect(meta['twitter:image:alt'], path).toBe(meta['og:image:alt']);
    }
  });

  test('og-image.png is served as a 1200x630 PNG, the size the tags promise', async ({ request }) => {
    const res = await request.get('/og-image.png');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    const png = await res.body();
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });
});

test.describe('indexing', () => {
  test('the live site is indexable: no noindex header or meta tag on any listed page', async ({ request }) => {
    test.skip(staging, 'staging is noindex on purpose (environment.spec.ts checks it)');
    const { paths } = await sitemapPaths(request);
    for (const path of paths) {
      const res = await request.get(path);
      expect(res.headers()['x-robots-tag'] ?? '', path).not.toMatch(/noindex/i);
      expect(await res.text(), path).not.toMatch(/<meta[^>]+name="robots"[^>]+noindex/i);
    }
  });
});

test.describe('structured data', () => {
  test('home page: Organization and Service, tied together and matching what the page shows', async ({ request }) => {
    const { jsonld, canonical } = await readHead(request, '/');
    const org = ofType(jsonld, 'Organization');
    const service = ofType(jsonld, 'Service');
    for (const j of jsonld) expect(j['@context']).toBe('https://schema.org');

    expect(org.name).toBe('PickleMyPaddle');
    expect(org.url).toBe(canonical);
    expect(org['@id']).toBe(new URL('/#organization', canonical).toString());
    expect(org.areaServed).toMatchObject({ '@type': 'Country', name: 'Australia' });
    expect((await request.get(new URL(org.logo).pathname)).status()).toBe(200);
    expect(JSON.stringify(org)).not.toContain('[To confirm');

    expect(service.serviceType).toBe('Pickleball paddle re-gritting');
    expect(service.provider).toEqual({ '@id': org['@id'] });
    expect(service.areaServed).toMatchObject({ '@type': 'Country', name: 'Australia' });
    expect(service.offers).toMatchObject({ '@type': 'Offer', price: 60, priceCurrency: 'AUD' });
    // The marked-up price is the price on the page.
    expect(await (await request.get('/')).text()).toContain(`A$${service.offers.price}`);
    expect(new URL(service.offers.url).origin).toBe(new URL(canonical).origin);
  });

  test('FAQ page: FAQPage matches the questions and answers on the page, without unconfirmed ones', async ({ page, request }) => {
    const { jsonld } = await readHead(request, '/faq');
    expect(jsonld).toHaveLength(1);
    const [faqPage] = jsonld;
    expect(faqPage['@context']).toBe('https://schema.org');
    expect(faqPage['@type']).toBe('FAQPage');

    // What the markup says is what the page shows (answers still holding a [To confirm: …] are not marked up).
    await page.goto('/faq');
    const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
    // Scoped to <main>: the header's mobile menu is also a <details> (SCRUM-39) and is not an FAQ item.
    const shown: { q: string; a: string }[] = [];
    for (const item of await page.locator('main details').all()) {
      shown.push({
        q: norm((await item.locator('summary').innerText()).replace(/\+\s*$/, '')),
        a: norm(await item.locator('p').first().textContent().then((t) => t ?? '')),
      });
    }
    const published = shown.filter((f) => !f.a.includes('[To confirm'));
    expect(published.length).toBeGreaterThan(0);
    expect(faqPage.mainEntity).toHaveLength(published.length);
    for (const [i, q] of faqPage.mainEntity.entries()) {
      expect(q['@type']).toBe('Question');
      expect(q.acceptedAnswer['@type']).toBe('Answer');
      expect(norm(q.name)).toBe(published[i].q);
      expect(norm(q.acceptedAnswer.text)).toBe(published[i].a);
    }
  });

  test('pages other than home and FAQ carry no stray structured data', async ({ request }) => {
    for (const path of ['/about', '/clubs', '/blog', '/privacy', '/terms']) {
      expect((await readHead(request, path)).jsonld, path).toEqual([]);
    }
  });
});

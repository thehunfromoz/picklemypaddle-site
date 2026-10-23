import type { APIRoute } from 'astro';
import { publishedPosts } from '../lib/blog';

// SCRUM-36: /sitemap.xml lists every indexable page once, at exactly its canonical URL (the same
// trailing-slash form BaseLayout puts in <link rel="canonical">; tests/e2e/seo.spec.ts checks they agree).
// Pages are found from the files in src/pages, so a new page is listed without editing this file.
// Left out: the 404 page, endpoints (they have no .astro file) and dynamic routes (the blog posts and
// other-language blog indexes, added below from the content, SCRUM-34).
const pages = Object.keys(import.meta.glob('./**/*.astro'))
  .map((file) => file.replace(/^\.\//, '').replace(/\.astro$/, ''))
  .filter((route) => !route.includes('[') && route !== '404')
  .map((route) => (route === 'index' ? '/' : `/${route.replace(/\/index$/, '')}/`));

export const GET: APIRoute = async ({ site }) => {
  const posts = await publishedPosts();
  const langIndexes = [...new Set(posts.map((p) => p.url.replace(/\/[^/]+$/, '')))];
  const entries: { path: string; lastmod?: Date }[] = [
    ...pages.map((path) => ({ path })),
    ...langIndexes.map((index) => ({ path: `${index}/` })),
    ...posts.map(({ post, url }) => ({ path: `${url}/`, lastmod: post.data.date })),
  ];
  // Blog index has no [..] in its name, so it is already in `pages`; keep the list sorted and unique.
  const unique = [...new Map(entries.map((e) => [e.path, e])).values()].sort((a, b) => a.path.localeCompare(b.path));
  const urls = unique
    .map(
      (e) =>
        `  <url><loc>${new URL(e.path, site)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`,
    )
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

import type { APIRoute } from 'astro';

// SCRUM-36: the live site is indexable and points crawlers at its sitemap. Staging serves its own
// disallow-all robots.txt and noindex header from the staging gateway (SCRUM-38), never from this image.
export const GET: APIRoute = ({ site }) => {
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap.xml', site)}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

import type { APIRoute } from 'astro';
import { brand } from '../config/brand';
import { defaultLang, languages } from '../config/i18n';
import { publishedPosts } from '../lib/blog';

// SCRUM-34: RSS 2.0 feed of the default-language blog at /rss.xml, newest first. Written by
// hand (no extra dependency); every page links it with <link rel="alternate">.
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const posts = await publishedPosts(defaultLang);
  const blogUrl = new URL('/blog/', site);
  const items = posts
    .map(({ post, url }) => {
      const link = new URL(`${url}/`, site).href;
      return [
        '    <item>',
        `      <title>${escape(post.data.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <description>${escape(post.data.description)}</description>`,
        `      <pubDate>${post.data.date.toUTCString()}</pubDate>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');
  const latest = posts[0]?.post.data.date;
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escape(`${brand.name} blog`)}</title>`,
    `    <link>${blogUrl.href}</link>`,
    `    <atom:link href="${new URL('/rss.xml', site).href}" rel="self" type="application/rss+xml" />`,
    '    <description>Pickleball paddle care, how re-gritting works and news from PickleMyPaddle.</description>',
    `    <language>${languages[defaultLang].htmlLang.toLowerCase()}</language>`,
    ...(latest ? [`    <lastBuildDate>${latest.toUTCString()}</lastBuildDate>`] : []),
    items,
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
  return new Response(`${body}\n`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};

// SCRUM-34: blog posts sit in language folders and their frontmatter validates.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { blogSchema } from '../../src/lib/blog-schema';
import { alternatesFor, blogPath, defaultLang, enabledLangs, splitPostId, type Lang } from '../../src/config/i18n';

const blogDir = resolve(__dirname, '../../src/content/blog');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(blogDir).filter((f) => !f.endsWith('.gitkeep'));
const posts = files.filter((f) => f.endsWith('.md'));

function frontmatter(file: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'));
  if (!match) throw new Error(`${file} has no frontmatter`);
  return parse(match[1]) as Record<string, unknown>;
}

// Stand-in for Astro's image(): the path is kept as a string and checked to exist below.
const schema = blogSchema(() => z.string());

describe('blog content layout', () => {
  it('has at least one post', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it('keeps only Markdown posts in the blog folder', () => {
    expect(files.filter((f) => !f.endsWith('.md')).map((f) => relative(blogDir, f))).toEqual([]);
  });

  it.each(posts.map((f) => [relative(blogDir, f)]))('%s sits in an enabled language folder', (rel) => {
    const parts = rel.split('/');
    expect(parts, 'expected <lang>/<slug>.md').toHaveLength(2);
    expect(enabledLangs).toContain(parts[0]);
    expect(parts[1]).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/);
  });
});

describe('blog frontmatter', () => {
  it.each(posts.map((f) => [relative(blogDir, f), f]))('%s validates against the content schema', (_rel, file) => {
    const data = frontmatter(file);
    const result = schema.safeParse(data);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    if (typeof data.cover === 'string' && data.cover) {
      expect(existsSync(resolve(dirname(file), data.cover)), `cover image ${data.cover} is missing`).toBe(true);
    }
  });

  it.each(posts.map((f) => [relative(blogDir, f), f]))('%s has no top-level (#) heading in its body', (_rel, file) => {
    // The title is the page's <h1>; a "# " line in the body would make a second one.
    const body = readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '');
    const h1 = body.split('\n').filter((line) => /^#\s/.test(line));
    expect(h1, 'start body headings at ## (Heading 2 in the editor)').toEqual([]);
  });

  const base = { title: 'T', description: 'Paddle faces wear smooth with play, and re-gritting can bring them back.', date: '2026-10-23' };

  it('accepts the fields the editor writes, including an empty SEO title', () => {
    const r = schema.safeParse({ ...base, seoTitle: '', tags: [], draft: false, cover: null, coverAlt: '' });
    expect(r.success).toBe(true);
  });

  it('requires alt text when there is a cover image', () => {
    expect(schema.safeParse({ ...base, cover: 'x.jpg' }).success).toBe(false);
    expect(schema.safeParse({ ...base, cover: 'x.jpg', coverAlt: '  ' }).success).toBe(false);
    expect(schema.safeParse({ ...base, cover: 'x.jpg', coverAlt: 'A re-gritted paddle' }).success).toBe(true);
  });

  it('requires a 70 to 160 character summary, like every other page', () => {
    expect(schema.safeParse({ ...base, description: 'Launch of the PickleMyPaddle service' }).success).toBe(false);
    expect(schema.safeParse({ ...base, description: 'x'.repeat(70) }).success).toBe(true);
    expect(schema.safeParse({ ...base, description: 'x'.repeat(160) }).success).toBe(true);
    expect(schema.safeParse({ ...base, description: 'x'.repeat(161) }).success).toBe(false);
  });

  it('requires a title, summary and date', () => {
    expect(schema.safeParse({ description: 'D', date: '2026-10-23' }).success).toBe(false);
    expect(schema.safeParse({ title: 'T', date: '2026-10-23' }).success).toBe(false);
    expect(schema.safeParse({ title: 'T', description: 'D' }).success).toBe(false);
  });
});

describe('blog URLs', () => {
  it('keeps English at /blog/<slug>', () => {
    expect(defaultLang).toBe('en');
    expect(blogPath('en', 'welcome')).toBe('/blog/welcome');
    expect(blogPath('en')).toBe('/blog');
  });

  it('puts other languages under /<lang>/blog', () => {
    expect(blogPath('ga' as Lang, 'welcome')).toBe('/ga/blog/welcome');
    expect(blogPath('ga' as Lang)).toBe('/ga/blog');
  });

  it('splits entry ids into language and slug', () => {
    expect(splitPostId('en/welcome')).toEqual({ lang: 'en', slug: 'welcome' });
    expect(splitPostId('welcome')).toEqual({ lang: '', slug: 'welcome' });
  });

  it('adds no hreflang links for a post with no translations', () => {
    const en = { lang: 'en', slug: 'welcome', url: '/blog/welcome' };
    expect(alternatesFor(en, [en, { lang: 'en', slug: 'other', url: '/blog/other' }])).toEqual([]);
  });
});

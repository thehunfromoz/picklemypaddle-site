// SCRUM-34: the editor writes exactly the frontmatter the site's content schema reads, into the
// language folders, on its own branches. (The editor config is used only by the editor build.)
import { describe, expect, it } from 'vitest';
import keystatic from '../../keystatic.config';
import { enabledLangs } from '../../src/config/i18n';
import { blogSchema } from '../../src/lib/blog-schema';
import { z } from 'astro/zod';

const collections = keystatic.collections ?? {};
const schemaKeys = Object.keys(blogSchema(() => z.string()).shape).sort();

describe('Keystatic editor config', () => {
  it('has one blog collection per enabled language, writing to its language folder', () => {
    expect(Object.keys(collections).sort()).toEqual(enabledLangs.map((l) => `blog-${l}`).sort());
    for (const lang of enabledLangs) {
      expect(collections[`blog-${lang}`].path).toBe(`src/content/blog/${lang}/*`);
    }
  });

  it.each(enabledLangs)('blog-%s writes exactly the content schema fields, plus the body', (lang) => {
    const fields = Object.keys(collections[`blog-${lang}`].schema).filter((k) => k !== 'body').sort();
    expect(fields).toEqual(schemaKeys);
    expect(collections[`blog-${lang}`].format).toEqual({ contentField: 'body' });
  });

  it.each(enabledLangs)('blog-%s refuses a summary outside 70 to 160 characters while writing', (lang) => {
    // The same rule the site's SEO test applies, so a post can't fail CI on it (site PR #42).
    const summary = collections[`blog-${lang}`].schema.description as unknown as { validate: (v: string) => unknown };
    expect(() => summary.validate('Launch of the PickleMyPaddle service')).toThrow(/at least 70/);
    expect(() => summary.validate('x'.repeat(161))).toThrow(/no longer than 160/);
    expect(() => summary.validate('x'.repeat(70))).not.toThrow();
  });

  it('stores posts in GitHub on blog/ branches of the site repo only', () => {
    expect(keystatic.storage).toEqual({
      kind: 'github',
      repo: { owner: 'thehunfromoz', name: 'picklemypaddle-site' },
      branchPrefix: 'blog/',
    });
  });
});

// Blog languages (SCRUM-34). Posts live in src/content/blog/<lang>/<slug>.md.
//
// The default language keeps the original URLs (/blog/<slug>), so nothing changes for
// visitors. Any other enabled language is served at /<lang>/blog/<slug>, and posts with
// the same <slug> in several languages link to each other with hreflang.
//
// To add a language: add it here, create src/content/blog/<lang>/, and keystatic.config.ts
// gives it its own collection in the editor automatically.

export const defaultLang = 'en';

export const languages = {
  en: { label: 'English', htmlLang: 'en-AU' },
} as const satisfies Record<string, { label: string; htmlLang: string }>;

export type Lang = keyof typeof languages;

export const enabledLangs = Object.keys(languages) as Lang[];

export function isLang(value: string): value is Lang {
  return Object.hasOwn(languages, value);
}

/** URL of the blog index (no slug) or a post, in the given language. No trailing slash. */
export function blogPath(lang: Lang, slug?: string): string {
  const prefix = lang === defaultLang ? '' : `/${lang}`;
  return slug ? `${prefix}/blog/${slug}` : `${prefix}/blog`;
}

/** Splits a blog entry id ("en/welcome") into its language folder and slug. */
export function splitPostId(id: string): { lang: string; slug: string } {
  const at = id.indexOf('/');
  if (at <= 0) return { lang: '', slug: id };
  return { lang: id.slice(0, at), slug: id.slice(at + 1) };
}

export interface Alternate {
  hreflang: string;
  href: string;
}

/**
 * hreflang links for a post: one per published translation (same slug, another language),
 * plus x-default pointing at the default-language version. Empty when there is only one
 * language version, so single-language posts carry no hreflang at all.
 */
export function alternatesFor<T extends { lang: string; slug: string; url: string }>(current: T, all: T[]): Alternate[] {
  const versions = all.filter((p) => p.slug === current.slug && isLang(p.lang));
  if (versions.length < 2) return [];
  const links = versions.map((p) => ({ hreflang: languages[p.lang as Lang].htmlLang, href: p.url }));
  const fallback = versions.find((p) => p.lang === defaultLang) ?? versions[0];
  return [...links, { hreflang: 'x-default', href: fallback.url }];
}

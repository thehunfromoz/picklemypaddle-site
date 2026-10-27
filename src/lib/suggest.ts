/**
 * Brand and model suggestions for the order form (SCRUM-40). Pure functions, so they are unit
 * tested; the combobox (src/scripts/combobox.ts) only draws what these return.
 */
// Named imports, so only these two fields are bundled into the page's script, never the file's
// "_about" note (the public-image check refuses the blog editor's name anywhere in the site).
import { brands, reviewed } from '../data/paddle-brands.json';

export interface BrandEntry {
  brand: string;
  models: string[];
}

export const PADDLE_BRANDS: readonly BrandEntry[] = brands;
/** False until Attila has checked the drafted list; the release gate blocks a release until then. */
export const BRAND_LIST_REVIEWED: boolean = reviewed;

export const MAX_SUGGESTIONS = 8;

/** Lower-case letters and digits only, so "JOOLA", "joola" and "Jo-ola" compare equal. */
export const normalise = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Items matching what was typed, best first: the whole name starts with it, then any word does,
 * then it appears anywhere. Alphabetical within each group. Nothing for an empty query.
 */
export function matchSuggestions(items: readonly string[], query: string, limit = MAX_SUGGESTIONS): string[] {
  const q = normalise(query);
  if (!q) return [];
  const rank = (item: string): number => {
    if (normalise(item).startsWith(q)) return 0;
    if (item.split(/[\s\-&/]+/).some((w) => normalise(w).startsWith(q))) return 1;
    if (normalise(item).includes(q)) return 2;
    return -1;
  };
  return items
    .map((item) => ({ item, r: rank(item) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.item.localeCompare(b.item))
    .slice(0, limit)
    .map((x) => x.item);
}

export const brandNames = (list: readonly BrandEntry[] = PADDLE_BRANDS): string[] => list.map((b) => b.brand);

/** The chosen brand's models, or none when the brand isn't one we list (free text is fine). */
export function modelsFor(brand: string, list: readonly BrandEntry[] = PADDLE_BRANDS): string[] {
  const b = normalise(brand);
  return b ? (list.find((e) => normalise(e.brand) === b)?.models ?? []) : [];
}

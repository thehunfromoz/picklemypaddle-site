/** Brand and model suggestions (SCRUM-40). */
import { describe, expect, it } from 'vitest';
import { brandNames, matchSuggestions, MAX_SUGGESTIONS, modelsFor, normalise, PADDLE_BRANDS } from '../../src/lib/suggest';
import data from '../../src/data/paddle-brands.json';

describe('the curated list', () => {
  it('has unique brands, each with unique models', () => {
    const brands = PADDLE_BRANDS.map((b) => normalise(b.brand));
    expect(new Set(brands).size).toBe(brands.length);
    for (const b of PADDLE_BRANDS) expect(new Set(b.models.map(normalise)).size).toBe(b.models.length);
  });
  it('says whether Attila has reviewed it (the release gate reads this)', () => {
    expect(typeof data.reviewed).toBe('boolean');
  });
});

describe('matchSuggestions', () => {
  it('offers a brand after 1 to 2 characters ("Sel" → Selkirk)', () => {
    expect(matchSuggestions(brandNames(), 'Sel')[0]).toBe('Selkirk');
    expect(matchSuggestions(brandNames(), 's').length).toBeGreaterThan(0);
  });
  it('ignores case and punctuation', () => {
    expect(matchSuggestions(brandNames(), 'joo')).toContain('JOOLA');
    expect(matchSuggestions(brandNames(), 'bread &')).toContain('Bread & Butter');
    expect(matchSuggestions(brandNames(), 'sixz')).toContain('Six Zero');
  });
  it('ranks whole-name starts, then word starts, then anywhere', () => {
    expect(matchSuggestions(['Ab Power', 'Power X', 'XPowerX', 'Other'], 'pow')).toEqual(['Power X', 'Ab Power', 'XPowerX']);
  });
  it('offers nothing for an empty query or no match, and at most 8', () => {
    expect(matchSuggestions(brandNames(), '  ')).toEqual([]);
    expect(matchSuggestions(brandNames(), 'zzzz')).toEqual([]);
    expect(matchSuggestions(Array.from({ length: 30 }, (_, i) => `Paddle ${i}`), 'pad')).toHaveLength(MAX_SUGGESTIONS);
  });
});

describe('modelsFor', () => {
  it('narrows the models to the chosen brand, whatever its case', () => {
    expect(modelsFor('selkirk')).toContain('Vanguard Power Air');
    expect(modelsFor('selkirk')).not.toContain('Perseus CFS 16');
    expect(matchSuggestions(modelsFor('JOOLA'), 'per')[0]).toBe('Perseus 3S');
  });
  it('offers no models for an unlisted brand (free text still works)', () => {
    expect(modelsFor('My Homemade Paddle Co')).toEqual([]);
    expect(modelsFor('')).toEqual([]);
  });
});

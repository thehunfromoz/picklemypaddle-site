/**
 * Website side of SCRUM-81: reading /api/pricing safely, the postage hint and the dated GST note.
 */
import { describe, expect, it } from 'vitest';
import { siteData } from '../../src/data/siteData';
import { GST_NOTE, gstNoteOn, money, parsePricing, postageFor, postageHint, pricingUrlFrom, sydneyToday, type PricingResponse } from '../../src/lib/pricing';

const sample: PricingResponse = {
  date: '2026-10-30',
  currency: 'AUD',
  termsVersion: 'price:2026-01-01;gst:none',
  pricePerPaddleCents: 6000,
  gst: { registered: false, note: 'No GST is charged: we aren’t registered for GST.' },
  postage: {
    table: '2026-07-01',
    basis: 'cubic',
    byPaddles: [
      { paddles: 1, minCents: 2225, maxCents: 2225 },
      { paddles: 10, minCents: 2870, maxCents: 5510 },
    ],
  },
};

describe('pricing from the service', () => {
  it('lives beside the order endpoint, on the same origin', () => {
    expect(pricingUrlFrom('/api/orders')).toBe('/api/pricing');
    expect(pricingUrlFrom('http://localhost:8080/api/orders/')).toBe('http://localhost:8080/api/pricing');
  });

  it('accepts only the expected shape, so a bad answer keeps the built wording', () => {
    expect(parsePricing(sample)).toEqual(sample);
    for (const bad of [null, 'x', {}, { ...sample, pricePerPaddleCents: -1 }, { ...sample, gst: {} }, { ...sample, postage: { byPaddles: [{ paddles: 1 }] } }]) {
      expect(parsePricing(bad)).toBeNull();
    }
  });

  it('shows a single price, or a range when it depends on where the parcel goes', () => {
    expect(money(2225)).toBe('A$22.25');
    expect(money(6000)).toBe('A$60');
    expect(postageFor(sample, 1)).toBe('A$22.25');
    expect(postageFor(sample, 10)).toBe('A$28.70–A$55.10');
    expect(postageFor(sample, 4)).toBeNull();
    expect(postageHint(sample, 1)).toBe(' (about A$22.25 for 1 paddle, confirmed when we accept your order)');
    expect(postageHint(sample, 4)).toBe('');
    expect(postageHint(null, 1)).toBe('');
  });
});

describe('GST note by date', () => {
  it('switches on the registration day, in Sydney time', () => {
    expect(gstNoteOn('2027-02-28', '2027-03-01')).toBe(GST_NOTE.notRegistered);
    expect(gstNoteOn('2027-03-01', '2027-03-01')).toBe(GST_NOTE.registered);
    expect(gstNoteOn('2030-01-01', null)).toBe(GST_NOTE.notRegistered);
    expect(sydneyToday(new Date('2026-10-30T14:00:00Z'))).toBe('2026-10-31');
  });

  it('is not registered today, matching the terms (legal.test.ts guards the rewrite)', () => {
    expect(siteData.pricing.gstRegisteredFrom).toBeNull();
    expect(siteData.pricing.gstRegistered).toBe(false);
  });
});

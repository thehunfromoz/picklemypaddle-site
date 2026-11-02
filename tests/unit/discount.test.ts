/**
 * Website side of SCRUM-63: reading the service's code check safely, and the form's estimate.
 */
import { describe, expect, it } from 'vitest';
import { discountCheckUrlFrom, parseDiscountCheck, regritEstimate } from '../../src/lib/discount';
import { DISCOUNT_REFUSED } from '../../src/lib/order';

describe('discount codes on the form', () => {
  it('asks the same origin', () => {
    expect(discountCheckUrlFrom('/api/orders')).toBe('/api/discount-codes/check');
    expect(discountCheckUrlFrom('https://x.test/api/orders/')).toBe('https://x.test/api/discount-codes/check');
  });

  it('reads a valid answer, a refusal, and treats anything else as unknown', () => {
    expect(parseDiscountCheck({ valid: true, code: 'LAUNCH10', kind: 'free', value: 1, label: 'Free re-grit for 1 paddle' })).toEqual({
      ok: true,
      applied: { code: 'LAUNCH10', kind: 'free', value: 1, label: 'Free re-grit for 1 paddle' },
    });
    expect(parseDiscountCheck({ valid: false, message: DISCOUNT_REFUSED })).toEqual({ ok: false, message: DISCOUNT_REFUSED });
    expect(parseDiscountCheck({ valid: false })).toEqual({ ok: false, message: DISCOUNT_REFUSED });
    for (const junk of [null, 'x', {}, { valid: true, code: 'X', kind: 'bogus', value: 1, label: 'x' }, { valid: true, code: 'X', kind: 'free', value: -1, label: 'x' }]) {
      expect(parseDiscountCheck(junk)).toBeNull();
    }
  });

  it('shows the re-grit estimate with the code taken off, never postage', () => {
    const free1 = { code: 'LAUNCH10', kind: 'free' as const, value: 1, label: '' };
    expect(regritEstimate(1, 6000, null)).toBe('A$60');
    expect(regritEstimate(1, 6000, free1)).toBe('A$0 (A$60 less A$60 with LAUNCH10)');
    expect(regritEstimate(10, 6000, free1)).toBe('A$540 (A$600 less A$60 with LAUNCH10)');
    expect(regritEstimate(2, 6000, { code: 'TEN', kind: 'amount', value: 1050, label: '' })).toBe('A$109.50 (A$120 less A$10.50 with TEN)');
    expect(regritEstimate(3, 6000, { code: 'Q', kind: 'percent', value: 25, label: '' })).toBe('A$135 (A$180 less A$45 with Q)');
  });
});

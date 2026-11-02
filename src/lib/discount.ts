/**
 * Discount codes on the order form (SCRUM-63).
 *
 * The integrations service decides whether a code can be used (POST /api/discount-codes/check,
 * and again when the order is submitted); the browser never trusts itself. This file only turns
 * the service's answer into the estimate the form shows. The arithmetic is the shared
 * `discountCents` from ./order-rules.ts, the same code the service uses at Accept.
 */
import { discountCents, DISCOUNT_REFUSED, type DiscountBenefit } from './order-rules';

export interface AppliedCode extends DiscountBenefit {
  code: string;
  label: string;
}

/** /api/orders → /api/discount-codes/check (same origin, so the CSP stays 'self'). */
export function discountCheckUrlFrom(orderEndpoint: string): string {
  return orderEndpoint.replace(/\/orders\/?$/, '/discount-codes/check');
}

/** The service's answer: the code's benefit, or its one refusal message. Anything else is "unknown". */
export function parseDiscountCheck(body: unknown): { ok: true; applied: AppliedCode } | { ok: false; message: string } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.valid === false) return { ok: false, message: typeof b.message === 'string' ? b.message : DISCOUNT_REFUSED };
  if (
    b.valid === true &&
    typeof b.code === 'string' &&
    typeof b.label === 'string' &&
    (b.kind === 'free' || b.kind === 'amount' || b.kind === 'percent') &&
    typeof b.value === 'number' &&
    Number.isInteger(b.value) &&
    b.value > 0
  ) {
    return { ok: true, applied: { code: b.code, label: b.label, kind: b.kind, value: b.value } };
  }
  return null;
}

const money = (cents: number): string => `A$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

/**
 * The re-grit part of the form's estimate, e.g. "A$120" or "A$60 (A$120 less A$60 with LAUNCH10)".
 * Return postage is never discounted, and the form always adds "plus return postage".
 */
export function regritEstimate(paddles: number, pricePerPaddleCents: number, applied: AppliedCode | null): string {
  const subtotal = paddles * pricePerPaddleCents;
  if (!applied) return money(subtotal);
  const off = discountCents(applied, paddles, pricePerPaddleCents);
  if (off === 0) return money(subtotal);
  return `${money(subtotal - off)} (${money(subtotal)} less ${money(off)} with ${applied.code})`;
}

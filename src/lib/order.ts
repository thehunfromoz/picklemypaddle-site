/**
 * Order form rules for the browser form and the unit tests.
 *
 * The validation rules themselves live in ./order-rules.ts, a byte-identical copy of the
 * integrations service's src/orders/rules.ts (SCRUM-65): the service re-checks everything with
 * the same code, and tests/unit/order-rules-parity.test.ts fails if the two ever differ.
 */
export * from './order-rules';

/** The order endpoint, relative so one image works on staging, the tailnet and production (SCRUM-68). */
export const DEFAULT_ORDER_API_URL = '/api/orders';

/** Re-grit cost before return postage, in whole dollars. */
export function regritSubtotal(paddleCount: number, pricePerPaddle: number): number {
  if (!Number.isInteger(paddleCount) || paddleCount < 0) throw new RangeError('paddleCount must be a whole number ≥ 0');
  return paddleCount * pricePerPaddle;
}

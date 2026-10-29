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

// ── Queue and promise on the status page (SCRUM-73) ────────────────────────────

/** "Monday, 16 Nov" for a calendar date (YYYY-MM-DD), whatever time zone the visitor is in. */
export function promiseDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const parts = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .formatToParts(new Date(Date.UTC(y, m - 1, d)));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')}`;
}

/**
 * The status page's turnaround line: the promise (In queue and Re-gritted) and, while In queue,
 * how many paddles are ahead. Null when the service sends no promise.
 */
export function queueLine(view: { backInPostBy: string | null; paddlesAhead?: number | null }): string | null {
  if (!view.backInPostBy) return null;
  const promise = `Back in the post by ${promiseDay(view.backInPostBy)}.`;
  const ahead = view.paddlesAhead;
  if (ahead === null || ahead === undefined) return promise;
  if (ahead === 0) return `${promise} Yours is next in the queue.`;
  return `${promise} ${ahead} ${ahead === 1 ? 'paddle' : 'paddles'} ahead of yours.`;
}

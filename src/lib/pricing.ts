/**
 * Today's price, GST wording and return postage, from the integrations service (SCRUM-81).
 *
 * The site is static, but GST starts on a date (GST_REGISTERED_FROM on the service), so the
 * wording comes from GET /api/pricing at view time and changes on that day without a rebuild.
 * The built page keeps its static wording as the fallback when the service can't be reached.
 */

export interface PricingResponse {
  date: string;
  currency: 'AUD';
  termsVersion: string;
  pricePerPaddleCents: number;
  gst: { registered: boolean; note: string };
  postage: { table: string; basis: 'cubic' | 'actual'; byPaddles: { paddles: number; minCents: number; maxCents: number }[] };
}

/** /api/orders → /api/pricing (same origin, so the CSP stays 'self'). */
export function pricingUrlFrom(orderEndpoint: string): string {
  return orderEndpoint.replace(/\/orders\/?$/, '/pricing');
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Accepts only the shape we expect; anything else is treated as "no pricing" (keep the fallback). */
export function parsePricing(body: unknown): PricingResponse | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Partial<PricingResponse>;
  if (!isNum(b.pricePerPaddleCents) || !b.gst || typeof b.gst.note !== 'string' || typeof b.gst.registered !== 'boolean') return null;
  if (!b.postage || !Array.isArray(b.postage.byPaddles)) return null;
  if (!b.postage.byPaddles.every((p) => isNum(p?.paddles) && isNum(p?.minCents) && isNum(p?.maxCents))) return null;
  return b as PricingResponse;
}

export const money = (cents: number): string => `A$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

/** "A$22.25", or "A$24.70–A$51.60" when it depends on where it goes; null when unknown. */
export function postageFor(pricing: PricingResponse, paddles: number): string | null {
  const row = pricing.postage.byPaddles.find((p) => p.paddles === paddles);
  if (!row) return null;
  return row.minCents === row.maxCents ? money(row.minCents) : `${money(row.minCents)}–${money(row.maxCents)}`;
}

/** The form's postage hint: " (about A$22.25 for 1 paddle)", or "" when unknown. */
export function postageHint(pricing: PricingResponse | null, paddles: number): string {
  if (!pricing) return '';
  const amount = postageFor(pricing, paddles);
  if (!amount) return '';
  return ` (about ${amount} for ${paddles} ${paddles === 1 ? 'paddle' : 'paddles'}, confirmed when we accept your order)`;
}

/** Today's Sydney calendar day, YYYY-MM-DD. */
export function sydneyToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const GST_NOTE = {
  notRegistered: 'We are not registered for GST, so no GST is charged.',
  registered: 'Prices include GST.',
} as const;

/** The GST sentence for a Sydney day, given the registration date (null = not registered). */
export function gstNoteOn(day: string, gstRegisteredFrom: string | null): string {
  return gstRegisteredFrom !== null && day >= gstRegisteredFrom ? GST_NOTE.registered : GST_NOTE.notRegistered;
}

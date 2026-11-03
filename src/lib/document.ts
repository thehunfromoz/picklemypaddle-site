/**
 * Receipts and credit notes (SCRUM-84). The integrations service issues each one as a frozen
 * snapshot: every word and amount on the printable page comes from it, never from this code, so
 * what the customer prints is exactly what was issued.
 *
 * The page is /order/document?n=PMP-INV-0001#<status token>: the number isn't secret, the token
 * stays in the fragment (never in a log or a Referer) and is sent in a POST body, as on the
 * status page.
 */

export const DOCUMENT_NUMBER_RE = /^PMP-(INV|CN)-\d{4,}$/;
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export interface DocumentLine {
  description: string;
  quantity: number;
  unitCents: number;
  amountCents: number;
}

export interface DocumentSnapshot {
  v: 1;
  number: string;
  kind: 'receipt' | 'invoice' | 'credit_note';
  heading: 'Invoice' | 'Tax invoice' | 'Credit note' | 'Adjustment note';
  issuedOn: string;
  treatment: 'not_registered' | 'gst_inclusive';
  test: boolean;
  seller: { name: string; abn: string; email: string; website: string };
  buyer: { name: string; abn?: string; address?: string };
  reference: string;
  refersTo?: { number: string; issuedOn: string };
  lines: DocumentLine[];
  totalCents: number;
  gstCents: number;
  gstLine: string;
  notes: string[];
}

export interface DocumentView {
  snapshot: DocumentSnapshot;
  sha256: string;
  paid: { on: string; method: string } | null;
}

/** The printable page of one of an order's documents. */
export function documentUrl(number: string, token: string): string {
  return `/order/document?n=${encodeURIComponent(number)}#${token}`;
}

/** The number and token from the page's own address, or null if either is malformed. */
export function documentParams(search: string, hash: string): { number: string; token: string } | null {
  const number = new URLSearchParams(search).get('n') ?? '';
  const token = hash.replace(/^#/, '');
  return DOCUMENT_NUMBER_RE.test(number) && TOKEN_RE.test(token) ? { number, token } : null;
}

/** −A$60.00 / A$18.00: always two decimals, as on paper. */
export function documentMoney(cents: number): string {
  return `${cents < 0 ? '−' : ''}A$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/** "3 November 2026" from YYYY-MM-DD (a calendar date: no time zone shifts it). */
export function calendarDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Invoice: paid" once paid (SCRUM-84 AC3); credit notes keep their heading. */
export function displayHeading(v: DocumentView): string {
  const h = v.snapshot.heading;
  return v.paid && (h === 'Invoice' || h === 'Tax invoice') ? `${h}: paid` : h;
}

/** The line under the totals: when and how it was paid, or refunded. */
export function paidLine(v: DocumentView): string | null {
  if (!v.paid) return null;
  if (v.snapshot.kind === 'credit_note') return `Refunded to the card on ${calendarDate(v.paid.on)}.`;
  return `Paid in full by ${v.paid.method} on ${calendarDate(v.paid.on)}.`;
}

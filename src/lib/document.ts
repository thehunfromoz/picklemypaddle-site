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
  /** gst_exclusive: club invoices once GST-registered (SCRUM-85): GST added on top as its own line. */
  treatment: 'not_registered' | 'gst_inclusive' | 'gst_exclusive';
  test: boolean;
  seller: { name: string; abn: string; email: string; website: string };
  buyer: { name: string; abn?: string; address?: string };
  reference: string;
  refersTo?: { number: string; issuedOn: string };
  lines: DocumentLine[];
  /** GST-exclusive documents: the lines' sum before GST. */
  subtotalCents?: number;
  totalCents: number;
  gstCents: number;
  gstLine: string;
  /** Club invoices (SCRUM-85): when it's due, and the PayID it asks clubs to pay to. */
  dueOn?: string;
  payId?: string;
  notes: string[];
}

export interface DocumentView {
  snapshot: DocumentSnapshot;
  sha256: string;
  paid: { on: string; method: string } | null;
}

/** SCRUM-85: a club invoice also says what's been paid towards it and what's still owing. */
export interface ClubInvoiceView extends DocumentView {
  balanceCents?: number;
  payments?: { method: string; amountCents: number; paidOn: string }[];
  canPayByCard?: boolean;
}

/** The payments made so far, one line each, then what's owing (only while part-paid). */
export function clubPaymentLines(v: ClubInvoiceView): { payments: string[]; owing: string | null } {
  const payments = (v.payments ?? []).map((p) => `${documentMoney(p.amountCents)} by ${p.method} on ${calendarDate(p.paidOn)}`);
  const owing = payments.length && v.balanceCents !== undefined && v.balanceCents > 0 ? `Still owing: ${documentMoney(v.balanceCents)}` : null;
  return { payments, owing };
}

/** The printable page of one of an order's documents. */
export function documentUrl(number: string, token: string): string {
  return `/order/document?n=${encodeURIComponent(number)}#${token}`;
}

/** SCRUM-85: a club invoice's printable page (linked from its email). */
export function clubDocumentUrl(number: string, token: string): string {
  return `/club/invoice?n=${encodeURIComponent(number)}#${token}`;
}

/** SCRUM-85: a club batch's reference (PMPB-…) rather than an order's (PMP-…). */
export const isBatchReference = (reference: string) => reference.startsWith('PMPB-');

/** The rows above the total: the subtotal and GST of a GST-exclusive document, else none. */
export function subtotalRows(s: DocumentSnapshot): [string, string][] {
  if (s.subtotalCents === undefined) return [];
  return [['Subtotal (excluding GST)', documentMoney(s.subtotalCents)], ['GST (10%)', documentMoney(s.gstCents)]];
}

/** The details under the heading: number, date, what it's for, due date, and what it adjusts. */
export function documentMeta(s: DocumentSnapshot): [string, string][] {
  return [
    ['Number', s.number],
    ['Date of issue', calendarDate(s.issuedOn)],
    [isBatchReference(s.reference) ? 'Club batch' : 'Order', s.reference],
    ...(s.dueOn ? [['Due by', calendarDate(s.dueOn)] as [string, string]] : []),
    ...(s.refersTo ? [['For', `${s.refersTo.number} of ${calendarDate(s.refersTo.issuedOn)}`] as [string, string]] : []),
  ];
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

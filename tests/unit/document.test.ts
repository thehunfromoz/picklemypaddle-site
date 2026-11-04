/** Website side of SCRUM-84: the printable receipt's address and wording helpers. */
import { describe, expect, it } from 'vitest';
import { calendarDate, clubDocumentUrl, displayHeading, documentMeta, documentMoney, documentParams, documentUrl, paidLine, subtotalRows, type DocumentView } from '../../src/lib/document';

const TOKEN = 'T'.repeat(43);
const view = (over: Partial<DocumentView['snapshot']> = {}, paid: DocumentView['paid'] = { on: '2026-11-03', method: 'card' }): DocumentView => ({
  sha256: 'x',
  paid,
  snapshot: {
    v: 1, number: 'PMP-INV-0001', kind: 'receipt', heading: 'Invoice', issuedOn: '2026-11-03', treatment: 'not_registered', test: false,
    seller: { name: 'PickleMyPaddle', abn: '[To confirm: ABN]', email: 'info@picklemypaddle.com', website: 'www.picklemypaddle.com' },
    buyer: { name: 'Sam Player' }, reference: 'PMP-ABCDE', lines: [], totalCents: 7170, gstCents: 0, gstLine: 'No GST has been charged', notes: [], ...over,
  },
});

describe('printable documents', () => {
  it('links the number in the query and keeps the token in the fragment', () => {
    expect(documentUrl('PMP-INV-0001', TOKEN)).toBe(`/order/document?n=PMP-INV-0001#${TOKEN}`);
    expect(documentParams('?n=PMP-CN-0012', `#${TOKEN}`)).toEqual({ number: 'PMP-CN-0012', token: TOKEN });
    for (const [search, hash] of [['?n=PMP-INV-1', `#${TOKEN}`], ['?n=../x', `#${TOKEN}`], ['', `#${TOKEN}`], ['?n=PMP-INV-0001', '#short'], ['?n=PMP-INV-0001', '']]) {
      expect(documentParams(search!, hash!), `${search} ${hash}`).toBeNull();
    }
  });

  it('words a paid invoice "Invoice: paid", keeps a credit note’s heading, and shows money to the cent', () => {
    expect(displayHeading(view())).toBe('Invoice: paid');
    expect(displayHeading(view({ heading: 'Tax invoice' }))).toBe('Tax invoice: paid');
    expect(displayHeading(view({}, null))).toBe('Invoice');
    expect(displayHeading(view({ kind: 'credit_note', heading: 'Credit note' }))).toBe('Credit note');
    expect(paidLine(view())).toBe('Paid in full by card on 3 November 2026.');
    expect(paidLine(view({ kind: 'credit_note', heading: 'Credit note' }, { on: '2026-11-05', method: 'card refund' }))).toBe('Refunded to the card on 5 November 2026.');
    expect(documentMoney(6000)).toBe('A$60.00');
    expect(documentMoney(-6000)).toBe('−A$60.00');
    expect(calendarDate('2027-03-01')).toBe('1 March 2027');
  });
});

describe('club invoices (SCRUM-85)', () => {
  it('links the club invoice page with the token in the fragment', () => {
    expect(clubDocumentUrl('PMP-INV-0042', TOKEN)).toBe(`/club/invoice?n=PMP-INV-0042#${TOKEN}`);
  });
  it('names a batch "Club batch" and shows the due date; an order stays "Order"', () => {
    expect(documentMeta(view({ reference: 'PMPB-4K7QX', dueOn: '2026-11-18' }).snapshot)).toEqual([
      ['Number', 'PMP-INV-0001'], ['Date of issue', '3 November 2026'], ['Club batch', 'PMPB-4K7QX'], ['Due by', '18 November 2026'],
    ]);
    expect(documentMeta(view().snapshot)[2]).toEqual(['Order', 'PMP-ABCDE']);
  });
  it('shows a subtotal and GST line only on a GST-exclusive document', () => {
    expect(subtotalRows(view().snapshot)).toEqual([]);
    expect(subtotalRows(view({ treatment: 'gst_exclusive', subtotalCents: 124200, gstCents: 12420, totalCents: 136620 }).snapshot)).toEqual([
      ['Subtotal (excluding GST)', 'A$1242.00'], ['GST (10%)', 'A$124.20'],
    ]);
  });
});

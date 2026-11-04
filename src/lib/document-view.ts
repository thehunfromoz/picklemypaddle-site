/**
 * Lays out a document's frozen snapshot on its printable page (SCRUM-84, SCRUM-85). Shared by the
 * order document page and the club invoice page, which have the same markup. Every word comes from
 * the snapshot or the helpers in ./document; nothing is set as HTML, so text from the service can't
 * become markup.
 */
import { displayHeading, documentMeta, documentMoney, paidLine, subtotalRows, type DocumentView } from './document';

const $ = (id: string) => document.getElementById(id);
const el = (tag: string, text: string, className = '') => {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  return e;
};
export const show = (id: string, on = true) => {
  const e = $(id);
  if (e) e.hidden = !on;
};

export function renderDocument(v: DocumentView): void {
  const s = v.snapshot;
  const heading = displayHeading(v);
  document.title = `${heading} ${s.number} · PickleMyPaddle`;
  if (s.test) {
    $('doc-test')!.textContent = `TEST DOCUMENT from the preview site: not a real ${s.heading.toLowerCase()}. Nothing was charged.`;
    show('doc-test');
  }
  $('doc-heading')!.textContent = heading;
  $('doc-meta')!.replaceChildren(...documentMeta(s).flatMap(([k, val]) => [el('dt', k, 'text-text-muted'), el('dd', val)]));
  $('doc-seller')!.replaceChildren(
    el('strong', s.seller.name, 'block'),
    el('span', `ABN ${s.seller.abn}`, 'block'),
    el('span', s.seller.email, 'block'),
    el('span', s.seller.website, 'block'),
  );
  $('doc-buyer-label')!.textContent = s.kind === 'credit_note' ? 'Credit to' : 'Bill to';
  $('doc-buyer')!.replaceChildren(
    document.createTextNode(s.buyer.name),
    ...(s.buyer.abn ? [el('span', `ABN ${s.buyer.abn}`, 'block font-normal')] : []),
    ...(s.buyer.address ? [el('span', s.buyer.address, 'block whitespace-pre-line font-normal')] : []),
  );
  $('doc-lines')!.replaceChildren(
    ...s.lines.map((l) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-border';
      tr.append(
        el('td', l.description, 'py-2 pr-2'),
        el('td', String(l.quantity), 'py-2 pr-2 text-right'),
        el('td', documentMoney(l.unitCents), 'whitespace-nowrap py-2 pr-2 text-right'),
        el('td', documentMoney(l.amountCents), 'whitespace-nowrap py-2 text-right'),
      );
      return tr;
    }),
  );
  $('doc-subtotals')!.replaceChildren(
    ...subtotalRows(s).map(([label, amount]) => {
      const tr = document.createElement('tr');
      const th = el('th', label, 'py-1 text-left font-normal');
      th.setAttribute('scope', 'row');
      th.setAttribute('colspan', '3');
      tr.append(th, el('td', amount, 'whitespace-nowrap py-1 text-right'));
      return tr;
    }),
  );
  $('doc-total-label')!.textContent = s.kind === 'credit_note' ? 'Total credit' : 'Total';
  $('doc-total')!.textContent = documentMoney(s.totalCents);
  // A GST-exclusive document shows its GST as a row above the total, so the line would say it twice.
  $('doc-gst')!.textContent = s.subtotalCents === undefined ? s.gstLine : '';
  const paid = paidLine(v);
  if (paid) {
    $('doc-paid')!.textContent = paid;
    show('doc-paid');
  }
  $('doc-notes')!.replaceChildren(...s.notes.map((n) => el('p', n)));
  show('doc-loading', false);
  show('doc-view');
}

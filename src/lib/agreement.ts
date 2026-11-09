/**
 * The club agreement's printable page (SCRUM-94): /club/agreement#<token>, linked from the agreement
 * email. The token is minted for that email (only its hash is kept by the service), stays in the
 * fragment and is sent in a POST body, like a club invoice's.
 */
export type AgreementBlock = { p: string } | { list: string[] };
export interface AgreementView {
  title: string;
  label: string;
  dated: string;
  sections: { heading: string; blocks: AgreementBlock[] }[];
  schedule: [string, string][];
  sentOn: string;
  acceptedOn: string | null;
  /** Outside production: a draft or a trial. */
  test: boolean;
}

export const AGREEMENT_API_URL = '/api/clubs/agreement';

/** The token from the address's fragment, if it has the shape of one. */
export function agreementTokenFrom(hash: string): string | null {
  const token = hash.replace(/^#/, '');
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 2026-11-04 → 4 November 2026 (a calendar day, no time zone involved). */
export function agreementDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`.replace(/  +/g, ' ') : iso;
}

/** What to say about where the agreement stands: sent, or accepted. */
export function agreementStatusLine(v: Pick<AgreementView, 'sentOn' | 'acceptedOn' | 'label'>): string {
  return v.acceptedOn
    ? `Version ${v.label}: accepted on ${agreementDate(v.acceptedOn)}.`
    : `Version ${v.label}: sent on ${agreementDate(v.sentOn)}. To accept it, reply to the email with the words “I agree”.`;
}

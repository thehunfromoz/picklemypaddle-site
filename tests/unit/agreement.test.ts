import { describe, expect, it } from 'vitest';
import { agreementDate, agreementStatusLine, agreementTokenFrom } from '../../src/lib/agreement';

const TOKEN = 'T'.repeat(43);

describe('club agreement page (SCRUM-94)', () => {
  it('takes the token from the fragment only when it has the shape of one', () => {
    expect(agreementTokenFrom(`#${TOKEN}`)).toBe(TOKEN);
    expect(agreementTokenFrom(TOKEN)).toBe(TOKEN);
    expect(agreementTokenFrom('')).toBeNull();
    expect(agreementTokenFrom('#short')).toBeNull();
    expect(agreementTokenFrom(`#${TOKEN}x`)).toBeNull();
    expect(agreementTokenFrom(`#${'<'.repeat(43)}`)).toBeNull();
  });

  it('writes a calendar day in words, with no time zone', () => {
    expect(agreementDate('2026-11-04')).toBe('4 November 2026');
    expect(agreementDate('2027-01-31')).toBe('31 January 2027');
    expect(agreementDate('not a date')).toBe('not a date');
  });

  it('says where the agreement stands: sent and waiting for "I agree", or accepted', () => {
    expect(agreementStatusLine({ label: '0.1', sentOn: '2026-11-09', acceptedOn: null })).toBe('Version 0.1: sent on 9 November 2026. To accept it, reply to the email with the words “I agree”.');
    expect(agreementStatusLine({ label: '0.1', sentOn: '2026-11-09', acceptedOn: '2026-11-10' })).toBe('Version 0.1: accepted on 10 November 2026.');
  });
});

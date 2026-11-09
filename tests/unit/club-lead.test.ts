import { describe, expect, it } from 'vitest';
import { LEAD_FIELDS, readLeadErrors, validateLeadForm } from '../../src/lib/club-lead';

const GOOD = { clubName: 'Inner West Pickleball Club', suburb: 'Newtown', contactName: 'Jo Treasurer', contactEmail: 'jo@club.org.au', contactPhone: '', memberCount: '40', message: '', preferredTimes: '' };

describe('club lead form rules (SCRUM-93)', () => {
  it('has the form’s fields, and asks for nothing about members or a street address', () => {
    expect([...LEAD_FIELDS]).toEqual(['clubName', 'suburb', 'contactName', 'contactEmail', 'contactPhone', 'memberCount', 'message', 'preferredTimes']);
    expect(LEAD_FIELDS.some((f) => /street|address|member(s|Names|Emails)$/i.test(f))).toBe(false);
  });

  it('accepts a full form, with phone, message and times optional', () => {
    expect(validateLeadForm(GOOD)).toEqual({});
    expect(validateLeadForm({ ...GOOD, contactPhone: '0412 345 678', message: 'Hello', preferredTimes: 'Weeknights' })).toEqual({});
  });

  it('flags what is missing or wrong, beside the field', () => {
    expect(Object.keys(validateLeadForm({})).sort()).toEqual(['clubName', 'contactEmail', 'contactName', 'memberCount', 'suburb']);
    expect(validateLeadForm({ ...GOOD, contactEmail: 'nope' })).toHaveProperty('contactEmail');
    expect(validateLeadForm({ ...GOOD, contactPhone: 'call me' })).toHaveProperty('contactPhone');
    expect(validateLeadForm({ ...GOOD, memberCount: 'lots' })).toHaveProperty('memberCount');
    expect(validateLeadForm({ ...GOOD, memberCount: '0' })).toHaveProperty('memberCount');
    expect(validateLeadForm({ ...GOOD, message: 'x'.repeat(2001) })).toHaveProperty('message');
    expect(validateLeadForm({ ...GOOD, preferredTimes: 'x'.repeat(301) })).toHaveProperty('preferredTimes');
  });

  it('reads the service’s answers: field errors, a stale form, a rate limit, or anything else', () => {
    expect(readLeadErrors(400, { errors: { contactEmail: 'Enter a valid email address.', bogus: 'x' } })).toEqual({ errors: { contactEmail: 'Enter a valid email address.' }, message: '' });
    expect(readLeadErrors(400, { errors: { form: 'Please reload.' } }).errors.form).toBe('Please reload.');
    expect(readLeadErrors(429, { message: 'Try later.' })).toEqual({ errors: {}, message: 'Try later.' });
    expect(readLeadErrors(500, null).message).toContain('try again in a minute');
  });
});

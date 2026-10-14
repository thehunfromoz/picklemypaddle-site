import { describe, expect, it } from 'vitest';
import { siteData } from '../../src/data/siteData';
import { privacyPolicy } from '../../src/data/privacy';
import { termsOfService } from '../../src/data/terms';

const text = (doc: { sections: readonly { content: readonly string[] }[] }) =>
  doc.sections.flatMap((s) => [...s.content]).join(' ');

describe('legal pages and GST', () => {
  it('state prices without GST while the business is not GST-registered', () => {
    // If this fails, GST registration was switched on in siteData: rewrite the GST
    // wording in src/data/terms.ts (GST-inclusive prices, tax invoices, ABN) first.
    expect(siteData.pricing.gstRegistered).toBe(false);
    expect(text(termsOfService)).toContain('our prices do not include GST');
  });

  it('take the price and contact address from siteData', () => {
    expect(text(termsOfService)).toContain(`A$${siteData.pricing.regritPerPaddle} per paddle`);
    expect(text(termsOfService)).toContain(siteData.contact.email);
    expect(text(privacyPolicy)).toContain(siteData.contact.email);
  });
});

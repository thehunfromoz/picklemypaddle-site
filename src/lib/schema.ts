/**
 * SCRUM-36: structured data (JSON-LD). Typed with schema-dts, which is generated from the schema.org
 * vocabulary, so `astro check` rejects a property that does not exist on the type and the markup cannot
 * drift from schema.org. Nothing here is invented: every value comes from brand, siteData or the FAQ.
 */
import type { FAQPage, Organization, Service, WithContext } from 'schema-dts';
import { brand } from '../config/brand';
import { faq } from '../data/faq';
import { siteData } from '../data/siteData';

const abs = (path: string, site: URL) => new URL(path, site).toString();

/** The Organization's own address in the graph, so other items (the Service) can point at it. */
export const organizationId = (site: URL) => abs('/#organization', site);

export function organizationSchema(site: URL): WithContext<Organization> {
  const sameAs = Object.values(siteData.socials).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(site),
    name: brand.name,
    url: abs('/', site),
    logo: abs('/apple-touch-icon.png', site),
    description: brand.description,
    email: siteData.contact.email,
    areaServed: { '@type': 'Country', name: 'Australia' },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function serviceSchema(site: URL): WithContext<Service> {
  const { pricing } = siteData;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Pickleball paddle re-gritting',
    serviceType: 'Pickleball paddle re-gritting',
    description: `Restores a gritty, spin-friendly surface to a worn pickleball paddle, ${pricing.covers}. ${pricing.returnPostageNote}`,
    provider: { '@id': organizationId(site) },
    areaServed: { '@type': 'Country', name: 'Australia' },
    offers: {
      '@type': 'Offer',
      price: pricing.regritPerPaddle,
      priceCurrency: pricing.currency,
      description: 'Per paddle, plus return postage',
      url: abs(siteData.orderCta.href, site),
    },
  };
}

/** Questions and answers from src/data/faq.ts. Answers that still hold a [To confirm: …] placeholder are left out. */
export function faqSchema(): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq
      .filter((f) => !f.a.includes('[To confirm'))
      .map((f) => ({
        '@type': 'Question' as const,
        name: f.q,
        acceptedAnswer: { '@type': 'Answer' as const, text: f.a },
      })),
  };
}

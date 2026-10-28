/** Testimonials (SCRUM-33): the data file is valid, every entry has permission, 3 to show. */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import data from '../../src/data/testimonials.json';
import Testimonials from '../../src/components/sections/Testimonials.astro';
import { loadTestimonials, testimonialProblems, type Testimonial } from '../../src/lib/testimonials';

const entry = (n: number): Testimonial => ({
  quote: `Great re-grit number ${n}, the spin is back.`,
  firstName: 'Sam',
  suburb: 'Newtown',
  date: `2026-12-0${n}`,
  permission: { given: true, at: `2026-12-0${n}`, reference: 'PMP-7K3QX' },
});

describe('testimonials data file', () => {
  it('is valid, and every entry has permission recorded', () => {
    expect(testimonialProblems(data)).toEqual([]);
    for (const t of loadTestimonials()) expect(t.permission.given).toBe(true);
  });

  it('refuses an entry without permission, or with details we never publish', () => {
    const noPermission = { ...entry(1), permission: { given: false, at: '2026-12-01', reference: 'PMP-7K3QX' } };
    expect(testimonialProblems([noPermission])).toEqual(['entry 1: permission.given must be true (no permission, no testimonial)']);
    expect(testimonialProblems([{ ...entry(1), lastName: 'Lee', email: 'sam@example.org' }]))
      .toEqual(['entry 1: unexpected field(s) lastName, email (no surnames, emails or other details)']);
    expect(testimonialProblems([{ ...entry(1), permission: { given: true, at: 'soon', reference: 'X' } }])).toHaveLength(2);
    expect(() => loadTestimonials([{ quote: 'x' }])).toThrow(/testimonials\.json is invalid/);
  });

  it('lists the newest first', () => {
    expect(loadTestimonials([entry(1), entry(3), entry(2)]).map((t) => t.date)).toEqual(['2026-12-03', '2026-12-02', '2026-12-01']);
  });
});

describe('testimonials section', () => {
  const render = async (items: Testimonial[]) => (await AstroContainer.create()).renderToString(Testimonials, { props: { items } });

  it('stays hidden with 2 testimonials', async () => {
    expect(await render([entry(1), entry(2)])).not.toContain('id="testimonials"');
  });

  it('shows with 3, as first name and suburb', async () => {
    const html = await render([entry(1), entry(2), entry(3)]);
    expect(html).toContain('id="testimonials"');
    expect((html.match(/<figure/g) ?? []).length).toBe(3);
    expect(html).toContain('Sam</span>');
    expect(html).toContain('Newtown</span>');
  });
});

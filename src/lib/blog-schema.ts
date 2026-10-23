// The blog post frontmatter schema (SCRUM-34), kept out of content.config.ts so unit tests can
// validate every post without Astro. content.config.ts passes Astro's image() helper; tests pass
// a stand-in. keystatic.config.ts writes exactly these fields.
import { z } from 'astro/zod';

/** Summary (meta description) length, the same rule tests/e2e/seo.spec.ts applies to every page. */
export const summaryLength = { min: 70, max: 160 } as const;

/** Headings allowed in a post body: the title is the page's only <h1>, so bodies start at ##. */
export const bodyHeadingLevels = [2, 3, 4] as const;

export const blogSchema = <Img extends z.ZodType>(image: () => Img) =>
  z
    .object({
      title: z.string().trim().min(1),
      /** Shorter title for the browser tab and search results when `title` runs past 43 characters. */
      seoTitle: z.string().trim().min(1).optional().or(z.literal('').transform(() => undefined)),
      /** Shown as "Summary" in the editor: the blog card, meta description and RSS description. */
      description: z
        .string()
        .trim()
        .min(summaryLength.min, `The summary needs at least ${summaryLength.min} characters (search results show it).`)
        .max(summaryLength.max, `The summary can be at most ${summaryLength.max} characters (search results cut it off).`),
      author: z.string().default('PickleMyPaddle'),
      date: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      /** Optional cover image, stored under src/assets/images/blog/<slug>/. */
      cover: image().optional().nullable(),
      coverAlt: z.string().optional().nullable(),
    })
    .refine((post) => !post.cover || (post.coverAlt ?? '').trim().length > 0, {
      message: 'A cover image needs alt text (coverAlt) describing it for screen readers.',
      path: ['coverAlt'],
    });

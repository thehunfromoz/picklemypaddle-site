import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogSchema } from './lib/blog-schema';

// Posts sit in a language folder: src/content/blog/<lang>/<slug>.md (SCRUM-34), so an
// entry's id is "<lang>/<slug>". A file outside a language folder is not picked up
// (and tests/unit/blog-content.test.ts fails on it).
const blog = defineCollection({
  loader: glob({ pattern: '*/[^_]*.md', base: './src/content/blog' }),
  schema: ({ image }) => blogSchema(image),
});

export const collections = { blog };

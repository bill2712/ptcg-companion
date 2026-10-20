import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Original guides, one folder per content language (src/content/guides/<lang>/<slug>.md).
// A guide with the same file name in each folder is treated as a translation.
const guides = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    updated: z.coerce.date(),
  }),
});

export const collections = { guides };

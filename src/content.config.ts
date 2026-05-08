import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const changelog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/changelog',
    // Preserve dots in filenames (e.g. `1.0.0`) — the default slugifier
    // would otherwise turn `1.0.0` into `100`.
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

export const collections = { changelog };

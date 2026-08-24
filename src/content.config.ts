import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * All content lives in a separate private repo, checked out at ./site-content
 * (see `npm run content:pull`). Nothing under it is committed to this repo.
 *
 * Only the two collections with images are content collections — they need
 * Astro's `image()` schema so `astro:assets` can optimise the photos. The two
 * singletons (pricing, settings) are plain YAML read in src/lib/siteContent.ts.
 */
const CONTENT = './site-content/content';

/**
 * Sessions are the site's only editorial collection: portfolio and blog in one.
 * A session is a short piece of text plus the photos from that shoot.
 */
const sessions = defineCollection({
  loader: glob({ base: `${CONTENT}/sessions`, pattern: '**/*.mdoc' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      category: z.string().default(''),
      intro: z.string(),
      coverImage: image(),
      photos: z
        .array(z.object({ image: image(), alt: z.string().default('') }))
        .default([]),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const offers = defineCollection({
  loader: glob({ base: `${CONTENT}/offers`, pattern: '**/*.yaml' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      includes: z.array(z.string()).default([]),
      duration: z.string().default(''),
      photoCount: z.string().default(''),
      price: z.string().default(''),
      image: image(),
      order: z.number().default(99),
      featured: z.boolean().default(false),
      season: z.enum(['caloroczna', 'swiateczna']).default('caloroczna'),
    }),
});

export const collections = { sessions, offers };

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro:content';

/**
 * Pricing and settings are single YAML documents with no images, so they skip
 * the content-collection machinery and are read straight off disk at build
 * time. Both are validated, so a typo in the panel fails the build loudly
 * instead of rendering a blank section.
 */
const CONTENT_DIR = path.join(process.cwd(), 'site-content', 'content');

const pricingPackageSchema = z.object({
  name: z.string(),
  price: z.string(),
  duration: z.string().default(''),
  badge: z.string().default(''),
  highlighted: z.boolean().default(false),
  includes: z.array(z.string()).default([]),
});

const pricingSchema = z.object({
  intro: z.string().default(''),
  packages: z.array(pricingPackageSchema).default([]),
  christmas: z
    .object({
      eyebrow: z.string().default(''),
      title: z.string().default(''),
      description: z.string().default(''),
      packages: z.array(pricingPackageSchema).default([]),
    })
    .default({}),
  notes: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
});

const settingsSchema = z.object({
  heroEyebrow: z.string().default(''),
  heroHeading: z.string(),
  heroText: z.string().default(''),
  aboutHeading: z.string().default(''),
  aboutText: z.string().default(''),
  signature: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
  city: z.string().default(''),
  hours: z.string().default(''),
  facebook: z.string().default(''),
  instagram: z.string().default(''),
  messenger: z.string().default(''),
  christmas: z
    .object({
      active: z.boolean().default(false),
      eyebrow: z.string().default(''),
      heading: z.string().default('Sesje świąteczne'),
      lead: z.string().default(''),
    })
    .default({}),
  seasonalBanner: z
    .object({
      active: z.boolean().default(false),
      text: z.string().default(''),
      linkText: z.string().default(''),
      linkHref: z.string().default('/cennik'),
    })
    .default({}),
});

export type Pricing = z.infer<typeof pricingSchema>;
export type Settings = z.infer<typeof settingsSchema>;

function readYaml<T>(fileName: string, schema: z.ZodType<T>): T {
  const filePath = path.join(CONTENT_DIR, fileName);
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    throw new Error(
      `Nie znaleziono ${filePath}.\n` +
        'Uruchom `npm run content:pull` (albo `npm run content:init` przy pierwszym uruchomieniu), ' +
        'żeby pobrać repozytorium z treścią.',
    );
  }

  const result = schema.safeParse(parse(raw));
  if (!result.success) {
    throw new Error(
      `Błąd w pliku ${fileName}:\n${result.error.issues
        .map((issue) => `  • ${issue.path.join('.') || '(korzeń)'}: ${issue.message}`)
        .join('\n')}`,
    );
  }
  return result.data;
}

export const getPricing = () => readYaml('pricing.yaml', pricingSchema);
export const getSettings = () => readYaml('settings.yaml', settingsSchema);

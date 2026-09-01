import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro:content';

/**
 * The panel's singletons are single YAML documents with no images, so they skip
 * the content-collection machinery and are read straight off disk at build
 * time. Each is validated, so a typo in the panel fails the build loudly
 * instead of rendering a blank section.
 *
 * One file per section, matching what the panel shows: a page's own words live
 * with that page, and `settings` keeps only what is reused across all of them.
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

/** Reusable across every page: how to reach her, and the announcement bar. */
const settingsSchema = z.object({
  phone: z.string().default(''),
  email: z.string().default(''),
  city: z.string().default(''),
  facebook: z.string().default(''),
  instagram: z.string().default(''),
  whatsapp: z.string().default(''),
  seasonalBanner: z
    .object({
      active: z.boolean().default(false),
      text: z.string().default(''),
      linkText: z.string().default(''),
      linkHref: z.string().default('/cennik'),
    })
    .default({}),
});

const homeSchema = z.object({
  eyebrow: z.string().default(''),
  heading: z.string(),
  text: z.string().default(''),
});

const aboutSchema = z.object({
  heading: z.string().default(''),
  text: z.string().default(''),
  signature: z.string().default(''),
});

/** /sesje and /oferta differ only in their words, so they share a shape. */
const listingPageSchema = (heading: string, intro: string) =>
  z.object({
    heading: z.string().default(heading),
    intro: z.string().default(intro),
  });

const sessionsPageSchema = listingPageSchema(
  'Moje sesje',
  'Każda sesja to osobny wpis — kilka zdań o tym, jak było, i zdjęcia. Kliknij w zdjęcie, żeby zobaczyć całą sesję.',
);

const offersPageSchema = listingPageSchema(
  'Rodzaje sesji',
  'Każda sesja wygląda inaczej, ale zawsze bez sztywnego pozowania. Ceny pakietów znajdziesz w [cenniku](/cennik).',
);

/** The season's own page and the one switch that turns the season on. */
const christmasSchema = z.object({
  active: z.boolean().default(false),
  eyebrow: z.string().default(''),
  heading: z.string().default('Sesje świąteczne'),
  lead: z.string().default(''),
  galleryIntro: z.string().default(''),
  contactHeading: z.string().default('Zarezerwuj termin świąteczny'),
  contactLead: z
    .string()
    .default('Terminy listopadowe i grudniowe rezerwują się najszybciej — napisz albo zadzwoń.'),
});

const pricingSchema = z.object({
  intro: z.string().default(''),
  packages: z.array(pricingPackageSchema).default([]),
  notes: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
});

const christmasPricingSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default('Cennik świąteczny'),
  description: z.string().default(''),
  packages: z.array(pricingPackageSchema).default([]),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Home = z.infer<typeof homeSchema>;
export type About = z.infer<typeof aboutSchema>;
export type ListingPage = z.infer<typeof sessionsPageSchema>;
export type Christmas = z.infer<typeof christmasSchema>;
export type Pricing = z.infer<typeof pricingSchema>;
export type ChristmasPricing = z.infer<typeof christmasPricingSchema>;

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

/**
 * WhatsApp links want an international number with no punctuation. The panel
 * asks for the number, but a pasted wa.me link is the other thing a person
 * naturally puts in that box, so accept either.
 */
export function whatsappHref(value: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export const getSettings = () => readYaml('settings.yaml', settingsSchema);
export const getHome = () => readYaml('pages/home.yaml', homeSchema);
export const getAbout = () => readYaml('pages/about.yaml', aboutSchema);
export const getSessionsPage = () => readYaml('pages/sessions.yaml', sessionsPageSchema);
export const getOffersPage = () => readYaml('pages/offers.yaml', offersPageSchema);
export const getChristmas = () => readYaml('pages/christmas.yaml', christmasSchema);
export const getPricing = () => readYaml('pricing.yaml', pricingSchema);
export const getChristmasPricing = () =>
  readYaml('christmas-pricing.yaml', christmasPricingSchema);

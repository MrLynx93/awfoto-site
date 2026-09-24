/**
 * Everything the pages need in order to describe themselves to Google.
 *
 * Two jobs live here. The first is wording: title tags and meta descriptions
 * that lead with what someone actually types ("fotograf rodzinny Żory")
 * rather than with the studio's name, which only people who already know it
 * search for. The second is structured data — the JSON-LD that lets Google
 * show the business in the local pack, put breadcrumbs under a result, and
 * connect a session's photos to the page they live on.
 *
 * Nothing here invents facts: every field is built from what the photographer
 * filled in through the panel, and anything she left blank is left out rather
 * than shipped as a placeholder.
 */
import type { Settings, Seo, SeoPage, Pricing } from './siteContent';

type Package = Pricing['packages'][number];

export const SITE_NAME = 'AW Fotografia';

/** Named in the link-preview card since the site was built. */
export const PHOTOGRAPHER_NAME = 'Alicja Wicherek';

/**
 * The panel asks for one bare city, so this is normally a no-op. It stays as a
 * guard for content written before the field meant that — "Żory i okolice"
 * is an address Google cannot file and costs 10 of the ~60 characters a title
 * tag gets. Where the business travels is `nearbyCities`, a separate field.
 */
export function cityName(city: string): string {
  return city.split(/\s+i\s+|[,/(]/)[0].trim();
}

/**
 * Everywhere the business works, the main city first: it plainly serves its own
 * city, so `nearbyPlaces` lists only what comes *after* that rather than
 * repeating it. Duplicates are dropped, since the panel cannot stop her naming
 * the main city again and `areaServed` saying "Żory, Żory" reads as broken data.
 */
export function servedAreas(settings: Settings, seo: Seo): string[] {
  const city = cityName(settings.city);
  const all = [city, ...seo.nearbyPlaces].map((name) => name.trim()).filter(Boolean);
  return [...new Set(all)];
}

/**
 * `areaServed`, or nothing at all when there is no place to name.
 *
 * `Place` rather than `City`: the list mixes towns with whole regions — "Żory,
 * Rybnik, Śląsk" — and a region filed as a City is data that contradicts
 * itself. `Place` is the type both are, so neither has to be mislabelled.
 */
function areaServed(settings: Settings, seo: Seo) {
  const areas = servedAreas(settings, seo);
  if (areas.length === 0) return {};
  return { areaServed: areas.map((name) => ({ '@type': 'Place', name })) };
}

/**
 * Google truncates a description around 160 characters. Cut on a word so the
 * visible part is a sentence rather than a fragment.
 */
export function clamp(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:—-]$/, '')}…`;
}

/**
 * What the page says about itself, with whatever she typed in the panel winning
 * over it.
 *
 * A custom title is used **verbatim** — no "— AW Fotografia, Żory" appended.
 * Someone who opens that box is there to control the line Google prints, and
 * silently gluing 24 characters onto the end would push their own words past
 * where Google cuts. The generated titles still get the suffix, since nobody
 * chose those.
 */
export interface PageMeta {
  title: string;
  description: string;
  /** Set when the title came from the panel, so BaseLayout leaves it alone. */
  titleIsFinal: boolean;
}

export function pageMeta(override: SeoPage, generated: PageMeta): PageMeta {
  const title = override.title.trim();
  const description = override.description.trim();
  return {
    title: title || generated.title,
    description: description || generated.description,
    titleIsFinal: title ? true : generated.titleIsFinal,
  };
}

/** Joins the parts of a description, dropping the ones that are empty. */
export const sentences = (...parts: (string | undefined | false)[]): string =>
  clamp(parts.filter(Boolean).join(' '));

/** Prices are free text in the panel — "850 zł", "od 550 zł", "1 250 zł". */
export function parsePrice(value: string): { amount: number; from: boolean } | undefined {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  return { amount: Number(digits), from: /\bod\b/i.test(value) };
}

/** An `Offer`, priced exactly or from a floor, or nothing if the text has no number. */
function offerSchema(name: string, price: string) {
  const parsed = parsePrice(price);
  if (!parsed) return undefined;
  return {
    '@type': 'Offer',
    name,
    priceCurrency: 'PLN',
    ...(parsed.from
      ? {
          priceSpecification: {
            '@type': 'PriceSpecification',
            priceCurrency: 'PLN',
            minPrice: parsed.amount,
          },
        }
      : { price: parsed.amount }),
  };
}

/** "od 550 zł" … "1 250 zł" across every package → "550–1250 zł". */
function priceRange(pricing: Pricing): string | undefined {
  const amounts = pricing.packages
    .map((pkg: Package) => parsePrice(pkg.price)?.amount)
    .filter((amount: number | undefined): amount is number => typeof amount === 'number');
  if (amounts.length === 0) return undefined;
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  return low === high ? `${low} zł` : `${low}–${high} zł`;
}

interface BusinessInput {
  site: URL;
  settings: Settings;
  seo: Seo;
  pricing: Pricing;
  description: string;
  /** Absolute URL of the picture Google may show beside the listing. */
  image: string;
}

/**
 * The business card, emitted on every page and referenced by `@id` from the
 * per-page schema, so Google reads one business rather than one per URL.
 *
 * `PhotographyBusiness` rather than a plain `LocalBusiness`: it is the
 * schema.org type for exactly this trade, and being specific is what makes a
 * listing eligible for the local results a photographer is found through.
 */
export function businessSchema({ site, settings, seo, pricing, description, image }: BusinessInput) {
  const city = cityName(settings.city);
  const range = priceRange(pricing);
  const profiles = [settings.facebook, settings.instagram].filter(Boolean);


  return {
    '@context': 'https://schema.org',
    '@type': 'PhotographyBusiness',
    '@id': businessId(site),
    name: SITE_NAME,
    description,
    url: site.href,
    image,
    inLanguage: 'pl-PL',
    ...(settings.phone && { telephone: settings.phone }),
    ...(settings.email && { email: settings.email }),
    ...(city && {
      address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'PL' },
    }),
    // Everywhere she works, so a search from the next town over can match.
    // The address above is the single city; this is the reach around it.
    ...areaServed(settings, seo),
    ...(range && { priceRange: range }),
    ...(profiles.length > 0 && { sameAs: profiles }),
    founder: { '@type': 'Person', name: PHOTOGRAPHER_NAME },
  };
}

/** The one anchor every other block points back at. */
export const businessId = (site: URL): string => `${site.href.replace(/\/$/, '')}/#business`;

/**
 * The trail Google prints under a result instead of a bare URL. The site's own
 * "/" is always the first step, so pages pass only what comes after it.
 */
export function breadcrumbSchema(site: URL, trail: { name: string; path: string }[]) {
  const steps = [{ name: 'Strona główna', path: '/' }, ...trail];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      // The trailing slash matters: the build serves directories, so a link to
      // /sesje would name a URL that only redirects to the one Google indexed.
      item: new URL(step.path.endsWith('/') ? step.path : `${step.path}/`, site).href,
    })),
  };
}

export interface SchemaImage {
  src: string;
  width?: number;
  height?: number;
  alt?: string;
}

/** A photo, with its real dimensions — what Google Images wants to see. */
export const imageObject = (site: URL, image: SchemaImage) => ({
  '@type': 'ImageObject',
  url: new URL(image.src, site).href,
  ...(image.width && { width: image.width }),
  ...(image.height && { height: image.height }),
  ...(image.alt && { caption: image.alt }),
});

/**
 * A published session: a short piece of writing plus the photos from one
 * shoot, which is what `ImageGallery` describes. Tying the photos to a dated
 * page by a named author is how a shoot gets found in Google Images.
 */
export function sessionSchema(
  site: URL,
  session: {
    title: string;
    intro: string;
    date: Date;
    tags: string[];
    url: URL;
    images: SchemaImage[];
  },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    '@id': `${session.url.href}#gallery`,
    name: session.title,
    description: session.intro,
    url: session.url.href,
    datePublished: session.date.toISOString().slice(0, 10),
    inLanguage: 'pl-PL',
    ...(session.tags.length > 0 && { keywords: session.tags.join(', ') }),
    author: { '@type': 'Person', name: PHOTOGRAPHER_NAME },
    publisher: { '@id': businessId(site) },
    ...(session.images.length > 0 && {
      image: session.images.map((image) => imageObject(site, image)),
    }),
  };
}

/**
 * A kind of shoot, as sold: what it is, who provides it, where, and from how
 * much. `Service` is the type Google reads for "sesja świąteczna Żory".
 */
export function serviceSchema(
  site: URL,
  settings: Settings,
  seo: Seo,
  offer: { name: string; description: string; price: string; url: URL; image: SchemaImage },
) {
  const offered = offerSchema(offer.name, offer.price);
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${offer.url.href}#service`,
    name: offer.name,
    description: offer.description,
    serviceType: 'Sesja zdjęciowa',
    url: offer.url.href,
    image: imageObject(site, offer.image),
    provider: { '@id': businessId(site) },
    ...areaServed(settings, seo),
    ...(offered && { offers: offered }),
  };
}

/** The price list as a catalogue, so the packages and their prices are readable. */
export function offerCatalogSchema(site: URL, name: string, packages: Pricing['packages']) {
  const items = packages
    .map((pkg: Package) => {
      const offered = offerSchema(pkg.name, pkg.price);
      if (!offered) return undefined;
      return {
        ...offered,
        ...(pkg.includes.length > 0 && { description: pkg.includes.join(', ') }),
      };
    })
    .filter(Boolean);

  if (items.length === 0) return undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name,
    url: new URL('/cennik', site).href,
    provider: { '@id': businessId(site) },
    itemListElement: items,
  };
}

/** Lets Google settle on "AW Fotografia" as the site's name in results. */
export const websiteSchema = (site: URL) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${site.href.replace(/\/$/, '')}/#website`,
  name: SITE_NAME,
  url: site.href,
  inLanguage: 'pl-PL',
  publisher: { '@id': businessId(site) },
});

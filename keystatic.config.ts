import { config, collection, singleton, fields } from '@keystatic/core';

/**
 * Panel do zarządzania treścią strony.
 *
 * Code is English; every label the photographer sees is Polish.
 * Content lives in a separate private repo — see `inRepo` below.
 *
 * This file is bundled into the browser, so it must use `import.meta.env`
 * (replaced by Vite at build time) rather than `process.env`, which does not
 * exist client-side — and only PUBLIC_-prefixed variables reach the browser.
 *
 * The panel always talks to the private content repo over GitHub, in
 * development as well as production, so local editing behaves exactly like the
 * deployed panel.
 *
 * Local mode is deliberately NOT the default. Keystatic's local reader walks
 * the current repo's git tree and honours .gitignore, and ./site-content is
 * gitignored here on purpose — so local mode shows an empty panel unless that
 * folder is tracked. Set PUBLIC_KEYSTATIC_STORAGE=local only in a checkout
 * where the content is committed.
 */
const storageMode = import.meta.env.PUBLIC_KEYSTATIC_STORAGE ?? 'github';

const storage =
  storageMode === 'local'
    ? ({ kind: 'local' } as const)
    : ({
        kind: 'github',
        repo: {
          owner: import.meta.env.PUBLIC_CONTENT_REPO_OWNER || 'MrLynx93',
          name: import.meta.env.PUBLIC_CONTENT_REPO_NAME || 'awfoto-site-content',
        },
      } as const);

/**
 * In GitHub mode the content repo *is* the root, so paths start at `content/`.
 * Locally that same repo is a clone at ./site-content, so every path needs the
 * folder in front.
 *
 * Note this cannot use `storage.pathPrefix` — Keystatic ignores that option in
 * local mode (it only applies to GitHub storage), which silently yields an
 * empty panel.
 */
const inRepo = (p: string) => (storageMode === 'local' ? `site-content/${p}` : p);

/**
 * The kinds of shoot. A session carries any number of them — a Christmas shoot
 * of a family is both — and an offer names the one that fills its "Takie sesje
 * już robiłam". Shared so the two lists cannot drift apart.
 */
const SESSION_CATEGORIES = [
  { label: 'Plener', value: 'Plener' },
  { label: 'Rodzinna', value: 'Rodzinna' },
  { label: 'Roczek', value: 'Roczek' },
  { label: 'Noworodkowa', value: 'Noworodkowa' },
  { label: 'Ciążowa', value: 'Ciążowa' },
  { label: 'Świąteczna', value: 'Świąteczna' },
  { label: 'Ślubna', value: 'Ślubna' },
  { label: 'Inna', value: 'Inna' },
] as const;

/** Reused by the regular and the Christmas price list — identical shape. */
const pricingPackage = fields.object(
  {
    name: fields.text({ label: 'Nazwa pakietu' }),
    price: fields.text({ label: 'Cena', description: 'Np. „850 zł”' }),
    duration: fields.text({ label: 'Czas trwania', description: 'Np. „ok. 90 minut”' }),
    badge: fields.text({
      label: 'Wyróżnik',
      description: 'Np. „Najczęściej wybierany”. Zostaw puste, jeśli niepotrzebny.',
    }),
    highlighted: fields.checkbox({
      label: 'Wyróżnij ten pakiet',
      description: 'Wyróżniony pakiet ma jaśniejsze tło i cień.',
      defaultValue: false,
    }),
    includes: fields.array(fields.text({ label: 'Pozycja' }), {
      label: 'Co zawiera',
      itemLabel: (item) => item.value || 'Pozycja',
    }),
  },
  { label: 'Pakiet' },
);

/**
 * The seven pages whose search-result text is editable. Sessions and offers are
 * not here: their description already comes from words she writes ("Krótki
 * opis", "Opis"), so a second box for the same job would only be somewhere for
 * the two to disagree.
 */
const SEO_PAGES = [
  ['home', 'Strona główna'],
  ['sessions', 'Moje sesje'],
  ['offers', 'Oferta'],
  ['pricing', 'Cennik'],
  ['about', 'O mnie'],
  ['contact', 'Kontakt'],
  ['christmas', 'Święta'],
] as const;

/**
 * One page's pair of boxes. Both may be left empty, and empty is the normal
 * state: the site then writes the line itself from the page's own words and the
 * city, which is right until she wants to say something different.
 */
const seoPageFields = (label: string) =>
  fields.object(
    {
      title: fields.text({
        label: 'Tytuł w Google',
        description:
          'Niebieski nagłówek wyniku. Google ucina go koło 60 znaków, więc ' +
          'najważniejsze słowa dawaj na początek. Pusty = tytuł układa się sam.',
      }),
      description: fields.text({
        label: 'Opis w Google',
        description:
          'Dwa–trzy zdania pod tytułem. Google ucina je koło 160 znaków. ' +
          'To jedyny tekst, którym przekonujesz kogoś do kliknięcia. ' +
          'Pusty = opis układa się sam.',
        multiline: true,
      }),
    },
    { label },
  );

export default config({
  storage,

  ui: {
    brand: { name: 'AW Fotografia' },
    navigation: {
      Treść: ['sessions', 'offers'],
      Strony: ['homePage', 'sessionsPage', 'offersPage', 'aboutPage', 'christmasPage'],
      Cennik: ['pricing', 'christmasPricing'],
      Ustawienia: ['settings'],
      'Widoczność w Google': ['seo'],
    },
  },

  collections: {
    sessions: collection({
      label: 'Moje sesje',
      path: inRepo('content/sessions/*'),
      slugField: 'title',
      format: { contentField: 'body' },
      entryLayout: 'content',
      columns: ['title', 'date'],
      schema: {
        title: fields.slug({
          name: {
            label: 'Tytuł',
            description: 'Np. „Roczek Antosia” albo „Zuzia i Marek — plener jesienny”.',
          },
          slug: {
            label: 'Adres strony',
            description: 'Fragment adresu po /sesje/. Nie zmieniaj po opublikowaniu.',
          },
        }),
        date: fields.date({
          label: 'Data sesji',
          description: 'Sesje wyświetlają się od najnowszej.',
          // Required, and defaulted to today: the site sorts by this and its
          // schema demands it, so an entry saved without a date breaks the build.
          defaultValue: { kind: 'today' },
          validation: { isRequired: true },
        }),
        tags: fields.multiselect({
          label: 'Rodzaje sesji',
          description: 'Możesz zaznaczyć kilka — np. sesja świąteczna rodzinna.',
          options: [...SESSION_CATEGORIES],
          defaultValue: ['Rodzinna'],
        }),
        intro: fields.text({
          label: 'Krótki opis',
          description: 'Kilka zdań o sesji. Pokazuje się nad zdjęciami i na liście sesji.',
          multiline: true,
          validation: { length: { min: 1 } },
        }),
        coverImage: fields.image({
          label: 'Zdjęcie główne',
          description: 'Widoczne na liście sesji i przy udostępnianiu linku.',
          directory: inRepo('images/sessions'),
          publicPath: '../../images/sessions/',
          validation: { isRequired: true },
        }),
        photos: fields.array(
          fields.object({
            image: fields.image({
              label: 'Zdjęcie',
              directory: inRepo('images/sessions'),
              publicPath: '../../images/sessions/',
              validation: { isRequired: true },
            }),
            alt: fields.text({
              label: 'Opis zdjęcia',
              description:
                'Krótki opis dla osób niewidomych i wyszukiwarek. Np. „Rodzina na kocu w ogrodzie”.',
            }),
          }),
          {
            label: 'Zdjęcia',
            description: 'Przeciągnij, żeby zmienić kolejność.',
            itemLabel: (item) => item.fields.alt.value || 'Zdjęcie',
          },
        ),
        featured: fields.checkbox({
          label: 'Pokaż na stronie głównej',
          defaultValue: false,
        }),
        draft: fields.checkbox({
          label: 'Szkic',
          description: 'Zaznaczone = niewidoczne na stronie.',
          defaultValue: false,
        }),
        body: fields.markdoc({
          label: 'Treść (opcjonalnie)',
          description: 'Dłuższy tekst pod krótkim opisem, nad zdjęciami. Możesz zostawić puste.',
          options: { image: false },
        }),
      },
    }),

    offers: collection({
      label: 'Oferta',
      path: inRepo('content/offers/*'),
      slugField: 'name',
      format: 'yaml',
      columns: ['name', 'price'],
      schema: {
        name: fields.slug({
          name: { label: 'Nazwa sesji' },
          slug: { label: 'Adres strony', description: 'Fragment adresu po /oferta/.' },
        }),
        description: fields.text({ label: 'Opis', multiline: true }),
        includes: fields.array(fields.text({ label: 'Pozycja' }), {
          label: 'Co obejmuje',
          itemLabel: (item) => item.value || 'Pozycja',
        }),
        duration: fields.text({ label: 'Czas trwania', description: 'Np. „ok. 90 minut”' }),
        price: fields.text({ label: 'Cena', description: 'Np. „od 550 zł”' }),
        image: fields.image({
          label: 'Zdjęcie główne',
          description: 'Jedno zdjęcie — widać je na liście ofert i na górze strony.',
          directory: inRepo('images/offers'),
          publicPath: '../../images/offers/',
          validation: { isRequired: true },
        }),
        gallery: fields.array(
          fields.object({
            image: fields.image({
              label: 'Zdjęcie',
              directory: inRepo('images/offers'),
              publicPath: '../../images/offers/',
              validation: { isRequired: true },
            }),
            alt: fields.text({
              label: 'Opis zdjęcia',
              description:
                'Krótki opis dla osób niewidomych i wyszukiwarek. Np. „Dziecko przy choince”.',
            }),
          }),
          {
            label: 'Więcej zdjęć',
            description:
              'Galeria pod opisem oferty. Przeciągnij, żeby zmienić kolejność. Możesz zostawić puste.',
            itemLabel: (item) => item.fields.alt.value || 'Zdjęcie',
          },
        ),
        tag: fields.select({
          label: 'Pokaż przykłady sesji',
          description:
            'Które sesje wyświetlić pod ofertą, w sekcji „Takie sesje już robiłam”. Wybierz rodzaj, którym oznaczasz takie sesje.',
          options: [{ label: '— nie pokazuj —', value: '' }, ...SESSION_CATEGORIES],
          defaultValue: '',
        }),
        order: fields.integer({
          label: 'Kolejność',
          description: 'Mniejsza liczba = wyżej na liście.',
          defaultValue: 10,
        }),
        featured: fields.checkbox({
          label: 'Pokaż na stronie głównej',
          defaultValue: true,
        }),
        season: fields.select({
          label: 'Sezon',
          options: [
            { label: 'Całoroczna', value: 'caloroczna' },
            { label: 'Świąteczna', value: 'swiateczna' },
          ],
          defaultValue: 'caloroczna',
        }),
      },
    }),
  },

  singletons: {
    homePage: singleton({
      label: 'Strona główna',
      path: inRepo('content/pages/home'),
      format: { data: 'yaml' },
      schema: {
        eyebrow: fields.text({ label: 'Nadtytuł', description: 'Mały tekst nad nagłówkiem.' }),
        heading: fields.text({ label: 'Nagłówek', validation: { length: { min: 1 } } }),
        text: fields.text({ label: 'Tekst pod nagłówkiem', multiline: true }),
      },
    }),

    sessionsPage: singleton({
      label: 'Strona „Moje sesje”',
      path: inRepo('content/pages/sessions'),
      format: { data: 'yaml' },
      schema: {
        heading: fields.text({ label: 'Nagłówek' }),
        intro: fields.markdoc.inline({ label: 'Tekst wstępny' }),
      },
    }),

    offersPage: singleton({
      label: 'Strona „Oferta”',
      path: inRepo('content/pages/offers'),
      format: { data: 'yaml' },
      schema: {
        heading: fields.text({ label: 'Nagłówek' }),
        intro: fields.markdoc.inline({ label: 'Tekst wstępny' }),
      },
    }),

    aboutPage: singleton({
      label: 'Strona „O mnie”',
      path: inRepo('content/pages/about'),
      format: { data: 'yaml' },
      schema: {
        heading: fields.text({ label: 'Nagłówek' }),
        text: fields.text({ label: 'Tekst', multiline: true }),
        signature: fields.text({ label: 'Podpis', description: 'Np. imię pod tekstem.' }),
      },
    }),

    christmasPage: singleton({
      label: 'Strona „Święta”',
      path: inRepo('content/pages/christmas'),
      format: { data: 'yaml' },
      schema: {
        active: fields.checkbox({
          label: 'Sezon świąteczny — włączony',
          description:
            'Jeden przełącznik: pokazuje stronę „Święta”, link w menu, blok na stronie głównej i cennik świąteczny. Włącz w listopadzie, wyłącz w styczniu.',
          defaultValue: false,
        }),
        eyebrow: fields.text({ label: 'Nadtytuł', description: 'Np. „Listopad — grudzień 2026”' }),
        heading: fields.text({ label: 'Nagłówek', defaultValue: 'Sesje świąteczne' }),
        lead: fields.text({
          label: 'Tekst wstępny',
          description: 'Kilka zdań na górze strony.',
          multiline: true,
        }),
        galleryIntro: fields.text({
          label: 'Tekst nad zdjęciami',
          description: 'Jedno–dwa zdania nad galerią scenek.',
          multiline: true,
        }),
        contactHeading: fields.text({
          label: 'Nagłówek nad kontaktem',
          description: 'Nad przyciskami kontaktu na dole strony.',
          defaultValue: 'Zarezerwuj termin świąteczny',
        }),
        contactLead: fields.text({
          label: 'Tekst nad kontaktem',
          description: 'Zdanie pod tym nagłówkiem. Zostaw puste, żeby go nie pokazywać.',
          multiline: true,
          defaultValue:
            'Terminy listopadowe i grudniowe rezerwują się najszybciej — napisz albo zadzwoń.',
        }),
      },
    }),

    pricing: singleton({
      label: 'Cennik całoroczny',
      path: inRepo('content/pricing'),
      format: { data: 'yaml' },
      schema: {
        intro: fields.text({
          label: 'Wstęp',
          description: 'Zdanie lub dwa nad pakietami.',
          multiline: true,
        }),
        packages: fields.array(pricingPackage, {
          label: 'Pakiety (mini / standard / max)',
          itemLabel: (item) => `${item.fields.name.value} — ${item.fields.price.value}`,
        }),
        notes: fields.array(
          fields.object({
            title: fields.text({ label: 'Tytuł' }),
            // Rich text so a note can be a list rather than one block of prose.
            text: fields.markdoc.inline({ label: 'Treść' }),
          }),
          {
            label: 'Uwagi (rezerwacja, dojazd, zdjęcia dodatkowe)',
            description: 'Pokazują się pod obydwoma cennikami — całorocznym i świątecznym.',
            itemLabel: (item) => item.fields.title.value || 'Uwaga',
          },
        ),
      },
    }),

    christmasPricing: singleton({
      label: 'Cennik świąteczny',
      path: inRepo('content/christmas-pricing'),
      format: { data: 'yaml' },
      schema: {
        eyebrow: fields.text({ label: 'Nadtytuł', description: 'Np. „Listopad — grudzień”' }),
        title: fields.text({ label: 'Tytuł sekcji', defaultValue: 'Cennik świąteczny' }),
        description: fields.text({ label: 'Opis', multiline: true }),
        packages: fields.array(pricingPackage, {
          label: 'Pakiety świąteczne',
          itemLabel: (item) => `${item.fields.name.value} — ${item.fields.price.value}`,
        }),
      },
    }),

    seo: singleton({
      label: 'Widoczność w Google',
      path: inRepo('content/seo'),
      format: { data: 'yaml' },
      schema: {
        nearbyPlaces: fields.array(fields.text({ label: 'Miejscowość lub region' }), {
          label: 'Gdzie jeszcze fotografujesz',
          description:
            'Miejscowości i regiony wokół Twojego miasta, do których dojeżdżasz — ' +
            'np. Rybnik, Jastrzębie-Zdrój, Śląsk. Nie powtarzaj tu miasta z Ustawień, ' +
            'dopisuje się samo. Dzięki temu Google pokazuje stronę osobom szukającym ' +
            'fotografa z tamtych okolic, a lista widnieje w stopce. ' +
            'Wpisuj tylko miejsca, gdzie naprawdę robisz sesje.',
          itemLabel: (item) => item.value || 'Miejscowość',
        }),
        googleSiteVerification: fields.text({
          label: 'Google Search Console — kod weryfikacyjny',
          description:
            'Z Google Search Console: „Sposób weryfikacji: tag HTML” → skopiuj samą ' +
            'wartość content="…". Dzięki temu zobaczysz, czego ludzie szukają, ' +
            'zanim trafią na stronę. Zostaw puste, jeśli nie używasz.',
        }),
        pages: fields.object(
          Object.fromEntries(
            SEO_PAGES.map(([key, label]) => [key, seoPageFields(label)]),
          ) as { [K in (typeof SEO_PAGES)[number][0]]: ReturnType<typeof seoPageFields> },
          {
            label: 'Teksty w wynikach wyszukiwania',
            description:
              'Dla każdej strony: tytuł i opis, które Google pokazuje w wynikach. ' +
              'Każde pole możesz zostawić puste — wtedy tekst układa się sam ' +
              'z treści strony i z miasta.',
          },
        ),
      },
    }),

    settings: singleton({
      label: 'Ustawienia',
      path: inRepo('content/settings'),
      format: { data: 'yaml' },
      schema: {
        phone: fields.text({ label: 'Telefon', description: 'Np. „555 123 456”' }),
        email: fields.text({ label: 'E-mail' }),
        city: fields.text({
          label: 'Miasto',
          description:
            'Samo miasto, w którym działasz — np. „Żory”. Bez „i okolice”: ' +
            'okoliczne miejscowości wpisujesz niżej, w „Widoczność w Google”. ' +
            'To miasto trafia do danych firmy i do tytułów stron w Google.',
        }),
        facebook: fields.url({ label: 'Facebook — link do profilu' }),
        instagram: fields.url({ label: 'Instagram — link do profilu' }),
        whatsapp: fields.text({
          label: 'WhatsApp — numer',
          description:
            'Numer z kierunkowym kraju, bez spacji i plusa. Np. 48555123456. Zostaw puste, żeby ukryć przycisk.',
        }),
        seasonalBanner: fields.object(
          {
            active: fields.checkbox({
              label: 'Pokaż pasek na górze strony',
              defaultValue: false,
            }),
            text: fields.text({ label: 'Tekst paska' }),
            linkText: fields.text({ label: 'Tekst linku', description: 'Np. „zobacz szczegóły”' }),
            linkHref: fields.text({
              label: 'Adres linku',
              description: 'Np. /swieta, /cennik albo /kontakt.',
              defaultValue: '/swieta',
            }),
          },
          {
            label: 'Pasek ogłoszeniowy',
            description: 'Wąski pasek nad menu, na każdej stronie.',
          },
        ),
      },
    }),
  },
});

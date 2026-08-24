import { config, collection, singleton, fields } from '@keystatic/core';

/**
 * Panel do zarządzania treścią strony.
 *
 * Code is English; every label the photographer sees is Polish.
 *
 * Content lives in a separate private repo. In local mode it is a plain clone
 * at ./blog-content, so `pathPrefix` points there and every path below is
 * written once and works in both modes.
 */
const isLocal = process.env.KEYSTATIC_STORAGE === 'local';

const storage = isLocal
  ? ({ kind: 'local', pathPrefix: 'blog-content' } as const)
  : ({
      kind: 'github',
      repo: {
        owner: process.env.PUBLIC_CONTENT_REPO_OWNER || 'awfotografia',
        name: process.env.PUBLIC_CONTENT_REPO_NAME || 'blog-content',
      },
    } as const);

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

export default config({
  storage,

  ui: {
    brand: { name: 'AW Fotografia' },
    navigation: {
      Treść: ['sessions', 'offers'],
      Ustawienia: ['pricing', 'settings'],
    },
  },

  collections: {
    sessions: collection({
      label: 'Moje sesje',
      path: 'content/sessions/*',
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
            description: 'Fragment adresu po /moje-sesje/. Nie zmieniaj po opublikowaniu.',
          },
        }),
        date: fields.date({
          label: 'Data sesji',
          description: 'Sesje wyświetlają się od najnowszej.',
        }),
        category: fields.select({
          label: 'Rodzaj sesji',
          options: [
            { label: 'Plener', value: 'Plener' },
            { label: 'Rodzinna', value: 'Rodzinna' },
            { label: 'Roczek', value: 'Roczek' },
            { label: 'Noworodkowa', value: 'Noworodkowa' },
            { label: 'Ciążowa', value: 'Ciążowa' },
            { label: 'Świąteczna', value: 'Świąteczna' },
            { label: 'Ślubna', value: 'Ślubna' },
            { label: 'Inna', value: 'Inna' },
          ],
          defaultValue: 'Rodzinna',
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
          directory: 'images/sessions',
          publicPath: '../../images/sessions/',
          validation: { isRequired: true },
        }),
        photos: fields.array(
          fields.object({
            image: fields.image({
              label: 'Zdjęcie',
              directory: 'images/sessions',
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
          description: 'Dłuższy tekst pod zdjęciami. Możesz zostawić puste.',
          options: { image: false },
        }),
      },
    }),

    offers: collection({
      label: 'Oferta',
      path: 'content/offers/*',
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
        photoCount: fields.text({ label: 'Liczba zdjęć', description: 'Np. „25 zdjęć”' }),
        price: fields.text({ label: 'Cena', description: 'Np. „od 550 zł”' }),
        image: fields.image({
          label: 'Zdjęcie',
          directory: 'images/offers',
          publicPath: '../../images/offers/',
          validation: { isRequired: true },
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
    pricing: singleton({
      label: 'Cennik',
      path: 'content/pricing',
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
        christmas: fields.object(
          {
            active: fields.checkbox({
              label: 'Pokaż cennik świąteczny',
              description: 'Włącz w listopadzie, wyłącz w styczniu. Nie trzeba nic kasować.',
              defaultValue: false,
            }),
            eyebrow: fields.text({ label: 'Nadtytuł', description: 'Np. „Listopad — grudzień”' }),
            title: fields.text({ label: 'Tytuł sekcji' }),
            description: fields.text({ label: 'Opis', multiline: true }),
            packages: fields.array(pricingPackage, {
              label: 'Pakiety świąteczne',
              itemLabel: (item) => `${item.fields.name.value} — ${item.fields.price.value}`,
            }),
          },
          { label: 'Cennik świąteczny' },
        ),
        notes: fields.array(
          fields.object({
            title: fields.text({ label: 'Tytuł' }),
            text: fields.text({ label: 'Treść', multiline: true }),
          }),
          {
            label: 'Uwagi (rezerwacja, dojazd, zdjęcia dodatkowe)',
            itemLabel: (item) => item.fields.title.value || 'Uwaga',
          },
        ),
      },
    }),

    settings: singleton({
      label: 'Ustawienia',
      path: 'content/settings',
      format: { data: 'yaml' },
      schema: {
        heroEyebrow: fields.text({
          label: 'Nadtytuł na stronie głównej',
          description: 'Mały tekst nad nagłówkiem.',
        }),
        heroHeading: fields.text({
          label: 'Nagłówek na stronie głównej',
          validation: { length: { min: 1 } },
        }),
        heroText: fields.text({ label: 'Tekst na stronie głównej', multiline: true }),
        aboutHeading: fields.text({ label: 'Nagłówek „O mnie”' }),
        aboutText: fields.text({ label: 'Tekst „O mnie”', multiline: true }),
        signature: fields.text({ label: 'Podpis', description: 'Np. imię pod tekstem o mnie.' }),
        phone: fields.text({ label: 'Telefon', description: 'Np. „555 123 456”' }),
        email: fields.text({ label: 'E-mail' }),
        city: fields.text({ label: 'Miasto / obszar', description: 'Np. „Rzeszów i okolice”' }),
        hours: fields.text({ label: 'Godziny kontaktu' }),
        facebook: fields.url({ label: 'Facebook — link do profilu' }),
        instagram: fields.url({ label: 'Instagram — link do profilu' }),
        messenger: fields.url({ label: 'Messenger — link', description: 'Np. https://m.me/twojprofil' }),
        seasonalBanner: fields.object(
          {
            active: fields.checkbox({
              label: 'Pokaż pasek na górze strony',
              defaultValue: false,
            }),
            text: fields.text({ label: 'Tekst paska' }),
            linkText: fields.text({ label: 'Tekst linku', description: 'Np. „zobacz cennik”' }),
            linkHref: fields.text({ label: 'Adres linku', defaultValue: '/cennik' }),
          },
          { label: 'Pasek ogłoszeniowy' },
        ),
      },
    }),
  },
});

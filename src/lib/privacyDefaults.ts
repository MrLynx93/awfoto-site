/**
 * The privacy policy's wording, as first written. Shared by the panel, which
 * shows it as each field's starting text, and by the site, which falls back to
 * it for a field left empty — a legal page should never lose a section because
 * a box was cleared by accident.
 *
 * Plain module, no Node imports: keystatic.config.ts ships to the browser.
 */
export const PRIVACY_DEFAULTS = {
  lead:
    'Krótko, bo naprawdę nie ma tu wiele do opisania: strona liczy odwiedziny, ' +
    'ale nie zapisuje niczego w Twojej przeglądarce i nie wie, kim jesteś.',
  forms:
    'Strona nie ma formularza kontaktowego. Kontakt odbywa się telefonicznie, ' +
    'mailowo albo przez Instagram i Facebook — czyli poza tą stroną, na zasadach ' +
    'tych serwisów.',
  cookies:
    'Strona nie używa plików cookies ani niczego innego, co zapisywałoby dane ' +
    'w Twojej przeglądarce. Dlatego nie zobaczysz tu okienka z pytaniem o zgodę — ' +
    'nie ma na co jej wyrażać.',
  statistics:
    'Żeby wiedzieć, ile osób odwiedza stronę i które podstrony oglądają, korzystam ' +
    'z programu do statystyk działającego na moim własnym koncie hostingowym, więc ' +
    'dane nie trafiają do żadnej firmy analitycznej. Przy każdym otwarciu podstrony ' +
    'zapisywany jest skrócony adres IP (bez ostatnich dwóch części, więc nie da się ' +
    'z niego ustalić, kim jesteś).',
  serverLogs:
    'Serwer zapisuje standardowe logi dostępu (adres IP, data zapytania, typ ' +
    'przeglądarki). Służą wyłącznie diagnostyce i bezpieczeństwu.',
  photos:
    'Zdjęcia publikowane na stronie pochodzą z sesji, na których publikację osoby ' +
    'na nich uwiecznione wyraziły zgodę. Jeśli jesteś na którymś ze zdjęć i chcesz, ' +
    'żeby zostało usunięte — napisz, usunę je bez pytania o powód.',
} as const;

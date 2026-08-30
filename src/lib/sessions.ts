import { getCollection, type CollectionEntry } from 'astro:content';

export type Session = CollectionEntry<'sessions'>;

/**
 * Every session the public should see, newest first.
 *
 * Drafts are hidden in production but kept in `astro dev`, so the photographer
 * can preview an unfinished session locally before publishing it.
 */
export async function publishedSessions(): Promise<Session[]> {
  const sessions = await getCollection('sessions', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return sessions.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * The tag that marks a shoot as a Christmas one. It is one of the fixed
 * options in the panel, so this is a stable match rather than free text the
 * photographer could mistype.
 */
export const CHRISTMAS_TAG = 'Świąteczna';

/** Every published Christmas shoot, newest first — the portfolio on /swieta. */
export const christmasSessions = (all: Session[]): Session[] =>
  all.filter((session) => session.data.tags.includes(CHRISTMAS_TAG));

/**
 * Up to `limit` sessions other than `current`, for the "Inne sesje" block.
 * Sessions sharing any tag come first; the newest fill whatever is left.
 */
export function otherSessions(all: Session[], current: Session, limit = 3): Session[] {
  const rest = all.filter((session) => session.id !== current.id);
  const related = rest.filter((session) =>
    session.data.tags.some((tag) => current.data.tags.includes(tag)),
  );
  const others = rest.filter((session) => !related.includes(session));
  return [...related, ...others].slice(0, limit);
}

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const formatDate = (date: Date): string => dateFormatter.format(date);

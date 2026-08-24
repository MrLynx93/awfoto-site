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
 * Up to `limit` sessions other than `current`, for the "Inne sesje" block.
 * Falls back to the newest ones when there is nothing in the same category.
 */
export function otherSessions(all: Session[], current: Session, limit = 3): Session[] {
  const rest = all.filter((session) => session.id !== current.id);
  const sameCategory = rest.filter(
    (session) => session.data.category && session.data.category === current.data.category,
  );
  const others = rest.filter((session) => !sameCategory.includes(session));
  return [...sameCategory, ...others].slice(0, limit);
}

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const formatDate = (date: Date): string => dateFormatter.format(date);

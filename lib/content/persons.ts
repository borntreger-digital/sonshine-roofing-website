import 'server-only';
import { deployedEditorial } from './editorial';
import { ACTIVE_PERSON_SLUGS } from './person-policy';
export { ACTIVE_PERSON_SLUGS, EXCLUDED_PERSON_SLUGS } from './person-policy';
import type { Person, PersonImage, PersonNavItem, PersonSitemapEntry } from './editorial-types';
export type { Person, PersonImage, PersonNavItem, PersonSitemapEntry } from './editorial-types';
const activeSlugSet = new Set<string>(ACTIVE_PERSON_SLUGS);
export async function getPersonProfileImage(slug: string): Promise<PersonImage> {
  const person = await listPersonsBySlug(slug);
  if (!person?.featuredImage) {
    throw new Error(`[persons] Published Directus person "${slug}" has no profile image.`);
  }
  return person.featuredImage;
}

export async function listTeamPersons(): Promise<Person[]> {
  return deployedEditorial().persons.filter((person) => person.showOnTeam);
}
export async function listPersonNav(limit?: number): Promise<PersonNavItem[]> {
  return deployedEditorial()
    .persons.slice(0, limit)
    .map(({ slug, title, positionTitle, featuredImage }) => ({
      slug,
      title,
      positionTitle,
      featuredImage,
    }));
}
export async function listPersonsBySlug(slug: string): Promise<Person | null> {
  return activeSlugSet.has(slug)
    ? (deployedEditorial().persons.find((person) => person.slug === slug) ?? null)
    : null;
}
export async function listPersonSitemapEntries(): Promise<PersonSitemapEntry[]> {
  return deployedEditorial()
    .persons.filter((person) => !person.noindex)
    .map((person) => ({
      uri: '/person/' + person.slug,
      modified: person.modifiedAt,
      featuredImage: person.featuredImage,
    }));
}

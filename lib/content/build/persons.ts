import { ACTIVE_PERSON_SLUGS } from '../person-policy.ts';
const activeSlugSet = new Set<string>(ACTIVE_PERSON_SLUGS);
import { preparePersonBioHtml } from '../directus-person-html.ts';
import { calculatePersonSeo } from '../person-seo.ts';
import type { Person, PersonImage } from '../editorial-types';
export const DIRECTUS_COLLECTION = 'persons';

export type UnknownRecord = Record<string, unknown>;

export type DirectusConfig = { url: string; clientSlug: string; token: string };

export const DIRECTUS_FIELDS = [
  'client.slug',
  'status',
  'slug',
  'display_name',
  'first_name',
  'last_name',
  'title',
  'bio',
  'how_helps',
  'profile_image.id',
  'profile_image.description',
  'profile_image.width',
  'profile_image.height',
  'profile_image.focal_point_x',
  'profile_image.focal_point_y',
  'sort',
  'show_on_team',
  'noindex',
  'meta_title',
  'meta_description',
  'primary_focus_keyword',
  'focus_keywords',
  'og_title',
  'og_description',
  'og_image_override.id',
  'og_image_override.description',
  'og_image_override.width',
  'og_image_override.height',
  'modified_at',
] as const;

export function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text || null;
}

export function readBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = readString(value)?.toLowerCase();
  if (text === 'true' || text === '1' || text === 'yes') return true;
  if (text === 'false' || text === '0' || text === 'no') return false;
  return fallback;
}

export function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

export function directusImage(value: unknown, config: DirectusConfig): PersonImage | null {
  const image = asRecord(value);
  const id = readString(image?.id);
  if (!id) return null;
  const description = readString(image?.description);
  if (!description) {
    throw new Error(`[persons] Directus profile image ${id} is missing its required description.`);
  }
  const width = typeof image?.width === 'number' ? image.width : null;
  const height = typeof image?.height === 'number' ? image.height : null;
  const x = image?.focal_point_x;
  const y = image?.focal_point_y;
  const focalPoint =
    typeof x === 'number' &&
    Number.isFinite(x) &&
    width &&
    x >= 0 &&
    x <= width &&
    typeof y === 'number' &&
    Number.isFinite(y) &&
    height &&
    y >= 0 &&
    y <= height
      ? { x, y }
      : null;
  return {
    url: `${config.url}/assets/${encodeURIComponent(id)}`,
    altText: description,
    width,
    height,
    focalPoint,
  };
}

export function normalizeHowHelps(value: unknown): { text: string }[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('[persons] how_helps must be a JSON array.');
  return value.flatMap((row) => {
    const item = asRecord(row);
    if (!item || typeof item.text !== 'string') {
      throw new Error('[persons] Each how_helps row must contain plain text.');
    }
    const text = item.text.trim();
    return text ? [{ text }] : [];
  });
}

export function focusKeywords(
  primaryValue: unknown,
  keywordValue: unknown,
  slug: string,
): { primaryFocusKeyword: string | null; focusKeywords: string[] } {
  if (!Array.isArray(keywordValue)) {
    throw new Error(`[persons] Directus persons.focus_keywords must be an array for ${slug}.`);
  }
  const values = keywordValue.map((value) => {
    const keyword = readString(value);
    if (!keyword) throw new Error(`[persons] Empty focus keyword for ${slug}.`);
    return keyword;
  });
  const primary = readString(primaryValue);
  if (!primary) throw new Error(`[persons] Missing primary focus keyword for ${slug}.`);
  const index = values.findIndex(
    (keyword) => keyword.toLocaleLowerCase('en-US') === primary.toLocaleLowerCase('en-US'),
  );
  if (index < 0) throw new Error(`[persons] Primary focus keyword mismatch for ${slug}.`);
  return {
    primaryFocusKeyword: values[index],
    focusKeywords: [values[index], ...values.filter((_, valueIndex) => valueIndex !== index)],
  };
}

export function mapDirectusPerson(item: UnknownRecord, config: DirectusConfig): Person {
  const slug = readString(item.slug);
  if (!slug || !activeSlugSet.has(slug)) {
    throw new Error(`[persons] Directus returned unsupported active person slug "${slug ?? ''}".`);
  }
  const firstName = readString(item.first_name) ?? '';
  const lastName = readString(item.last_name) ?? '';
  const title = readString(item.display_name) ?? `${firstName} ${lastName}`.trim();
  if (!title) throw new Error(`[persons] Directus person ${slug} has no displayable name.`);
  const biography = preparePersonBioHtml(readString(item.bio));
  if (!biography) throw new Error(`[persons] Directus person ${slug} has no biography text.`);
  const noindex = readBoolean(item.noindex, true);
  const personBase = {
    slug,
    title,
    firstName: firstName || title,
    howHelps: normalizeHowHelps(item.how_helps),
    contentHtml: biography.html,
    contentPlain: biography.text,
    featuredImage: directusImage(item.profile_image, config),
    positionTitle: readString(item.title),
    showOnTeam: readBoolean(item.show_on_team),
    noindex,
    ...(noindex
      ? { primaryFocusKeyword: null, focusKeywords: [] }
      : focusKeywords(item.primary_focus_keyword, item.focus_keywords, slug)),
    modifiedAt: readString(item.modified_at),
  };
  const fallbackSeo = calculatePersonSeo(personBase);
  const ogImageOverride = directusImage(item.og_image_override, config);

  return {
    ...personBase,
    seo: {
      meta_title: readString(item.meta_title) ?? fallbackSeo.meta_title,
      meta_description: readString(item.meta_description) ?? fallbackSeo.meta_description,
      og_title: readString(item.og_title) ?? fallbackSeo.og_title,
      og_description: readString(item.og_description) ?? fallbackSeo.og_description,
      og_image: ogImageOverride ?? personBase.featuredImage ?? fallbackSeo.og_image,
    },
  };
}

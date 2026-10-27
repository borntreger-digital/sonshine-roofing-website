import { readDeploymentText } from './deployment-files.mjs';
import type { TermLite } from './project-types';
import type { VideoFiltersInput, VideoItem, VideoSearchResult, VideoSnapshot } from './video-types';

export function readVideoSnapshot(filename: string): VideoSnapshot {
  let snapshot: VideoSnapshot;
  try {
    snapshot = JSON.parse(readDeploymentText(filename)) as VideoSnapshot;
  } catch {
    throw new Error('Video snapshot is unavailable. Run the credentialed prebuild before starting the frontend.');
  }
  if (snapshot.version !== 2 || !snapshot.clientSlug || !Array.isArray(snapshot.videos) || !Array.isArray(snapshot.categories)
    || snapshot.videos.some((video) => !video.id || !video.slug || !video.youtubeId || !Array.isArray(video.legacyIds) || !Array.isArray(video.categories))
    || new Set(snapshot.videos.map((video) => video.id)).size !== snapshot.videos.length) {
    throw new Error('Video snapshot is invalid. Regenerate it with the credentialed prebuild.');
  }
  return { version: 2, clientSlug: snapshot.clientSlug, videos: snapshot.videos, categories: snapshot.categories };
}

export function findVideoInSnapshot(snapshot: VideoSnapshot, selection: string): VideoItem | null {
  const value = selection.trim();
  return snapshot.videos.find((video) => video.slug === value || video.id === value || video.legacyIds.includes(value)) ?? null;
}

export function queryVideoSnapshot(snapshot: VideoSnapshot, {
  first = 24, after = null, filters = {},
}: { first?: number; after?: string | null; filters?: VideoFiltersInput } = {}): VideoSearchResult {
  const input = filters as VideoFiltersInput & Record<string, unknown>;
  const list = (...values: unknown[]): string[] => {
    const value = values.find((item) => Array.isArray(item) && item.length);
    return Array.isArray(value) ? [...new Set(value.map((item) => String(item).trim().toLowerCase()).filter(Boolean))] : [];
  };
  const buckets = list(input.buckets, input.bucket, input.b);
  const categories = list(input.categorySlugs, input.categories, input.cat);
  const materials = list(input.materialTypeSlugs, input.materialSlugs, input.material);
  const areas = list(input.serviceAreaSlugs, input.serviceArea);
  const search = String(input.q ?? '').trim().toLocaleLowerCase('en-US');
  const intersects = (terms: TermLite[], selected: string[]) => !selected.length || terms.some((term) => selected.includes(term.slug.toLowerCase()));
  const matches = (video: VideoItem, omit?: 'bucket' | 'material_type' | 'service_area') => {
    if (search && !`${video.title} ${video.excerpt}`.toLocaleLowerCase('en-US').includes(search)) return false;
    if (omit !== 'bucket' && !intersects(video.categories, buckets)) return false;
    if (!intersects(video.categories, categories)) return false;
    if (omit !== 'material_type' && !intersects(video.materialTypes, materials)) return false;
    if (omit !== 'service_area' && !intersects(video.serviceAreas, areas)) return false;
    return true;
  };
  const all = [...new Map(snapshot.videos.map((video) => [video.id, video])).values()]
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const filtered = all.filter((video) => matches(video));
  const size = Number.isFinite(first) ? Math.max(1, Math.min(Math.floor(first), 50)) : 24;
  const parsedOffset = after && /^\d+$/u.test(after) ? Number(after) : 0;
  const offset = Number.isSafeInteger(parsedOffset) ? parsedOffset : 0;
  const end = Math.min(offset + size, filtered.length);
  const facets = [
    { taxonomy: 'bucket', selected: buckets, terms: snapshot.categories, getTerms: (video: VideoItem) => video.categories },
    { taxonomy: 'material_type', selected: materials, terms: [] as TermLite[], getTerms: (video: VideoItem) => video.materialTypes },
    { taxonomy: 'service_area', selected: areas, terms: [] as TermLite[], getTerms: (video: VideoItem) => video.serviceAreas },
  ].map(({ taxonomy, selected, terms, getTerms }) => {
    const counts = new Map<string, TermLite & { count: number }>(terms.map((term) => [term.slug, { name: term.name, slug: term.slug, count: 0 }]));
    for (const video of all.filter((item) => matches(item, taxonomy as 'bucket' | 'material_type' | 'service_area'))) {
      for (const term of new Map(getTerms(video).map((item) => [item.slug, item])).values()) {
        const previous = counts.get(term.slug);
        counts.set(term.slug, { name: term.name, slug: term.slug, count: (previous?.count ?? 0) + 1 });
      }
    }
    for (const slug of selected) if (!counts.has(slug)) counts.set(slug, { slug, name: slug, count: 0 });
    return { taxonomy, buckets: [...counts.values()] };
  });
  return {
    items: filtered.slice(offset, end),
    pageInfo: { hasNextPage: end < filtered.length, endCursor: end < filtered.length ? String(end) : null },
    total: filtered.length, facets,
    meta: { overallTotal: filtered.length, fullTotal: all.length },
  };
}

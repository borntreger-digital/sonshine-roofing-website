import { readDeploymentText } from './deployment-files.mjs';
import type { ProjectFull, ProjectSnapshot, ProjectSummary, ProjectsArchiveFilters, ProjectSearchResult } from './project-types';
import type { VideoItem } from './video-types';

export function projectServiceLabel(description: string | null): string {
  const scope = description?.match(/\broof (replacement|installation)\b/iu)?.[1].toLowerCase();
  if (scope === 'installation') return 'Roof Installation';
  if (scope === 'replacement') return 'Roof Replacement';
  return 'Roofing Project';
}

export function readProjectSnapshot(filename: string): ProjectSnapshot {
  let snapshot: Omit<ProjectSnapshot, 'projects'> & { projects: (Omit<ProjectFull, 'video'> & { videoId: string | null })[]; videos: VideoItem[] };
  try {
    snapshot = JSON.parse(readDeploymentText(filename)) as typeof snapshot;
  } catch {
    throw new Error('Project snapshot is unavailable. Run the credentialed prebuild before starting the frontend.');
  }
  if (snapshot.version !== 2 || !snapshot.clientSlug || !Array.isArray(snapshot.projects) || !snapshot.terms || !Array.isArray(snapshot.videos)) {
    throw new Error('Project snapshot is invalid. Regenerate it with the credentialed prebuild.');
  }
  const videos = new Map(snapshot.videos.map((video) => [video.id, video]));
  const projects = snapshot.projects.map((project) => {
    const { videoId, ...fields } = project;
    const video = videoId ? videos.get(videoId) : null;
    if (videoId && (!video || video.projectSlug !== project.slug)) {
      throw new Error('Project/video snapshot is inconsistent. Regenerate it with the credentialed prebuild.');
    }
    return { ...fields, video: video ?? null };
  });
  return { version: 2, clientSlug: snapshot.clientSlug, projects, terms: snapshot.terms };
}

export function projectSummary(project: ProjectSummary): ProjectSummary {
  const { id, neighborhood, slug, uri, title, year, date, heroImage, projectDescription, reviewSnippet, reviewAuthorName, materialTypes, roofColors, serviceAreas } = project;
  return { id, neighborhood, slug, uri, title, year, date, heroImage, projectDescription, reviewSnippet, reviewAuthorName, materialTypes, roofColors, serviceAreas };
}

export function queryProjectSnapshot(snapshot: ProjectSnapshot, {
  first = 24, after = null, filters = {},
}: { first?: number; after?: string | null; filters?: ProjectsArchiveFilters } = {}): ProjectSearchResult {
  const size = Number.isFinite(first) ? Math.max(1, Math.min(Math.floor(first), 50)) : 24;
  const offset = after && /^\d+$/u.test(after) ? Number(after) : 0;
  const search = (filters.search ?? '').trim().toLocaleLowerCase('en-US');
  const dimensions = [
    { key: 'materialTypes', filter: 'materialTypeSlugs', taxonomy: 'material_type', terms: snapshot.terms.materials },
    { key: 'roofColors', filter: 'roofColorSlugs', taxonomy: 'roof_color', terms: snapshot.terms.roofColors },
    { key: 'serviceAreas', filter: 'serviceAreaSlugs', taxonomy: 'service_area', terms: snapshot.terms.serviceAreas },
  ] as const;
  const matches = (project: ProjectFull) => {
    const searchable = `${project.title} ${project.projectDescription ?? ''}`.toLocaleLowerCase('en-US');
    if (search && !searchable.includes(search)) return false;
    return dimensions.every(({ key, filter }) => {
      const selected = filters[filter]?.map((slug) => slug.trim().toLowerCase()).filter(Boolean) ?? [];
      return !selected.length || (project[key] ?? []).some((term) => selected.includes(term.slug));
    });
  };
  const filtered = snapshot.projects.filter((project) => matches(project));
  const end = Math.min(offset + size, filtered.length);
  return {
    items: filtered.slice(offset, end).map(projectSummary),
    pageInfo: { hasNextPage: end < filtered.length, endCursor: end < filtered.length ? String(end) : null },
    total: filtered.length,
    facets: dimensions.map(({ key, taxonomy, terms }) => {
      const counts = new Map<string, number>();
      for (const project of filtered) {
        for (const term of project[key] ?? []) counts.set(term.slug, (counts.get(term.slug) ?? 0) + 1);
      }
      return { taxonomy, buckets: terms.map((term) => ({ ...term, count: counts.get(term.slug) ?? 0 })) };
    }),
    meta: { overallTotal: filtered.length, fullTotal: snapshot.projects.length },
  };
}

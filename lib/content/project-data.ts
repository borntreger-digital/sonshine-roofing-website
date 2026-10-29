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
  if (snapshot.version !== 3 || !snapshot.clientSlug || !Array.isArray(snapshot.projects) || !snapshot.terms || !Array.isArray(snapshot.videos)) {
    throw new Error('Project snapshot is invalid. Regenerate it with the credentialed prebuild.');
  }
  if (!Array.isArray(snapshot.terms.materials) || !Array.isArray(snapshot.terms.roofColors) || !Array.isArray(snapshot.terms.serviceAreas)) {
    throw new Error('Project color catalog is invalid. Regenerate it with the credentialed prebuild.');
  }
  const materialSlugs = new Set(snapshot.terms.materials.map((term) => term.slug));
  if (snapshot.terms.roofColors.some((color) => !color.materialTypeSlug || !materialSlugs.has(color.materialTypeSlug))) {
    throw new Error('Project color catalog is invalid. Regenerate it with the credentialed prebuild.');
  }
  const colors = new Map(snapshot.terms.roofColors.map((color) => [color.slug, color]));
  const videos = new Map(snapshot.videos.map((video) => [video.id, video]));
  const projects = snapshot.projects.map((project) => {
    if (!Array.isArray(project.roofColors) || !Array.isArray(project.materialTypes)
      || project.roofColors.some((color) => !color.materialTypeSlug || colors.get(color.slug)?.materialTypeSlug !== color.materialTypeSlug
        || !project.materialTypes.some((material) => material.slug === color.materialTypeSlug))) {
      throw new Error('Project material/color snapshot is inconsistent. Regenerate it with the credentialed prebuild.');
    }
    const { videoId, ...fields } = project;
    const video = videoId ? videos.get(videoId) : null;
    if (videoId && (!video || video.projectSlug !== project.slug)) {
      throw new Error('Project/video snapshot is inconsistent. Regenerate it with the credentialed prebuild.');
    }
    return { ...fields, video: video ?? null };
  });
  return { version: 3, clientSlug: snapshot.clientSlug, projects, terms: snapshot.terms };
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
    const searchable = [
      project.title, project.projectDescription ?? '',
      ...project.materialTypes.map((term) => term.name),
      ...project.roofColors.map((term) => term.name),
      ...project.serviceAreas.map((term) => term.name),
    ].join(' ').toLocaleLowerCase('en-US');
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

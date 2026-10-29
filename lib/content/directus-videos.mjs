import { directusBuildConfig, fetchDirectusProjectSnapshot, readDirectusCollection } from './directus-projects.mjs';
import { extractYouTubeId, youtubeThumb, youtubeWatchUrl } from './video-utils.mjs';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const fail = (message) => { throw new Error(`[Directus videos] ${message}`); };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// Legacy WordPress selections include emoji. Preserve their exact Unicode slug.
const videoSlug = (value) => typeof value === 'string' && value.length > 0 && value === value.trim() && !/[\s\p{C}/?#&=%]/u.test(value);
const DERIVED_CATEGORIES = [
  { slug: 'roofing-project', name: 'Roofing Projects', sort: 30 },
  { slug: 'other', name: 'Other', sort: 1000000 },
];
const VIDEO_FIELDS = ['id', 'client.slug', 'status', 'scope_key', 'slug', 'title', 'description', 'youtube_url', 'youtube_id', 'published_at', 'date_updated', 'legacy_ids', 'project'];
const CATEGORY_FIELDS = ['id', 'client.slug', 'status', 'scope_key', 'name', 'slug', 'sort'];

function publishedScope(row, config, label) {
  if (row.client?.slug !== config.clientSlug || row.status !== 'published') return fail(`${label} escaped the published client scope.`);
  if (text(row.scope_key) !== `${config.clientSlug}:${text(row.slug)}`) return fail(`${label} requires its database-maintained client scope key.`);
}

function date(value, label, required = false) {
  const raw = text(value);
  if (!raw && !required) return null;
  if (!raw || !Number.isFinite(Date.parse(raw))) return fail(`${label} requires a valid date.`);
  return raw;
}

export function mapDirectusVideoCategory(row, config) {
  publishedScope(row, config, 'Category');
  if (!SLUG.test(text(row.slug)) || !text(row.name) || !Number.isInteger(row.sort)) return fail('Published categories require a slug, name, and explicit order.');
  if (DERIVED_CATEGORIES.some((category) => category.slug === row.slug)) return fail('Derived category slugs cannot be ordinary assignments.');
  return { slug: text(row.slug), name: text(row.name), sort: row.sort };
}

/** Raw relation identities are used here only, never copied into the public item. */
export function mapDirectusVideo(row, config, { project = null, categories = [], uploadDate = null } = {}) {
  publishedScope(row, config, 'Video');
  if (!text(row.id) || !videoSlug(row.slug) || !text(row.title) || !text(row.description)) return fail('Published videos require identity, safe selection slug, title, and description.');
  const youtubeId = extractYouTubeId(row.youtube_url);
  if (!youtubeId || youtubeId !== row.youtube_id) return fail('YouTube input and derived identity must be valid and agree.');
  if (row.project !== null && (typeof row.project !== 'string' || !row.project)) return fail('Project relationship must be a raw identity or null.');
  if (!Array.isArray(row.legacy_ids) || row.legacy_ids.some((id) => typeof id !== 'string' || !id.trim())) return fail('Video compatibility aliases must be a string list.');
  const assigned = [...categories];
  if (row.project) assigned.push(DERIVED_CATEGORIES[0]);
  if (!assigned.length) assigned.push(DERIVED_CATEGORIES[1]);
  if (!row.project && project) return fail('Project context cannot exist without a relationship.');
  return {
    id: text(row.id), slug: text(row.slug), title: text(row.title), excerpt: text(row.description),
    youtubeId, youtubeUrl: youtubeWatchUrl(youtubeId), thumbnailUrl: youtubeThumb(youtubeId),
    date: date(row.published_at, 'Website publication', true),
    modified: date(row.date_updated || row.published_at, 'Video modified'),
    uploadDate: date(uploadDate, 'YouTube upload'), source: row.project ? 'project' : 'video_entry',
    legacyIds: [...new Set(row.legacy_ids.map(text))],
    categories: [...new Map(assigned.map((category) => [category.slug, category])).values()]
      .sort((a, b) => a.sort - b.sort || a.slug.localeCompare(b.slug)).map(({ name, slug }) => ({ name, slug })),
    materialTypes: project?.materialTypes ?? [], serviceAreas: project?.serviceAreas ?? [],
    ...(project ? { projectSlug: project.slug, projectUri: project.uri, projectNoindex: project.noindex } : {}),
  };
}

async function readUploadDates(ids, apiKey, fetcher) {
  const dates = new Map();
  if (!apiKey) return dates;
  for (let start = 0; start < ids.length; start += 50) {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.search = new URLSearchParams({ part: 'snippet', id: ids.slice(start, start + 50).join(','), maxResults: '50', key: apiKey }).toString();
    const response = await fetcher(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return fail(`YouTube upload-date lookup failed with HTTP ${response.status}.`);
    const payload = await response.json();
    if (payload.error || !Array.isArray(payload.items)) return fail('YouTube upload-date lookup returned an invalid response.');
    for (const item of payload.items) {
      if (!ids.includes(item.id)) return fail('YouTube returned an unexpected identity.');
      dates.set(item.id, date(item.snippet?.publishedAt, 'Verified YouTube upload', true));
    }
  }
  return dates;
}

export async function fetchDirectusContentSnapshot(env = process.env, fetcher = fetch) {
  const config = directusBuildConfig(env);
  const scope = { client: { slug: { _eq: config.clientSlug } }, status: { _eq: 'published' } };
  // Relations are independently paginated: Directus nested collection defaults
  // cannot truncate category membership, and a raw FK reveals no project fields.
  const [projectSource, rows, categoryRows, assignments] = await Promise.all([
    fetchDirectusProjectSnapshot(env, fetcher),
    readDirectusCollection(config, fetcher, 'videos', VIDEO_FIELDS),
    readDirectusCollection(config, fetcher, 'video_categories', CATEGORY_FIELDS),
    readDirectusCollection(config, fetcher, 'video_category_assignments', ['id', 'video', 'category'], { filter: { video: scope, category: scope } }),
  ]);
  const categories = categoryRows.map((row) => mapDirectusVideoCategory(row, config));
  if (new Set(categories.map((category) => category.slug)).size !== categories.length) return fail('Published category slugs must be unique.');
  const categoryById = new Map(categoryRows.map((row, index) => [row.id, categories[index]]));
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const memberships = new Map();
  const pairs = new Set();
  for (const assignment of assignments) {
    const category = categoryById.get(assignment.category);
    if (!category || !rowsById.has(assignment.video)) return fail('Category assignment references content outside the complete published inventory.');
    const key = `${assignment.video}:${assignment.category}`;
    if (pairs.has(key)) return fail('Duplicate category assignments are not allowed.');
    pairs.add(key);
    memberships.set(assignment.video, [...(memberships.get(assignment.video) ?? []), category]);
  }
  const projectBySlug = new Map(projectSource.projects.map((project) => [project.slug, project]));
  const youtubeIds = rows.map((row) => extractYouTubeId(row.youtube_url));
  if (youtubeIds.some((id) => !id) || new Set(youtubeIds).size !== youtubeIds.length) return fail('Published clips require unique valid YouTube identities within the client.');
  const uploadDates = await readUploadDates(youtubeIds, text(env.YOUTUBE_API_KEY), fetcher);
  const linkedProjects = new Set();
  const selections = new Map();
  const videos = rows.map((row) => {
    if (row.project && linkedProjects.has(row.project)) return fail('A project cannot be linked to more than one video.');
    if (row.project) linkedProjects.add(row.project);
    const slug = projectSource.projectIds.get(row.project);
    const project = slug ? projectBySlug.get(slug) : null;
    const video = mapDirectusVideo(row, config, { project, categories: memberships.get(row.id) ?? [], uploadDate: uploadDates.get(row.youtube_id) ?? null });
    for (const selection of new Set([video.id, video.slug, ...video.legacyIds])) {
      if (selections.has(selection)) return fail('Video slugs and compatibility aliases must resolve to exactly one video.');
      selections.set(selection, video.id);
    }
    if (project) project.videoId = video.id;
    return video;
  }).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return {
    version: 3, clientSlug: config.clientSlug,
    projects: projectSource.projects.map((project) => ({ ...project, videoId: project.videoId ?? null })),
    terms: projectSource.terms, videos,
    categories: [...categories, ...DERIVED_CATEGORIES].sort((a, b) => a.sort - b.sort || a.slug.localeCompare(b.slug)),
  };
}

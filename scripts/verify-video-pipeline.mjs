import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchDirectusContentSnapshot, mapDirectusVideo, mapDirectusVideoCategory } from '../lib/content/directus-videos.mjs';
import { readVideoSnapshot, queryVideoSnapshot, findVideoInSnapshot } from '../lib/content/video-data.ts';
import { readProjectSnapshot } from '../lib/content/project-data.ts';
import { writeContentSnapshot } from '../lib/content/write-content-snapshot.mjs';
import { extractYouTubeId } from '../lib/content/video-utils.mjs';
import { validateRouteOwners } from './validate-directus-routes.mjs';

const config = { url: 'https://cms.example.test', clientSlug: 'fixture-client' };
const env = { DIRECTUS_URL: config.url, DIRECTUS_CLIENT_SLUG: config.clientSlug, DIRECTUS_TOKEN: 'synthetic-token' };
const client = { slug: config.clientSlug };
const term = (slug) => ({ id: slug, slug, name: slug, client, status: 'published' });
const file = { id: 'roof-image', description: 'A synthetic roof.', type: 'image/jpeg', width: 1200, height: 800 };
const project = (id, slug) => ({
  id, slug, scope_key: `${config.clientSlug}:${slug}`, client, status: 'published', title: 'Project wording',
  description: 'A metal roof replacement.', published_at: '2018-01-01T00:00:00Z',
  featured_image: file, gallery: [], neighborhood: null, material_type: term('metal'), service_area: term('sarasota'),
  product_links: [], noindex: false,
  youtube_url: 'https://www.youtube.com/watch?v=abcdefghijk',
});
const category = (id, slug, sort) => ({ id, slug, name: slug === 'explainers' ? 'Explainers' : 'In the Field', sort, scope_key: `${config.clientSlug}:${slug}`, client, status: 'published' });
const sourceCategories = [category('explain', 'explainers', 20), category('field', 'in-the-field', 40)];
const sourceVideos = Array.from({ length: 251 }, (_, index) => ({
  id: `video-${index}`, slug: `clip-${index}`, scope_key: `${config.clientSlug}:clip-${index}`, client, status: 'published',
  title: `Independent clip ${index}`, description: index === 0 ? 'An installation explainer.' : 'Roofing context.',
  youtube_url: `https://youtu.be/v${String(index).padStart(10, '0')}`, youtube_id: `v${String(index).padStart(10, '0')}`,
  published_at: new Date(Date.UTC(2020, 0, index + 1)).toISOString(), date_updated: '2021-01-01T00:00:00Z',
  legacy_ids: [`legacy-${index}`, ...(index === 0 ? ['project-original-project', 'original-project', '12345', 'dmlkZW9MaWJyYXJ5OjEyMzQ1', 'roof-😀'] : [])],
  project: index === 0 ? 'visible-project-id' : index === 1 ? 'hidden-project-id' : null,
}));
const sourceAssignments = sourceVideos.filter((_, index) => index !== 2).map((video, index) => ({ id: `assignment-${index}`, video: video.id, category: 'explain' }));
sourceAssignments.push({ id: 'second-category', video: 'video-0', category: 'field' });
const source = {
  roofing_projects: [project('visible-project-id', 'current-project'), project('unrelated-project-id', 'unrelated')],
  roofing_material_types: [term('metal')], roofing_roof_colors: [], roofing_service_areas: [term('sarasota')],
  videos: sourceVideos, video_categories: sourceCategories, video_category_assignments: sourceAssignments,
};
const requested = [];
function sourceFetcher(collections = source, customize) {
  return async (url, options) => {
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.Authorization, `Bearer ${env.DIRECTUS_TOKEN}`);
    requested.push(url);
    const collection = url.pathname.split('/').at(-1);
    const filter = JSON.parse(url.searchParams.get('filter'));
    const scope = { client: { slug: { _eq: config.clientSlug } }, status: { _eq: 'published' } };
    assert.deepEqual(filter, collection === 'video_category_assignments' ? { video: scope, category: scope } : scope);
    const rows = collections[collection];
    assert.ok(Array.isArray(rows), `Unexpected collection ${collection}`);
    const page = Number(url.searchParams.get('page'));
    const payload = { data: rows.slice((page - 1) * 100, page * 100), meta: { filter_count: rows.length } };
    return { ok: true, json: async () => customize?.(payload, collection, page) ?? payload };
  };
}

for (const url of ['https://youtu.be/abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk', 'https://www.youtube.com/shorts/abcdefghijk', 'https://www.youtube-nocookie.com/embed/abcdefghijk']) {
  assert.equal(extractYouTubeId(url), 'abcdefghijk');
}
for (const url of ['javascript:alert(1)', 'https://evil.example/watch?v=abcdefghijk', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'https://user:pass@youtube.com/watch?v=abcdefghijk', 'https://youtube.com/watch?v=abcdefghijk&v=lmnopqrstuv', 'https://youtu.be/short', 'https://youtu.be/abcdefghijk/path', 'https://youtu.be:8443/abcdefghijk']) {
  assert.equal(extractYouTubeId(url), null, 'unsafe or ambiguous references must not supply a player');
}

const snapshot = await fetchDirectusContentSnapshot(env, sourceFetcher());
assert.equal(snapshot.videos.length, 251, 'the inventory must include videos beyond the old 200 cap');
assert.ok(requested.some((url) => url.pathname.endsWith('/videos') && url.searchParams.get('page') === '3'));
assert.ok(requested.some((url) => url.pathname.endsWith('/video_category_assignments') && url.searchParams.get('page') === '3'), 'category relations must be completely paginated');
assert.ok(!requested.some((url) => url.searchParams.get('fields').includes('youtube_url') && url.pathname.endsWith('/roofing_projects')), 'old project URL must not be fetched');
assert.ok(!JSON.stringify(snapshot).includes('hidden-project-id'), 'unpublished project identities must never be packaged');
assert.ok(!('projectIds' in snapshot), 'private join maps must never be packaged');
assert.equal(snapshot.videos[0].slug, 'clip-250', 'website chronology controls order');
const linked = findVideoInSnapshot(snapshot, 'clip-0');
assert.equal(linked.title, 'Independent clip 0');
assert.equal(linked.projectSlug, 'current-project');
assert.equal(linked.projectUri, '/project/current-project/');
assert.deepEqual(linked.materialTypes, [{ slug: 'metal', name: 'metal' }]);
assert.deepEqual(linked.categories.map((item) => item.slug), ['explainers', 'roofing-project', 'in-the-field'], 'card memberships use the same managed category order as filters');
assert.equal(linked.date, sourceVideos[0].published_at);
assert.equal(linked.modified, sourceVideos[0].date_updated);
assert.equal(linked.uploadDate, null, 'website publication cannot be relabeled as YouTube upload');
assert.equal(findVideoInSnapshot(snapshot, 'project-original-project').id, linked.id);
for (const alias of ['12345', 'dmlkZW9MaWJyYXJ5OjEyMzQ1', 'roof-😀']) {
  assert.equal(findVideoInSnapshot(snapshot, alias).id, linked.id, 'Imported numeric, GraphQL, and Unicode selections must survive retirement of the importer');
}
assert.equal(findVideoInSnapshot(snapshot, 'original-project').id, linked.id);
assert.equal(findVideoInSnapshot(snapshot, 'legacy-250').slug, 'clip-250');
const hidden = findVideoInSnapshot(snapshot, 'clip-1');
assert.equal(hidden.source, 'project');
assert.equal(hidden.projectSlug, undefined);
assert.equal(hidden.projectUri, undefined);
assert.deepEqual(hidden.materialTypes, []);
assert.deepEqual(hidden.serviceAreas, []);
assert.ok(hidden.categories.some((item) => item.slug === 'roofing-project'));
assert.deepEqual(findVideoInSnapshot(snapshot, 'clip-2').categories, [{ slug: 'other', name: 'Other' }]);
const overlap = queryVideoSnapshot(snapshot, { filters: { buckets: ['explainers', 'in-the-field'] } });
assert.equal(overlap.total, 250, 'overlapping category matches must not duplicate videos');
assert.equal(queryVideoSnapshot(snapshot, { filters: { buckets: ['in-the-field'], materialTypeSlugs: ['metal'], serviceAreaSlugs: ['sarasota'] } }).total, 1, 'project context filters work across any selected category');
assert.equal(queryVideoSnapshot(snapshot, { filters: { buckets: ['roofing-project'] } }).total, 2);
const empty = queryVideoSnapshot(snapshot, { filters: { q: 'no matching phrase', buckets: ['explainers'] } });
assert.equal(empty.total, 0);
assert.equal(empty.facets[0].buckets.find((item) => item.slug === 'explainers').count, 0);
assert.equal(queryVideoSnapshot(snapshot, { filters: { q: 'INSTALLATION' } }).total, 1);
const firstPage = queryVideoSnapshot(snapshot, { first: 50 });
assert.equal(firstPage.pageInfo.endCursor, '50');
const lastPage = queryVideoSnapshot(snapshot, { first: 50, after: '250' });
assert.equal(lastPage.items.length, 1);
assert.equal(lastPage.items[0].slug, 'clip-0');
assert.equal(lastPage.pageInfo.hasNextPage, false);
assert.equal(queryVideoSnapshot({ ...snapshot, videos: [...snapshot.videos, snapshot.videos[0]] }).total, 251);
assert.equal(queryVideoSnapshot(snapshot).facets[0].buckets.find((item) => item.slug === 'explainers').count, 250);

for (const patch of [{ status: 'draft' }, { client: { slug: 'foreign' } }, { youtube_id: 'wrong' }, { youtube_url: 'https://unsafe.example/watch?v=abcdefghijk' }, { legacy_ids: null }, { project: {} }, { scope_key: 'wrong' }, { published_at: 'not-a-date' }]) {
  assert.throws(() => mapDirectusVideo({ ...sourceVideos[0], ...patch }, config));
}
assert.throws(() => mapDirectusVideoCategory({ ...sourceCategories[0], slug: 'roofing-project', scope_key: `${config.clientSlug}:roofing-project` }, config));
assert.throws(() => mapDirectusVideoCategory({ ...sourceCategories[0], client: { slug: 'foreign' } }, config));
assert.equal(mapDirectusVideo({ ...sourceVideos[0], slug: 'local-expertise-in-action-📸', scope_key: `${config.clientSlug}:local-expertise-in-action-📸` }, config).slug, 'local-expertise-in-action-📸');
for (const slug of ['space here', 'unsafe/path', 'bad?value', 'bad#value', 'bad&value', 'bad=value', 'bad%2Fvalue']) {
  assert.throws(() => mapDirectusVideo({ ...sourceVideos[0], slug, scope_key: `${config.clientSlug}:${slug}` }, config));
}
await assert.rejects(fetchDirectusContentSnapshot(env, sourceFetcher({ ...source, videos: sourceVideos.map((row, index) => index === 1 ? { ...row, project: sourceVideos[0].project } : row) })), /more than one video/u);
await assert.rejects(fetchDirectusContentSnapshot(env, sourceFetcher({ ...source, videos: sourceVideos.map((row, index) => index === 1 ? { ...row, youtube_url: sourceVideos[0].youtube_url } : row) })), /unique valid YouTube/u);
await assert.rejects(fetchDirectusContentSnapshot(env, sourceFetcher({ ...source, videos: sourceVideos.map((row, index) => index === 1 ? { ...row, legacy_ids: ['clip-0'] } : row) })), /exactly one video/u);
await assert.rejects(fetchDirectusContentSnapshot(env, sourceFetcher(source, (payload, collection, page) => collection === 'videos' && page === 1 ? { ...payload, data: payload.data.slice(0, 10) } : payload)), /truncated/u);
await assert.rejects(fetchDirectusContentSnapshot(env, sourceFetcher(source, (payload, collection, page) => collection === 'videos' && page === 2 ? { ...payload, meta: { filter_count: 252 } } : payload)), /changed during pagination/u);
await assert.rejects(fetchDirectusContentSnapshot(env, sourceFetcher(source, (payload, collection, page) => collection === 'videos' && page === 2 ? { ...payload, data: [sourceVideos[0], ...payload.data.slice(1)] } : payload)), /repeated identities/u);
await assert.rejects(fetchDirectusContentSnapshot(env, sourceFetcher(source, (payload, collection) => collection === 'videos' ? { data: payload.data } : payload)), /verified inventory count/u);

const unpublishedProject = await fetchDirectusContentSnapshot(env, sourceFetcher({ ...source, roofing_projects: source.roofing_projects.slice(1) }));
assert.equal(findVideoInSnapshot(unpublishedProject, 'clip-0').projectUri, undefined);
assert.ok(findVideoInSnapshot(unpublishedProject, 'clip-0').categories.some((item) => item.slug === 'roofing-project'));
const unpublishedVideo = await fetchDirectusContentSnapshot(env, sourceFetcher({
  ...source, videos: sourceVideos.slice(1), video_category_assignments: sourceAssignments.filter((row) => row.video !== 'video-0'),
}));
assert.equal(unpublishedVideo.projects[0].videoId, null);
assert.equal(findVideoInSnapshot(unpublishedVideo, 'clip-0'), null);
const noProjects = await fetchDirectusContentSnapshot(env, sourceFetcher({ ...source, roofing_projects: [] }));
assert.equal(noProjects.projects.length, 0, 'verified zero published projects must not block available videos');
assert.equal(noProjects.videos.length, 251);
assert.equal(findVideoInSnapshot(noProjects, 'clip-0').projectUri, undefined);
assert.equal(queryVideoSnapshot(noProjects, { filters: { buckets: ['roofing-project'] } }).total, 2);
const noVideos = await fetchDirectusContentSnapshot(env, sourceFetcher({ ...source, videos: [], video_category_assignments: [] }));
assert.equal(noVideos.videos.length, 0, 'verified zero videos allows editors to unpublish the last clip');
assert.equal(noVideos.projects.length, 2, 'project pages survive when all videos are unpublished');
assert.ok(noVideos.projects.every((row) => row.videoId === null));
assert.deepEqual(queryVideoSnapshot(noVideos).pageInfo, { hasNextPage: false, endCursor: null });
assert.equal(queryVideoSnapshot(noVideos).total, 0);

let youtubeCalls = 0;
const withUploadDates = await fetchDirectusContentSnapshot({ ...env, YOUTUBE_API_KEY: 'synthetic-key' }, async (url, options) => {
  if (url.hostname !== 'www.googleapis.com') return sourceFetcher()(url, options);
  youtubeCalls += 1;
  assert.equal(options.cache, 'no-store');
  const ids = url.searchParams.get('id').split(',');
  return { ok: true, json: async () => ({ items: ids.map((id) => ({ id, snippet: { publishedAt: '2010-01-01T00:00:00Z' } })) }) };
});
assert.equal(youtubeCalls, 6);
assert.equal(withUploadDates.videos[0].uploadDate, '2010-01-01T00:00:00Z');
assert.equal(withUploadDates.videos[0].date, snapshot.videos[0].date);

const directory = await mkdtemp(join(tmpdir(), 'video-snapshot-test-'));
const originalFetch = globalThis.fetch;
try {
  const filename = join(directory, 'projects.json');
  assert.throws(() => readVideoSnapshot(filename), /unavailable/u);
  await writeContentSnapshot(filename, async () => snapshot);
  globalThis.fetch = () => { throw new Error('Runtime CMS access is forbidden'); };
  const deployed = readVideoSnapshot(filename);
  const projects = readProjectSnapshot(filename);
  assert.equal(projects.projects[0].video.id, linked.id);
  assert.equal(projects.projects[0].video.youtubeUrl, linked.youtubeUrl);
  assert.equal(projects.projects[1].video, null);
  sourceVideos[0].title = 'A later CMS edit';
  assert.equal(findVideoInSnapshot(deployed, 'clip-0').title, 'Independent clip 0');
  assert.equal(projects.projects[0].video.title, 'Independent clip 0');
  await writeContentSnapshot(filename, async () => unpublishedVideo);
  assert.equal(readProjectSnapshot(filename).projects[0].video, null, 'an unpublished video removes only the project player');
  await writeContentSnapshot(filename, async () => noProjects);
  assert.deepEqual(readProjectSnapshot(filename).projects, []);
  assert.equal(readVideoSnapshot(filename).videos.length, 251);
  await writeContentSnapshot(filename, async () => noVideos);
  assert.deepEqual(readVideoSnapshot(filename).videos, []);
  assert.equal(readProjectSnapshot(filename).projects.length, 2);
  assert.ok(readProjectSnapshot(filename).projects.every((row) => row.video === null));
  await assert.rejects(writeContentSnapshot(filename, async () => { throw new Error('Interrupted source read'); }), /Interrupted/u);
  assert.throws(() => readVideoSnapshot(filename), /unavailable/u, 'failed refresh cannot reuse the previous artifact');
  assert.deepEqual(await readdir(directory), [], 'failed refresh leaves no partial output');
  await writeContentSnapshot(filename, async () => snapshot);
  const serialized = await readFile(filename, 'utf8');
  await writeContentSnapshot(filename, async () => snapshot);
  assert.equal(await readFile(filename, 'utf8'), serialized, 'repeated successful refresh is deterministic');
  await writeFile(filename, JSON.stringify({ ...snapshot, projects: snapshot.projects.map((row, index) => index === 0 ? { ...row, videoId: 'missing' } : row) }));
  assert.throws(() => readProjectSnapshot(filename), /inconsistent/u);
  await writeFile(filename, JSON.stringify({ ...snapshot, version: 2 }));
  assert.throws(() => readVideoSnapshot(filename), /invalid/u);
  await writeFile(filename, '{}');
  assert.throws(() => readVideoSnapshot(filename), /invalid/u);
} finally {
  globalThis.fetch = originalFetch;
  await rm(directory, { recursive: true, force: true });
}

// Exercise the real route-manifest consumer with synthetic published snapshots.
// Keep the pipeline's generic-client fixtures, translating only the route owner's
// site-specific client/scope fields at this boundary. Never slice executable source.
const routeClient = 'sonshine-roofing';
const routeSnapshot = value => ({
  ...value,
  clientSlug: value.clientSlug === config.clientSlug ? routeClient : value.clientSlug,
  projects: Array.isArray(value.projects) ? value.projects.map(project => ({
    ...project, scopeKey: project.scopeKey.replace(`${config.clientSlug}:`, `${routeClient}:`),
  })) : value.projects,
});
const routePolicy = projectSnapshot => validateRouteOwners({
  clientSlug: routeClient,
  readCollection: async () => [],
  snapshots: { projects: routeSnapshot(projectSnapshot), locations: { version: 1, clientSlug: routeClient, pages: [] } },
});
assert.deepEqual(await routePolicy(snapshot), snapshot.projects.map(project => ({
  collection: 'roofing_projects', id: project.slug, path: `/project/${project.slug}`,
})));
assert.deepEqual(await routePolicy(noProjects), [], 'Unpublished projects cannot own routes');
assert.equal((await routePolicy(noVideos)).length, 2, 'Unpublished videos cannot remove published project routes');
for (const invalid of [{ ...snapshot, version: 1 }, { ...snapshot, projects: null }, { ...snapshot, videos: null }, { ...snapshot, categories: null }, { ...snapshot, clientSlug: 'another-client' }]) {
  await assert.rejects(routePolicy(invalid), /invalid/u);
}
console.log('Verified unified Directus video/project snapshots, complete pagination, independent publication, private relation boundaries, overlapping filters, aliases, chronology, safe YouTube references, and atomic deployment-only refresh.');

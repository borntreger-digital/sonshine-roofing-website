import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { normalizeLocationSnapshot, normalizeLocationFaq, fetchDirectusLocationSnapshot } from '../lib/content/directus-locations.mjs';
import { readLocationSnapshot } from '../lib/content/location-data.ts';
import { mapDirectusProject } from '../lib/content/directus-projects.mjs';
import { normalizeSiteSettings, normalizeServiceSummaries } from '../lib/content/directus-site-shell.ts';
import { makeSiteShellFixture } from './fixtures/location-site-shell.mjs';
import { publicLocationFields } from './location-model/schema.mjs';

const config = { url: 'https://cms.example.test', clientSlug: 'fixture' };
const client = { slug: config.clientSlug };
const scope = { client, status: 'published' };
const area = (id, page_status = 'published') => ({ ...scope, id, name: id, slug: id, scope_key: `fixture:${id}`, page_status,
  page_title: `Roofing in ${id}`, introduction: `Coverage in ${id}.`, overview: null, overview_map: null,
  published_at: '2024-01-01T00:00:00Z', date_updated: null, noindex: false,
  meta_title: `Roofing in ${id}`, meta_description: `Local roofing coverage in ${id}.`, focus_keywords: [`${id} roofing`], primary_focus_keyword: `${id} roofing`, og_title: null, og_description: null, og_image_override: null });
const faq = { ...scope, id: 'faq', question: 'Local question?', answer: '<p>A verified answer.</p>', website_page: null, service: null, service_area: null, sort_order: 1 };
const shellFixture = makeSiteShellFixture('fixture');
const siteShell = { settings: normalizeSiteSettings(shellFixture.siteSettings[0], config), services: normalizeServiceSummaries(shellFixture.services, config) };
const source = () => ({ siteShell, featuredOffers: [], areas: [area('sarasota'), area('bradenton', 'draft'), area('osprey', 'taxonomy_only')], neighborhoods: [], neighbors: [], reviews: [], sponsors: [], sponsorAreas: [], faqs: [faq], faqScopes: [{ id: 'faq', website_page: null, service: null, service_area: null }], faqUnavailable: [], navigation: [], coverage: [{ id: 'coverage', client, title: 'Coverage' }], coverageAreas: [] });
const projects = { version: 3, clientSlug: 'fixture', projects: [], videos: [], categories: [], terms: {} };
const snapshot = normalizeLocationSnapshot(source(), config, projects);
assert.deepEqual(snapshot.pages.map(page => page.slug), ['sarasota']);
assert.equal(snapshot.areas[1].href, null);
assert.equal(snapshot.areas[2].href, null);
const noindex = source(); noindex.areas[0].noindex = true;
assert.equal(normalizeLocationSnapshot(noindex, config, projects).pages[0].href, '/locations/sarasota');
assert.equal(normalizeLocationSnapshot(noindex, config, projects).pages.filter(page => !page.noindex).length, 0);
for (const change of [
  data => { data.areas[0].client.slug = 'wrong'; },
  data => { data.areas[0].page_status = undefined; },
  data => { data.areas[0].overview_map = {}; },
  data => { data.areas[0].meta_title = ''; },
  data => { data.areas[0].noindex = undefined; },
  data => { data.areas[0].focus_keywords = ['not the primary']; },
  data => { data.neighbors = [{ id: 'pair', service_area: 'sarasota', nearby_area: 'sarasota', approved: true }]; },
  data => { data.neighbors = [{ id: 'pair', service_area: 'sarasota', nearby_area: 'osprey', approved: false }]; },
  data => { data.neighborhoods = [{ ...scope, id: 'hood', name: '', slug: 'hood', service_area: 'sarasota', coverage_map: null }]; },
]) {
  const data = structuredClone(source()); change(data);
  assert.throws(() => normalizeLocationSnapshot(data, config, projects));
}
const regional = source(); regional.neighbors = [{ id: 'pair', service_area: 'sarasota', nearby_area: 'osprey', approved: true }];
assert.equal(normalizeLocationSnapshot(regional, config, projects).neighbors.length, 1, 'taxonomy-only neighbors are valid');
const review = source(); review.reviews = [{ ...scope, id: 42, service_area: 'sarasota', rating: 5, author_name: 'Synthetic reviewer', review_text: 'Synthetic review.', source_created_at: null, review_date: null, url: null }];
assert.equal(normalizeLocationSnapshot(review, config, projects).reviews[0].id, '42', 'Directus integer review IDs become canonical string IDs');
const neighborhood = source(); neighborhood.neighborhoods = [{ ...scope, id: 'hood', name: 'Synthetic neighborhood', slug: 'synthetic-neighborhood', service_area: 'sarasota', image: { id: 'photo', description: 'Synthetic neighborhood entrance.', type: 'image/webp', metadata: null }, coverage_map: null }];
assert.equal(normalizeLocationSnapshot(neighborhood, config, projects).neighborhoods[0].image.altText, 'Synthetic neighborhood entrance.');
assert.equal(normalizeLocationSnapshot(neighborhood, config, projects).neighborhoods[0].mapImage, null, 'Neighborhood photos do not become coverage maps');
assert.equal(normalizeLocationSnapshot(neighborhood, config, projects).neighborhoods[0].image.attribution, null);
const attributedNeighborhood = structuredClone(neighborhood);
const credit = { title: 'Synthetic entrance photo', creator: 'Fixture photographer', source_url: 'https://example.com/photo',
  creator_url: 'https://example.com/creator', license: 'Fixture license', license_url: 'https://example.com/license', changes: 'Resized and converted to WebP; no crop.' };
attributedNeighborhood.neighborhoods[0].image.metadata = { attribution: { ...credit, unpublished_note: 'synthetic internal note' },
  exif: { GPSLatitude: 'synthetic excluded coordinate' }, unrelated: 'synthetic excluded metadata' };
const attributedPhoto = normalizeLocationSnapshot(attributedNeighborhood, config, projects).neighborhoods[0].image;
assert.deepEqual(attributedPhoto.attribution, { title: credit.title, creator: credit.creator, creatorUrl: credit.creator_url,
  sourceUrl: credit.source_url, license: credit.license, licenseUrl: credit.license_url, changes: credit.changes });
assert.doesNotMatch(JSON.stringify(attributedPhoto), /unpublished_note|GPSLatitude|unrelated|synthetic excluded|synthetic internal/);
for (const change of [
  photo => { delete photo.metadata; },
  photo => { photo.metadata = 'invalid'; },
  photo => { photo.metadata.attribution = []; },
  photo => { photo.metadata.attribution.creator = ''; },
  photo => { photo.metadata.attribution.source_url = 'javascript:alert(1)'; },
  photo => { photo.metadata.attribution.creator_url = 'data:text/html,unsafe'; },
  photo => { photo.metadata.attribution.license_url = 'https://synthetic-user:synthetic-pass@example.com/license'; },
  photo => { delete photo.metadata.attribution.license_url; },
]) {
  const invalid = structuredClone(attributedNeighborhood);
  change(invalid.neighborhoods[0].image);
  assert.throws(() => normalizeLocationSnapshot(invalid, config, projects), /photo|Photo/u);
}
const optionalCredit = structuredClone(attributedNeighborhood);
delete optionalCredit.neighborhoods[0].image.metadata.attribution.creator_url;
delete optionalCredit.neighborhoods[0].image.metadata.attribution.changes;
const optionalAttribution = normalizeLocationSnapshot(optionalCredit, config, projects).neighborhoods[0].image.attribution;
assert.equal(optionalAttribution.creatorUrl, null);
assert.equal(optionalAttribution.changes, null);
const missingFaq = source(); missingFaq.faqScopes.push({ id: 'local-missing', website_page: null, service: null, service_area: 'sarasota' });
assert.throws(() => normalizeLocationSnapshot(missingFaq, config, projects), /Eligible FAQ/u);
const unpublishedFaq = source(); unpublishedFaq.faqScopes.push({ id: 'draft-owner', website_page: null, service: null, service_area: 'bradenton' }); unpublishedFaq.faqUnavailable.push({ id: 'draft-owner' });
assert.equal(normalizeLocationSnapshot(unpublishedFaq, config, projects).faqs.length, 1, 'Explicitly verified unpublished owners are omitted');
const nav = source(); nav.navigation.push({ id: 'nav', status: 'published', label: 'Repair', link_type: 'service', menu: { ...scope, key: 'header' }, service: { ...scope, id: 'repair' } });
assert.throws(() => normalizeLocationSnapshot(nav, config, projects), /service slug/u);
nav.navigation[0].service.slug = 'roof-repair';
assert.equal(normalizeLocationSnapshot(nav, config, projects).navigation[0].href, '/roof-repair');
nav.navigation[0].service.status = undefined;
assert.throws(() => normalizeLocationSnapshot(nav, config, projects), /publication state/u);
const navigationTo = href => ({ id: 'link', status: 'published', label: 'Area', link_type: 'external_url', url: href, menu: { ...scope, key: 'header' } });
const siteUrl = new URL(siteShell.settings.siteUrl);
const aliasUrl = new URL(siteUrl); aliasUrl.hostname = `www.${siteUrl.hostname.replace(/^www\./u, '')}`;
for (const slug of ['bradenton', 'osprey', 'unknown']) for (const href of [`/locations/${slug}`, `/locations/${slug}?source=nav`, `/locations/${slug}#coverage`, new URL(`/locations/${slug}`, siteUrl).href, new URL(`/locations/${slug}`, aliasUrl).href]) {
  const data = source(); data.navigation = [navigationTo(href)];
  assert.equal(normalizeLocationSnapshot(data, config, projects).navigation[0].href, undefined, 'Unpublished location URLs cannot bypass canonical publication');
}
const publishedNav = source(); publishedNav.navigation = [navigationTo(new URL('/locations/sarasota?source=nav#coverage', aliasUrl).href)];
assert.equal(normalizeLocationSnapshot(publishedNav, config, projects).navigation[0].href, '/locations/sarasota?source=nav#coverage');
const featured = source(); featured.featuredOffers = [{ ...scope, id: 'offer', featured: true, slug: 'synthetic-offer', title: 'Synthetic offer', eyebrow: 'Synthetic savings', introduction: 'Example only.', featured_image: null, expiration_date: null }];
assert.equal(normalizeLocationSnapshot(featured, config, projects).featuredOffer.title, 'Synthetic offer');
assert.equal(normalizeLocationSnapshot(featured, config, projects).featuredOffer.eyebrow, 'Synthetic savings');
assert.equal(normalizeLocationSnapshot(featured, config, projects).featuredOffer.introduction, 'Example only.');
for (const field of ['eyebrow', 'introduction']) {
  const incomplete = structuredClone(featured);
  incomplete.featuredOffers[0][field] = '  ';
  assert.throws(() => normalizeLocationSnapshot(incomplete, config, projects), /Featured offer/u);
}
featured.featuredOffers[0].featured_image = {};
assert.throws(() => normalizeLocationSnapshot(featured, config, projects), /Featured offer image/u);
assert.throws(() => normalizeLocationFaq({ ...faq, service_area: area('sarasota'), service: { ...scope, id: 'service', slug: 'roof-repair', nav_label: 'Repair' } }, config), /exclusive/u);
assert.throws(() => normalizeLocationFaq({ ...faq, service_area: area('sarasota', 'draft') }, config), /publication/u);
assert.throws(() => normalizeLocationFaq({ ...faq, service_area: { ...area('sarasota'), client: { slug: 'wrong' } } }, config), /scope/u);
assert.equal(normalizeLocationFaq({ ...faq, service_area: area('sarasota'), answer: '<p onclick="bad()">Good<script>bad()</script></p>' }, config).contentHtml, '<p>Good</p>');

const requests = [];
const lookup = { roofing_service_areas: 'areas', roofing_neighborhoods: 'neighborhoods', roofing_service_area_neighbors: 'neighbors', reviews: 'reviews', sponsor_features: 'sponsors', sponsor_service_areas: 'sponsorAreas', faqs: 'faqs', navigation_items: 'navigation', service_area_sections: 'coverage', service_area_section_areas: 'coverageAreas', special_offers: 'featuredOffers' };
const env = { DIRECTUS_URL: config.url, DIRECTUS_TOKEN: 'synthetic-only', DIRECTUS_CLIENT_SLUG: 'fixture' };
const fetcher = async (input, options) => {
  const url = new URL(input); requests.push({ url, options });
  const name = url.pathname.split('/').pop();
  const fields = url.searchParams.get('fields');
  const data = name === 'site_settings' ? shellFixture.siteSettings : name === 'services' ? shellFixture.services
    : name === 'faqs' && !fields.includes('question') ? (fields.includes('website_page') ? source().faqScopes : source().faqUnavailable) : source()[lookup[name]];
  return { ok: true, json: async () => ({ data, meta: { filter_count: data.length } }) };
};
await fetchDirectusLocationSnapshot(projects, env, fetcher);
assert.equal(requests.length, 15);
assert.ok(requests.every(({url}) => !url.searchParams.get('fields').includes('*') && !url.searchParams.get('fields').includes('job_id')));
assert.ok(requests.every(({options}) => options.cache === 'no-store'));
assert.ok(requests.find(({ url }) => url.pathname.endsWith('/roofing_neighborhoods')).url.searchParams.get('fields').split(',').includes('image.metadata'));
for (const { url } of requests) {
  const grant = publicLocationFields[url.pathname.split('/').pop()];
  if (grant) for (const field of url.searchParams.get('fields').split(',')) assert.ok(grant.includes(field.split('.')[0]), 'Required query must fit the prepared reader grant');
}
const reviewQuery = JSON.parse(requests.find(({url}) => url.pathname.endsWith('/reviews')).url.searchParams.get('filter'));
assert.equal(reviewQuery.rating._eq, 5);
assert.ok(!('external_id' in reviewQuery) && !('latest_feed_member' in reviewQuery));
await assert.rejects(fetchDirectusLocationSnapshot(projects, env, async () => ({ ok: false, status: 403 })), /HTTP 403/u);
await assert.rejects(fetchDirectusLocationSnapshot(projects, env, async () => ({ ok: true, json: async () => ({ errors: [{}] }) })), /invalid/u);
await assert.rejects(fetchDirectusLocationSnapshot(projects, {}, fetcher), /requires/u);

const directory = await mkdtemp(join(tmpdir(), 'location-pipeline-'));
const previousClientSlug = process.env.DIRECTUS_CLIENT_SLUG;
try {
  process.env.DIRECTUS_CLIENT_SLUG = 'fixture';
  const projectFile = join(directory, 'projects.json'); const locationFile = join(directory, 'locations.json');
  await writeFile(projectFile, JSON.stringify(projects)); await writeFile(locationFile, JSON.stringify(snapshot));
  assert.equal(readLocationSnapshot(locationFile, projectFile).pages.length, 1);
  await writeFile(projectFile, JSON.stringify({ ...projects, version: 2 }));
  assert.throws(() => readLocationSnapshot(locationFile, projectFile), /incompatible/u, 'location reader requires the shared v3 snapshot');
  await writeFile(projectFile, JSON.stringify(projects));
  process.env.DIRECTUS_CLIENT_SLUG = 'different-fixture';
  assert.throws(() => readLocationSnapshot(locationFile, projectFile), /another client/u);
  process.env.DIRECTUS_CLIENT_SLUG = 'fixture';
  await writeFile(projectFile, JSON.stringify({ ...projects, videos: [{ id: 'changed' }] }));
  assert.throws(() => readLocationSnapshot(locationFile, projectFile), /incompatible/u);
} finally {
  if (previousClientSlug === undefined) delete process.env.DIRECTUS_CLIENT_SLUG;
  else process.env.DIRECTUS_CLIENT_SLUG = previousClientSlug;
  await rm(directory, { recursive: true, force: true });
}

const file = { id: 'image', description: 'Synthetic roof.', type: 'image/webp' };
const term = { ...scope, id: 'sarasota', name: 'sarasota', slug: 'sarasota' };
const rawProject = { ...scope, id: 'project', scope_key: 'fixture:project', slug: 'project', title: 'Synthetic project', description: 'Roof replacement.', published_at: '2024-01-01', featured_image: file, og_image_override: null, gallery: [], material_type: term, service_area: term, neighborhood: null, roof_color: null, noindex: true, job_id: 'synthetic-private-job', zip: '00000' };
const publicProject = mapDirectusProject(rawProject, config);
assert.equal(publicProject.neighborhood, null);
assert.ok(!JSON.stringify(publicProject).includes('synthetic-private-job'));
assert.ok(!('job_id' in publicProject) && !('zip' in publicProject));
assert.throws(() => mapDirectusProject({ ...rawProject, neighborhood: { ...scope, id: 'hood', name: 'Hood', slug: 'hood', service_area: 'wrong' } }, config), /primary service area/u);
for (const status of [undefined, 'invalid']) assert.throws(() => mapDirectusProject({ ...rawProject, neighborhood: { ...scope, id: 'hood', name: 'Hood', slug: 'hood', service_area: term.id, status } }, config), /publication state/u);
for (const status of ['draft', 'archived']) assert.equal(mapDirectusProject({ ...rawProject, neighborhood: { ...scope, id: 'hood', name: 'Hood', slug: 'hood', service_area: term.id, status } }, config).neighborhood, null);

const route = await readFile(new URL('../app/(site)/locations/[slug]/page.tsx', import.meta.url), 'utf8');
assert.match(route, /dynamicParams = false/u); assert.match(route, /revalidate = false/u);
assert.ok(!route.includes('content/wp') && !route.includes('catch'));
const imageSitemap = await readFile(new URL('../app/sitemap_index/image/route.ts', import.meta.url), 'utf8');
assert.ok(imageSitemap.includes('listLocationSitemapEntries') && !imageSitemap.includes('wpFetch'));
console.log('Verified location normalization, publication, taxonomy-only adjacency, explicit public projection, exclusive FAQ scope/sanitizer, fetch failure behavior, query ownership, and snapshot consistency.');

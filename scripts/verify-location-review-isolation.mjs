import assert from 'node:assert/strict';
import { fetchReviewSnapshot } from '../lib/content/build/editorial.mjs';
import { fetchDirectusLocationSnapshot } from '../lib/content/directus-locations.mjs';
import { selectLocationContent } from '../lib/content/location-selection.ts';
import { makeSiteShellFixture } from './fixtures/location-site-shell.mjs';

// Synthetic data only. Execute both real readers against a filtering HTTP fixture.
const env = { DIRECTUS_URL: 'https://cms.example.test', DIRECTUS_TOKEN: 'synthetic-only', DIRECTUS_CLIENT_SLUG: 'fixture' };
const client = { slug: env.DIRECTUS_CLIENT_SLUG };
const review = (id, changes = {}) => ({
  id, client, status: 'published', source: 'Google', rating: 5,
  author_name: `Synthetic ${id}`, review_text: `Synthetic review ${id}.`,
  review_date: '2024-01-01', source_created_at: '2024-01-01T12:00:00Z',
  url: null, external_id: null, service_area: 'local', sort_order: 1,
  ...changes,
});
const area = slug => ({
  id: slug, client, status: 'published', name: `Synthetic ${slug}`, slug,
  scope_key: `fixture:${slug}`, page_status: 'published', page_title: `Roofing in ${slug}`,
  introduction: 'Synthetic coverage.', overview: null, overview_map: null,
  published_at: '2024-01-01T00:00:00Z', date_updated: null,
  noindex: false, meta_title: `Roofing in ${slug}`, meta_description: 'Synthetic metadata.',
  primary_focus_keyword: `${slug} roofing`, focus_keywords: [`${slug} roofing`],
  og_title: null, og_description: null, og_image_override: null,
});
const shell = makeSiteShellFixture('fixture');
const projects = { version: 3, clientSlug: 'fixture', projects: [], videos: [], categories: [], terms: {} };

function matches(value, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '_and') return expected.every(clause => matches(value, clause));
    if (key === '_or') return expected.some(clause => matches(value, clause));
    if (key === '_eq') return value === expected;
    if (key === '_nnull') return expected ? value != null : value == null;
    if (key === '_null') return expected ? value == null : value != null;
    if (key === '_in') return expected.includes(value);
    assert.ok(!key.startsWith('_'), `Unhandled fixture operator: ${key}`);
    return matches(value?.[key], expected);
  });
}
function project(row, fields) {
  const result = {};
  for (const field of fields) {
    const parts = field.split('.');
    let source = row, target = result;
    for (const [index, part] of parts.entries()) {
      if (index === parts.length - 1 || source?.[part] == null || Array.isArray(source[part])) {
        target[part] = structuredClone(source?.[part]);
        break;
      }
      source = source[part]; target = target[part] ??= {};
    }
  }
  return result;
}
function fixtureReader(reviews, alterReviewResponse) {
  const calls = [];
  const collections = {
    reviews, site_settings: shell.siteSettings, services: shell.services,
    roofing_service_areas: [area('local'), area('nearby')],
    roofing_neighborhoods: [], roofing_service_area_neighbors: [],
    sponsor_features: [], sponsor_service_areas: [], faqs: [], navigation_items: [],
    service_area_sections: [{ id: 'coverage', client, title: 'Synthetic coverage' }],
    service_area_section_areas: [], special_offers: [],
  };
  const fetcher = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, env.DIRECTUS_URL, 'No live requests are permitted');
    assert.ok(!options.method || options.method === 'GET');
    const collection = url.pathname.split('/').at(-1);
    assert.ok(Object.hasOwn(collections, collection), 'Unexpected collection');
    const filter = JSON.parse(url.searchParams.get('filter'));
    const fields = url.searchParams.get('fields').split(',');
    calls.push({ collection, url, options, filter, fields });
    let rows = collections[collection].filter(row => matches(row, filter));
    const sort = (url.searchParams.get('sort') || '').split(',').filter(Boolean);
    rows.sort((a, b) => {
      for (const rule of sort) {
        const descending = rule.startsWith('-'), key = descending ? rule.slice(1) : rule;
        if (a[key] === b[key]) continue;
        if (a[key] == null) return 1;
        if (b[key] == null) return -1;
        return (a[key] < b[key] ? -1 : 1) * (descending ? -1 : 1);
      }
      return 0;
    });
    const count = rows.length, limit = Number(url.searchParams.get('limit'));
    const page = Number(url.searchParams.get('page') || 1);
    rows = rows.slice((page - 1) * limit, page * limit).map(row => project(row, fields));
    if (collection === 'reviews' && alterReviewResponse) rows = alterReviewResponse(rows);
    return { ok: true, status: 200, json: async () => ({ data: rows, meta: { filter_count: count } }) };
  };
  return { fetcher, calls };
}
function loadGoogleReader(fetcher) {
  return async () => (await fetchReviewSnapshot({ url: env.DIRECTUS_URL, clientSlug: env.DIRECTUS_CLIENT_SLUG, token: env.DIRECTUS_TOKEN }, fetcher)).reviews;
}
let checks = 0;
async function check(name, run) {
  try { await run(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}

await check('sitewide capture preserves Google membership and sorting across every page', async () => {
  const rows = Array.from({ length: 103 }, (_, i) => review(`google-${i}`, {
    external_id: `fixture-google-${i}`, sort_order: i, latest_feed_member: false, latest_feed_order: 103 - i,
  }));
  rows.unshift(review('static-newest', { sort_order: -1, source_created_at: '2030-01-01T00:00:00Z' }));
  const reader = fixtureReader(rows);
  const result = await loadGoogleReader(reader.fetcher)();
  assert.equal(result.length, 103);
  assert.equal(result[0].author_name, 'Synthetic google-0');
  assert.equal(result.at(-1).author_name, 'Synthetic google-102');
  const call = reader.calls[0];
  assert.deepEqual(call.filter, { client: { slug: { _eq: 'fixture' } }, status: { _eq: 'published' }, rating: { _eq: 5 }, review_text: { _nnull: true }, author_name: { _nnull: true } });
  assert.equal(call.url.searchParams.get('sort'), 'id');
  assert.equal(call.url.searchParams.get('limit'), '100');
  assert.equal(call.options.cache, 'no-store');
  assert.ok(!result.some(row => row.author_name.includes('static-newest')));
});
await check('sitewide reader excludes unpublished, other-client, non-Google and non-five-star records', async () => {
  const records = [review('eligible', { external_id: 'fixture-eligible' }),
    review('draft', { external_id: 'fixture-draft', status: 'draft' }),
    review('archived', { external_id: 'fixture-archived', status: 'archived' }),
    review('other-client', { external_id: 'fixture-other', client: { slug: 'other' } }),
    review('other-source', { external_id: 'fixture-source', source: 'Other' }),
    review('four-stars', { external_id: 'fixture-rating', rating: 4 }),
    review('static-location')];
  const reader = fixtureReader(records);
  assert.deepEqual((await loadGoogleReader(reader.fetcher)()).map(r => r.author_name), ['Synthetic eligible']);
});
await check('legacy date ordering breaks sort-order ties', async () => {
  const reader = fixtureReader([
    review('older', { external_id: 'fixture-older', source_created_at: '2023-01-01T00:00:00Z' }),
    review('newer', { external_id: 'fixture-newer', source_created_at: '2025-01-01T00:00:00Z' }),
  ]);
  assert.deepEqual((await loadGoogleReader(reader.fetcher)()).map(r => r.author_name), ['Synthetic newer', 'Synthetic older']);
});
await check('location query accepts published assigned static reviews without Google identity', async () => {
  const reader = fixtureReader([
    review('static-local'), review('static-nearby', { service_area: 'nearby' }),
    review('static-unassigned', { service_area: null }),
    review('static-draft', { status: 'draft' }), review('static-archived', { status: 'archived' }),
    review('static-four', { rating: 4 }), review('static-other', { client: { slug: 'other' } }),
  ]);
  const snapshot = await fetchDirectusLocationSnapshot(projects, env, reader.fetcher);
  assert.deepEqual(snapshot.reviews.map(r => r.id).sort(), ['static-local', 'static-nearby', 'static-unassigned']);
  const groups = selectLocationContent(snapshot.reviews, { areaId: 'local', nearbyAreaIds: ['nearby'], clientSlug: 'fixture', kind: 'reviews' });
  assert.deepEqual(groups.local.map(r => r.id), ['static-local']);
  assert.deepEqual(groups.nearby.map(r => r.id), ['static-nearby']);
  const call = reader.calls.find(call => call.collection === 'reviews');
  assert.deepEqual(call.filter, { client: { slug: { _eq: 'fixture' } }, status: { _eq: 'published' }, rating: { _eq: 5 }, review_text: { _nnull: true }, author_name: { _nnull: true } });
  assert.ok(!call.fields.includes('external_id') && !call.fields.includes('latest_feed_member'));
  assert.equal(call.options.cache, 'no-store');
  assert.ok(!JSON.stringify(snapshot.reviews).includes('external_id'));
});
for (const [name, change, expected] of [
  ['tenant', { client: { slug: 'other' } }, /published client scope/],
  ['editorial publication', { status: 'draft' }, /published client scope/],
  ['actual rating', { rating: 4 }, /verified five-star/],
  ['geographic owner', { service_area: 'unknown' }, /outside published client taxonomy/],
]) {
  await check(`location normalizer rejects upstream ${name} violations`, async () => {
    const reader = fixtureReader([review('static-local')], rows => rows.map(row => ({ ...row, ...change })));
    await assert.rejects(() => fetchDirectusLocationSnapshot(projects, env, reader.fetcher), expected);
  });
}
console.log(`Location review isolation verification passed (${checks} checks).`);

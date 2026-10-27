import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { globSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { readRouteCollection } from './route-inventory.mjs';
import { validateRouteOwners } from './validate-directus-routes.mjs';

const require = createRequire(import.meta.url);
const root = resolve(new URL('../', import.meta.url).pathname);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const NOT_FOUND = new Error('SYNTHETIC_NOT_FOUND');
const component = ({ children }) => React.createElement('div', null, children);
const site = { SITE_ORIGIN: 'https://example.test', sitemapEnabled: () => true, sitemapPreviewHeaders: () => ({}), isProdEnv: () => false };
class NextResponse extends Response { static json(value, init) { return Response.json(value, init); } }
function loader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    filename = resolve(root, filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} }; cache.set(filename, loaded);
    // .mjs forces ESM output even when CommonJS is requested. This isolated
    // loader evaluates every module through localRequire, including the new
    // deployment-file adapter, so give JS inputs a neutral extension.
    const source = ts.transpileModule(readFileSync(filename, 'utf8'), { fileName: filename.replace(/\.mjs$/, '.js'),
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const localRequire = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id === 'server-only') return {};
      if (id === 'next/navigation') return { notFound: () => { throw NOT_FOUND; } };
      if (id === 'next/server') return { NextResponse };
      if (id === 'next/cache') return { unstable_cache: callback => callback };
      if (id === 'next/image' || id === 'next/link') return component;
      if (id.startsWith('@/components/')) return new Proxy({}, { get: (_target, name) => name === '__esModule' ? true : component });
      if (id === '@/lib/seo/site') return site;
      if (id === '@/lib/seo/meta') return { buildBasicMetadata: value => ({ ...value }), buildArticleMetadata: value => ({ ...value }), buildProfileMetadata: value => ({ ...value }) };
      if (id === '@/lib/content/directus-site') return { getSiteSettings: async () => ({ defaultOgImage: { url: 'https://example.test/default.jpg' } }), getServices: async () => [], getWebsitePageMetadata: async value => value };
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? resolve(root, id.slice(2)) : resolve(dirname(filename), id);
        const path = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`].find(existsSync);
        assert.ok(path, `Missing module ${id}`); return load(path);
      }
      return require(id);
    };
    new Function('require', 'module', 'exports', source)(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return load;
}
let checks = 0;
async function check(name, callback) { try { await callback(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; } }
const slugs = ['published', 'noindex'];
const params = slug => ({ params: Promise.resolve({ slug }) });
const row = slug => slugs.includes(slug) ? { id: slug, slug, title: 'Fixture title', name: 'Fixture location', metaTitle: 'Fixture metadata', metaDescription: 'Fixture description', contentPlain: 'Fixture definition', contentHtml: '<p>Definition</p>', noindex: slug === 'noindex', seo: {}, focusKeywords: [], projectImages: [], serviceAreas: [], expirationDate: '2020-01-01', description: 'Fixture offer', date: '2026-01-01', modified: '2026-01-02' } : null;
const list = async () => slugs;
const nav = async () => slugs.map(row);
const sitemap = prefix => async () => [{ uri: `${prefix}published`, modified: '2026-01-02' }];
const locations = {
  listLocationSlugs: list, getLocationBySlug: async slug => row(slug), getLocationHubContent: async slug => row(slug) ? { page: row(slug) } : null,
  locationSnapshotId: () => 'fixture-snapshot', listLocationSitemapEntries: async () => [row('published')],
};
const specs = [
  { route: 'locations/[slug]', map: 'location', prefix: '/locations/', module: '@/lib/content/locations', api: locations, revalidate: false, fixed: true },
  { route: 'project/[slug]', map: 'project', prefix: '/project/', module: '@/lib/content/projects', api: { listProjectSlugs: list, getProjectBySlug: async slug => row(slug), listRelatedProjects: async () => [], listProjectSitemapEntries: sitemap('/project/') }, revalidate: false, fixed: true },
  { route: '[slug]', map: 'blog', prefix: '/', module: '@/lib/content/blog', api: { listPostSlugs: list, getPostBySlug: async slug => row(slug), listRelatedPosts: async () => [], listRecentPostNav: async () => [], listBlogSitemapEntries: sitemap('/') }, revalidate: false, fixed: true },
  { route: 'person/[slug]', map: 'person', prefix: '/person/', module: '@/lib/content/persons', api: { listPersonNav: nav, listPersonsBySlug: async slug => row(slug), listPersonSitemapEntries: sitemap('/person/') }, revalidate: false, fixed: true },
  { route: 'roofing-glossary/[slug]', map: 'roofing-glossary', prefix: '/roofing-glossary/', module: '@/lib/content/glossary', api: { listGlossaryIndex: nav, getGlossaryTerm: async slug => row(slug), listGlossarySitemapEntries: sitemap('/roofing-glossary/') }, revalidate: false, fixed: true },
  { route: 'special-offers/[slug]', map: 'special-offer', prefix: '/special-offers/', module: '@/lib/content/directus-special-offers', api: { listSpecialOfferSlugs: (...args) => { assert.equal(args.length, 0, 'Build-only offers must enumerate all slugs'); return list(); }, getSpecialOfferBySlug: async slug => row(slug), listSpecialOfferSitemapEntries: sitemap('/special-offers/') }, revalidate: false, fixed: true },
];
await check('every parameterized public page has a route contract', () => {
  const actual = globSync('app/**/page.tsx', { cwd: root }).filter(path => path.includes('['));
  assert.deepEqual(actual.sort(), specs.map(spec => `app/(site)/${spec.route}/page.tsx`).sort());
});
for (const spec of specs) await check(`${spec.route} params, metadata, missing routes and sitemap`, async () => {
  const load = loader({ [spec.module]: spec.api, '@/lib/content/directus-faqs': { listFaqs: async () => [] } });
  const page = load(`app/(site)/${spec.route}/page.tsx`);
  assert.deepEqual(await page.generateStaticParams(), slugs.map(slug => ({ slug })));
  assert.equal(page.revalidate, spec.revalidate);
  assert.equal(page.dynamicParams, false);
  assert.equal(page.dynamic, 'force-static');
  const metadata = await page.generateMetadata(params('published'));
  assert.equal(metadata.path, `${spec.prefix}published`);
  assert.notEqual(metadata.robots?.index, false);
  const noindex = await page.generateMetadata(params('noindex'));
  assert.equal(noindex.robots?.index, false);
  for (const slug of ['missing', 'draft', 'other-client', 'taxonomy-only']) {
    await assert.rejects(page.default(params(slug)), error => error === NOT_FOUND);
    if (spec.map === 'person' || spec.map === 'special-offer') assert.equal((await page.generateMetadata(params(slug))).robots.index, false);
    else await assert.rejects(page.generateMetadata(params(slug)), error => error === NOT_FOUND);
  }
  const response = await load(`app/sitemap_index/${spec.map}/route.ts`).GET();
  const xml = await response.text();
  assert.equal(response.status, 200);
  assert.match(xml, new RegExp(`https://example.test${spec.prefix}published`));
  assert.doesNotMatch(xml, /noindex|other-client|draft|taxonomy-only/);
});
await check('resource API dispatches every supported kind and bounds malformed input', async () => {
  const calls = [];
  const api = kind => async input => { calls.push({ kind, input }); return { nodes: [{ id: kind }], pageInfo: { hasNextPage: false } }; };
  const load = loader({ '@/lib/content/projects': { listProjectsPaged: api('project') }, '@/lib/content/videos': { listVideoItemsPaged: api('video') }, '@/lib/content/blog': { listPostsPaged: api('blog') } });
  const { POST } = load('app/api/resources/[kind]/route.ts');
  const request = body => new Request('https://example.test/api/resources/project', { method: 'POST', body });
  for (const kind of ['project', 'video', 'blog']) {
    const response = await POST(request(JSON.stringify({ first: 999, filters: { sa: 'fixture-city' } })), { params: Promise.resolve({ kind }) });
    assert.equal(response.status, 200); assert.equal((await response.json()).nodes[0].id, kind); assert.equal(calls.at(-1).input.first, 50);
  }
  for (const [kind, body, status] of [['invalid', '{}', 400], ['project', '{', 400], ['blog', '[]', 400], ['video', JSON.stringify({ padding: 'x'.repeat(1024 * 1024) }), 413]]) {
    assert.equal((await POST(request(body), { params: Promise.resolve({ kind }) })).status, status);
  }
  assert.equal(calls.length, 3);
});
await check('complete route inventory validates >500 records, scope and pagination failures', async () => {
  const rows = Array.from({ length: 503 }, (_, i) => ({ id: i + 1, client: { slug: 'fixture' }, status: 'published' }));
  const options = { collection: 'blog_posts', fields: ['id', 'slug'], directusUrl: 'https://cms.example.test', directusToken: 'synthetic', clientSlug: 'fixture' };
  const fetcher = alter => async url => {
    assert.equal(url.searchParams.get('sort'), 'id'); assert.equal(url.searchParams.get('meta'), 'filter_count');
    assert.deepEqual(JSON.parse(url.searchParams.get('filter')), { _and: [{ client: { slug: { _eq: 'fixture' } } }, { status: { _eq: 'published' } }] });
    const page = Number(url.searchParams.get('page'));
    const payload = { data: rows.slice((page - 1) * 500, page * 500), meta: { filter_count: rows.length } };
    return { ok: true, json: async () => alter ? alter(payload, page) : payload };
  };
  assert.equal((await readRouteCollection({ ...options, fetcher: fetcher() })).length, 503);
  for (const [alter, error] of [
    [(payload, page) => page === 2 ? { ...payload, data: [] } : payload, /truncated/],
    [(payload, page) => page === 2 ? { ...payload, data: [rows[0]] } : payload, /Duplicate/],
    [payload => ({ ...payload, meta: {} }), /count/],
    [(payload, page) => ({ ...payload, meta: { filter_count: 502 + page } }), /changed/],
    [payload => ({ ...payload, data: [{ ...rows[0], status: 'draft' }] }), /scope/],
    [payload => ({ ...payload, data: [{ ...rows[0], client: { slug: 'other' } }] }), /scope/],
  ]) await assert.rejects(readRouteCollection({ ...options, fetcher: fetcher(alter) }), error);
});
await check('route ownership catches collisions, bad slugs and missing tenant scope keys', async () => {
  const fixtures = { website_pages: [{ id: 'home', path: '/', scope_key: 'sonshine-roofing:/' }], services: [], blog_posts: [{ id: 'post', slug: 'post', scope_key: 'sonshine-roofing:post' }], special_offers: [], persons: [], roofing_glossary_terms: [] };
  const snapshots = { projects: { version: 2, clientSlug: 'sonshine-roofing', projects: [], videos: [], categories: [] }, locations: { version: 1, clientSlug: 'sonshine-roofing', pages: [{ id: 'area', slug: 'city', scopeKey: 'sonshine-roofing:city' }] } };
  const run = () => validateRouteOwners({ clientSlug: 'sonshine-roofing', readCollection: async collection => fixtures[collection], snapshots });
  assert.equal((await run()).length, 3);
  fixtures.website_pages.push({ id: 'collision', path: '/post/', scope_key: 'sonshine-roofing:/post' });
  await assert.rejects(run(), /collision/); fixtures.website_pages.pop();
  fixtures.blog_posts[0].slug = '../escape'; await assert.rejects(run(), /invalid route slug/);
  fixtures.blog_posts[0].slug = 'post'; fixtures.blog_posts[0].scope_key = 'other:post'; await assert.rejects(run(), /scope_key/);
});
await check('location hub retains five local FAQs before all eight shared FAQs and excludes other scopes', async () => {
  const faq = (id, scope = {}) => ({ id, title: `Question ${id}?`, contentHtml: '<p>Fixture answer.</p>', sortOrder: 1, websitePage: null, service: null, serviceArea: null, ...scope });
  const globals = Array.from({ length: 8 }, (_, i) => faq(`global-${i}`));
  const local = Array.from({ length: 5 }, (_, i) => faq(`local-${i}`, { serviceArea: { id: 'published', path: '/locations/published', navLabel: 'Fixture city' } }));
  const snapshot = { clientSlug: 'fixture', pages: [row('published'), row('noindex')], faqs: [...globals, ...local, faq('other', { serviceArea: { id: 'other' } }), faq('service', { service: { id: 'service' } }), faq('page', { websitePage: { id: 'page' } })], neighbors: [], reviews: [], sponsors: [], neighborhoods: [] };
  const load = loader({ './location-data': { readLocationSnapshot: () => snapshot }, './project-data': { readProjectSnapshot: () => ({ projects: [] }) } });
  const runtime = load('lib/content/locations.ts');
  const hub = await runtime.getLocationHubContent('published');
  assert.deepEqual(hub.faqs.map(item => item.id), [...local, ...globals].map(item => item.id));
  assert.equal(hub.faqs.length, 13);
  assert.equal(await runtime.getLocationHubContent('taxonomy-only'), null);
  assert.deepEqual((await runtime.listLocationSitemapEntries()).map(item => item.slug), ['published']);
});
await check('FAQ archive schema describes all 70 displayed answers and preserves area groups', async () => {
  const faqs = Array.from({ length: 70 }, (_, i) => ({ id: `faq-${i}`, title: `Question ${i}?`, contentHtml: `<p>Answer ${i}.</p>`, sortOrder: i, service: null, websitePage: null, serviceArea: i < 25 ? { id: `area-${Math.floor(i / 5)}`, path: `/locations/city-${Math.floor(i / 5)}`, navLabel: `City ${Math.floor(i / 5)}` } : null }));
  const api = loader({ './locations': { deployedLocations: () => ({ faqs }) } })('lib/content/directus-faqs.ts');
  assert.equal(api.groupFaqsForArchive(faqs).length, 6);
  const archive = loader({ '@/lib/content/directus-faqs': api })('app/(site)/faq/page.tsx');
  const doc = new JSDOM(renderToStaticMarkup(await archive.default())).window.document;
  const schemas = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent));
  const schema = schemas.find(value => value['@type'] === 'FAQPage');
  assert.equal(schema.mainEntity.length, 70);
  assert.equal(doc.querySelectorAll('.faq-answer').length, 70);
  assert.deepEqual(schema.mainEntity.map(item => item.name), faqs.map(item => item.title));
});
await check('snapshot readers enumerate the complete inventory without network access', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Runtime CMS access is forbidden'); };
  const items = Array.from({ length: 503 }, (_, i) => ({ ...row('published'), slug: `item-${i}`, noindex: i === 502 }));
  const editorial = { posts: items, topics: [], glossary: items, persons: [{ ...row('published'), slug: 'michael', showOnTeam: true }], offers: items, websitePages: [], sponsors: [], reviews: [], legalCopy: {} };
  const load = loader({ './editorial': { deployedEditorial: () => editorial } });
  try {
    for (const [file, list, get, sitemap, prefix] of [
      ['blog', 'listPostSlugs', 'getPostBySlug', 'listBlogSitemapEntries', '/'],
      ['glossary', 'listGlossaryIndex', 'getGlossaryTerm', 'listGlossarySitemapEntries', '/roofing-glossary/'],
      ['directus-special-offers', 'listSpecialOfferSlugs', 'getSpecialOfferBySlug', 'listSpecialOfferSitemapEntries', '/special-offers/'],
    ]) {
      const api = load(`lib/content/${file}.ts`);
      assert.equal((await api[list]()).length, 503);
      assert.equal((await api[get]('item-501')).slug, 'item-501');
      assert.equal(await api[get]('new-after-build'), null);
      const entries = await api[sitemap]();
      assert.equal(entries.length, 502);
      assert.ok(entries.some(entry => entry.uri === `${prefix}item-501`));
    }
    const people = load('lib/content/persons.ts');
    assert.equal((await people.listPersonNav()).length, 1);
    assert.equal((await people.listPersonsBySlug('michael')).slug, 'michael');
    assert.equal(await people.listPersonsBySlug('excluded-person'), null);
    const posts = load('lib/content/blog.ts');
    const first = await posts.listPostsPaged({ first: 50 });
    const second = await posts.listPostsPaged({ first: 50, after: first.pageInfo.endCursor });
    assert.equal(first.total, 503); assert.equal(second.items[0].slug, 'item-50');
  } finally { globalThis.fetch = originalFetch; }
});
process.stdout.write(`${checks} deployment route contract groups passed.\n`);

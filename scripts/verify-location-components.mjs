import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const modules = new Map();

// Compile the actual location, card, video facade, FAQ and sanitizer code. Only
// Next's image/link/font boundary and unchanged settings/lead-form behavior are replaced.
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} };
  modules.set(filename, loaded);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const localRequire = (id) => {
    if (id === 'next/image') return function FixtureImage(props) {
      const attributes = { ...props }; delete attributes.fill; delete attributes.priority;
      return React.createElement('img', attributes);
    };
    if (id === 'next/link') return function FixtureLink(props) {
      const attributes = { ...props }; delete attributes.prefetch;
      return React.createElement('a', attributes);
    };
    if (id === '@/lib/ui/allura-font') return { allura: { variable: 'fixture-font' } };
    if (id === '@/components/lead-capture/lead-form/LeadForm') return function FixtureLeadForm() { return null; };
    if (id === '@/components/lead-capture/lead-form/Fallback') return { LeadFormFallback: () => null };
    if (id === '@/lib/lead-capture/contact-lead') return { parseLeadSuccessCookie: () => null };
    if (id === '@/lib/content/site-settings-context') return { useSiteSettings: () => ({ heroImage: null, heroVideo: null, licenseNumber: '', licenseUrl: '' }) };
    if (id === 'server-only' || id.includes('directus-site') || id.includes('directus-faqs')) throw new Error(`Unexpected server data import: ${id}`);
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? resolve(root, id.slice(2)) : resolve(dirname(filename), id);
      const candidate = [base, `${base}.ts`, `${base}.tsx`].find((path) => existsSync(path));
      assert.ok(candidate, `Module exists: ${id}`);
      return loadSource(candidate);
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', source)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
const Hub = loadSource(resolve(root, 'components/location/LocationHub.tsx')).default;
const Coverage = loadSource(resolve(root, 'components/location/ServiceAreaSection.tsx')).default;
const Hero = loadSource(resolve(root, 'components/marketing/landing-page/LandingHero.tsx')).default;
const ServiceNavigation = loadSource(resolve(root, 'components/lead-capture/lead-form/InitialNavigation.tsx')).default;
const page = { id: 'area-local', name: 'Fixture City', slug: 'fixture-city', clientSlug: 'fixture-client', title: 'Roofing in Fixture City', introduction: 'Roofing services for Fixture City.', overviewHtml: null, mapImage: null };
const emptyGroups = () => ({ local: [], nearby: [] });
const baseProps = () => ({ page, projects: emptyGroups(), reviews: emptyGroups(), sponsors: emptyGroups(), neighborhoods: [], faqs: [] });
const project = (id, overrides = {}) => ({ id, status: 'published', clientSlug: 'fixture-client', serviceAreaIds: ['area-local'], project: {
  id, title: `Project ${id}`, slug: id, uri: `/project/${id}`, heroImage: null, projectDescription: 'A verified project.', materialTypes: [], roofColors: [],
  serviceAreas: [{ name: 'Fixture City', slug: 'fixture-city' }], neighborhood: null, video: null, ...overrides,
} });
const neighborhood = (overrides = {}) => ({ id: 'neighborhood-one', name: 'Fixture Neighborhood', slug: 'fixture-neighborhood', serviceAreaId: 'area-local', description: null, landmarks: null, image: null, mapImage: null, sort: 0, ...overrides });
const { StaticMediaProvider } = loadSource(resolve(root, 'components/media/StaticMediaProvider.tsx'));
const { SITE_CLIENT_IMAGE_KEYS } = loadSource(resolve(root, 'lib/content/static-image-client-keys.ts'));
const staticImages = Object.fromEntries(SITE_CLIENT_IMAGE_KEYS.map(key => [key, {
  url: `https://images.test/${key}`, description: 'Synthetic described image', type: 'image/webp',
  width: 400, height: 200, focalPoint: { x: 200, y: 100 },
}]));
const render = (Component, props) => new JSDOM(renderToStaticMarkup(
  React.createElement(StaticMediaProvider, { images: staticImages }, React.createElement(Component, props)),
)).window.document;
let checks = 0;
function check(name, callback) {
  try { callback(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}

check('empty optional sections leave only shared service navigation and no placeholders', () => {
  const doc = render(Hub, baseProps());
  assert.equal(doc.querySelector('h1').textContent, page.title);
  assert.equal(doc.querySelectorAll('[data-location-hub] section').length, 1);
  assert.deepEqual([...doc.querySelectorAll('[data-location-hub] h2')].map(node => node.textContent), ['Roofing Services in Fixture City']);
  assert.equal(doc.querySelectorAll('[data-location-hub] details, [data-location-hub] [data-project-neighborhood], [aria-labelledby="location-reviews"]').length, 0);
  assert.doesNotMatch(doc.body.textContent, /No .+ yet|not provided|Neighborhood \d|39 years/);
});
check('location hero keeps its CMS title, highlights exact approved case, and shows its introduction once', () => {
  const props = baseProps();
  props.page = { ...page, title: 'The BEST Roofing Company in Fixture City for Over 39 Years' };
  const doc = render(Hub, props);
  const heading = doc.querySelector('h1');
  assert.equal(heading.textContent, props.page.title);
  assert.deepEqual([...heading.querySelectorAll('span')].map(node => node.textContent), ['BEST', 'Over 39 Years']);
  assert.ok([...heading.querySelectorAll('span')].every(node => node.className === 'text-(--brand-cyan)'));
  assert.equal(heading.nextElementSibling.textContent, page.introduction);
  assert.equal([...doc.querySelectorAll('p')].filter(node => node.textContent === page.introduction).length, 1);
});
check('homepage hero defaults and all six shared service cards remain unchanged', () => {
  const homeHero = render(Hero, { scriptFontClassName: 'fixture-font' });
  assert.equal(homeHero.querySelector('h1').textContent, 'The BEST Roofing Company in Sarasota, Manatee, and Charlotte Counties for over 39 years');
  assert.deepEqual([...homeHero.querySelectorAll('h1 span')].map(node => node.textContent), ['BEST', 'over 39 years']);
  assert.equal(homeHero.querySelector('h1').nextElementSibling.tagName, 'DIV');
  const homeServices = render(ServiceNavigation, {});
  const locationServices = render(Hub, baseProps()).querySelector('[aria-labelledby="location-services"]');
  assert.equal(homeServices.querySelector('h2').textContent, 'How Can We Help?');
  assert.equal(homeServices.querySelectorAll('a').length, 6);
  assert.deepEqual([...locationServices.querySelectorAll('a')].map(node => node.outerHTML), [...homeServices.querySelectorAll('a')].map(node => node.outerHTML));
  assert.equal(locationServices.querySelector('h2 span').textContent, page.name);
  assert.match(locationServices.textContent, /Licensed and Insured/);
  assert.doesNotMatch(locationServices.textContent, /4\.[89]|25-year|A\+ Rated|Master Elite/);
});
check('a null neighborhood removes its entire label and wrapper', () => {
  const props = baseProps(); props.projects.local = [project('no-neighborhood')];
  const doc = render(Hub, props);
  assert.equal(doc.querySelectorAll('[data-project-neighborhood]').length, 0);
  assert.doesNotMatch(doc.body.textContent, /Neighborhood:/);
});
check('verified project neighborhood appears once under its linked card title', () => {
  const props = baseProps(); props.projects.local = [project('named', { neighborhood: { id: 'n', name: 'Verified Neighborhood', slug: 'verified' } })];
  const doc = render(Hub, props);
  const subtitle = doc.querySelector('[data-project-neighborhood]');
  assert.equal(doc.querySelectorAll('[data-project-neighborhood]').length, 1);
  assert.equal(subtitle.textContent, 'Verified Neighborhood');
  const title = subtitle.closest('a').querySelector('h3');
  assert.ok(title.parentElement.contains(subtitle));
  assert.ok(title.compareDocumentPosition(subtitle) & doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(subtitle.closest('a').getAttribute('href'), '/project/named');
  assert.equal(doc.querySelectorAll('button[aria-label^="Play video"]').length, 0);
  assert.doesNotMatch(doc.body.textContent, /Drone Video|Tap to watch/);
  assert.ok(doc.querySelector('a[href="/project/named"]'));
});
check('location project cards do not duplicate a project video player', () => {
  const props = baseProps(); props.projects.local = [project('with-video', { video: { title: 'Fixture roof video', youtubeId: 'fixture0001', thumbnailUrl: 'https://example.com/video.jpg' } })];
  const doc = render(Hub, props);
  assert.equal(doc.querySelectorAll('button[aria-label^="Play video"]').length, 0);
  assert.ok(doc.querySelector('a[href="/project/with-video"]'));
  assert.equal(doc.querySelectorAll('iframe').length, 0);
});
check('coverage records need a real name and omit every absent detail', () => {
  const doc = render(Coverage, { areaId: page.id, locationName: page.name, mapImage: null, neighborhoods: [neighborhood(), neighborhood({ id: 'blank', name: ' ' }), neighborhood({ id: 'other-area', name: 'Other place', serviceAreaId: 'other' })], projects: [] });
  assert.deepEqual([...doc.querySelectorAll('h3')].map((node) => node.textContent), ['Fixture Neighborhood']);
  assert.equal(doc.querySelectorAll('img, details, ul, figcaption').length, 0);
  assert.equal(doc.querySelectorAll('h4').length, 0);
  assert.doesNotMatch(doc.body.textContent, /ZIP|landmarks|No map|No description|Other place|Neighborhood 2/);
});
check('coverage links only verified published project matches, including projects outside recent six', () => {
  const matching = project('older-match', { neighborhood: { id: 'neighborhood-one', name: 'Fixture Neighborhood', slug: 'fixture-neighborhood' } });
  const props = baseProps(); props.neighborhoods = [neighborhood()];
  props.neighborhoodProjects = [matching, { ...project('draft', matching.project), id: 'draft', status: 'draft' }, project('no-match')];
  const doc = render(Hub, props);
  const links = [...doc.querySelectorAll('[aria-labelledby="location-coverage"] a')].map((node) => node.getAttribute('href'));
  assert.deepEqual(links, ['/project/older-match']);
  const projectHeading = doc.querySelector('[aria-labelledby="location-coverage"] h4');
  assert.equal(projectHeading.textContent, 'Featured Projects:');
  assert.equal(projectHeading.nextElementSibling.tagName, 'UL');
  assert.ok(projectHeading.nextElementSibling.classList.contains('list-disc'));
  assert.equal(projectHeading.nextElementSibling.querySelectorAll('li').length, 1);
  assert.equal(doc.querySelectorAll('a[href^="/neighborhood"]').length, 0);
});
check('coverage maps preserve verified descriptions and never add customer pins', () => {
  const doc = render(Coverage, { areaId: page.id, locationName: page.name, mapImage: { url: 'https://example.com/coverage.png', altText: 'Verified coverage outline for Fixture City' }, neighborhoods: [neighborhood({ mapImage: { url: 'https://example.com/neighborhood.png', altText: 'Verified neighborhood coverage outline' } })], projects: [] });
  assert.deepEqual([...doc.querySelectorAll('img')].map((node) => node.alt), ['Verified coverage outline for Fixture City', 'Verified neighborhood coverage outline']);
  assert.equal(doc.querySelectorAll('iframe, [data-latitude], [data-longitude]').length, 0);
  assert.match(doc.querySelector('figcaption').textContent, /service coverage map/);
});
check('neighborhood photos render separately from optional coverage maps', () => {
  const doc = render(Coverage, { areaId: page.id, locationName: page.name, mapImage: null, neighborhoods: [neighborhood({ image: { url: 'https://example.com/entrance.png', altText: 'Synthetic neighborhood entrance sign' } })], projects: [] });
  assert.equal(doc.querySelector('img').alt, 'Synthetic neighborhood entrance sign');
  assert.equal(doc.querySelectorAll('figcaption').length, 0);
});
check('neighborhood photos fill the top slot without rendering provenance metadata', () => {
  const attribution = { title: 'Synthetic photo credit', creator: 'Fixture photographer', creatorUrl: 'https://example.com/creator',
    sourceUrl: 'https://example.com/source', license: 'Fixture license', licenseUrl: 'https://example.com/license', changes: 'Fixture crop disclosure' };
  const photo = { url: 'https://example.com/photo.webp', altText: 'Synthetic entrance photo', attribution };
  const description = 'A complete description that remains readable in the neighborhood card.';
  const doc = render(Coverage, { areaId: page.id, locationName: page.name, mapImage: null,
    neighborhoods: [neighborhood({ image: photo, description })], projects: [] });
  const card = doc.querySelector('[data-neighborhood-card]');
  const frame = card.querySelector('[data-neighborhood-photo]');
  assert.equal(card.firstElementChild, frame);
  assert.equal(frame.querySelector('img').alt, photo.altText);
  assert.ok(frame.nextElementSibling.querySelector('h3'));
  assert.equal(card.querySelector('[data-neighborhood-description]').textContent, description);
  assert.equal(card.querySelectorAll('figcaption, a').length, 0);
  assert.doesNotMatch(card.textContent, /Synthetic photo credit|Fixture photographer|Fixture license|Fixture crop disclosure/);
});
check('section order and regional labels remain accurate and no business rating markup is emitted', () => {
  const props = baseProps();
  props.projects.local = [project('local')];
  props.projects.nearby = [{ ...project('regional', { serviceAreas: [{ name: 'Nearby Town', slug: 'nearby-town' }] }), serviceAreaIds: ['area-nearby'] }];
  const review = (id, areaName) => ({ id, authorName: 'Fixture Reviewer', text: 'Synthetic review.', rating: 5, areaName, date: null, url: null });
  props.reviews = { local: [review('local-review', page.name)], nearby: [review('nearby-review', 'Nearby Town')] };
  props.neighborhoods = [neighborhood()];
  props.sponsors.local = [{ id: 'sponsor-local', areaNames: [page.name], feature: { title: 'Fixture local partner', links: null, contentHtml: null, featuredImage: null } }];
  props.sponsors.nearby = [{ id: 'sponsor-nearby', areaNames: ['Nearby Town'], feature: { title: 'Fixture nearby partner', links: null, contentHtml: null, featuredImage: null } }];
  props.faqs = [{ id: 'faq-one', title: 'Fixture question?', contentHtml: '<p>Verified &amp; safe answer.</p>' }];
  const doc = render(Hub, props);
  assert.deepEqual([...doc.querySelectorAll('[data-location-hub] h2')].map((node) => node.textContent), [
    'Roofing Services in Fixture City', 'What Our Customers Say', 'Recent Roofing Projects in Fixture City',
    'Partnerships in Fixture City', 'Partnerships in Nearby Areas', 'Where We Work in Fixture City', 'Roofing Questions and Answers',
  ]);
  assert.match(doc.querySelector('[aria-label="Roofing Projects in Nearby Areas"]').textContent, /Nearby Town/);
  const reviewSection = doc.querySelector('[aria-labelledby="location-reviews"]');
  assert.equal(doc.querySelectorAll('[aria-labelledby="location-reviews"]').length, 1);
  assert.match(reviewSection.textContent, /Fixture City/);
  assert.match(reviewSection.textContent, /Nearby Town/);
  assert.doesNotMatch(reviewSection.textContent, /Reviews from|nearby areas|Nearby review/);
  assert.match(doc.querySelector('[aria-label="Partnerships in Nearby Areas"]').textContent, /Nearby Town/);
  assert.equal(doc.querySelectorAll('time').length, 0);
  const schema = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(schema['@type'], 'FAQPage');
  assert.equal(schema.mainEntity[0].acceptedAnswer.text, 'Verified & safe answer.');
  assert.doesNotMatch(JSON.stringify(schema), /AggregateRating|RoofingContractor|"Review"/);
  for (const heading of doc.querySelectorAll('[data-location-hub] h2')) assert.ok(heading.querySelector('span'), `${heading.textContent} includes a highlight`);
});
check('all thirteen location FAQ answers appear in visible content and JSON-LD in the same order', () => {
  const props = baseProps();
  props.faqs = Array.from({ length: 13 }, (_, index) => ({ id: `faq-${index}`, title: `${index < 5 ? 'Local' : 'Shared'} question ${index}?`, contentHtml: `<p>Verified answer ${index}.</p>` }));
  const doc = render(Hub, props);
  const schema = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(schema.mainEntity.length, 13);
  assert.deepEqual(schema.mainEntity.map(item => item.name), props.faqs.map(item => item.title));
  assert.deepEqual([...doc.querySelectorAll('[aria-label="Roofing Questions and Answers"] summary')].map(node => node.textContent), props.faqs.map(item => item.title));
});
check('CMS HTML remains sanitized and review text is escaped', () => {
  const props = baseProps();
  props.page = { ...page, overviewHtml: '<p>Overview</p><img src="private"><script>unsafeOverview()</script>' };
  props.faqs = [{ id: 'faq', title: 'Safe question', contentHtml: '<p>Answer<a href="javascript:alert(1)">link</a></p><script>unsafeFaq()</script>' }];
  props.reviews.local = [{ id: 'review', authorName: 'Fixture', areaName: page.name, rating: 5, text: '<img src=x onerror=unsafeReview()>', url: null, date: 'invalid' }];
  props.sponsors.local = [{ id: 'sponsor', areaNames: [page.name], feature: { title: 'Fixture partner', links: null, featuredImage: null, contentHtml: '<p>Partner</p><script>unsafeSponsor()</script>' } }];
  const doc = render(Hub, props);
  assert.equal([...doc.querySelectorAll('[data-location-hub] img')].filter(node => !node.closest('[aria-labelledby="location-services"]')).length, 0);
  assert.equal(doc.querySelectorAll('a[href^="javascript:"], script:not([type="application/ld+json"])').length, 0);
  assert.doesNotMatch(doc.querySelector('[data-location-hub]').innerHTML, /unsafeOverview|unsafeFaq|unsafeSponsor/);
  assert.match(doc.querySelector('blockquote').textContent, /<img src=x onerror=unsafeReview\(\)>/);
});
process.stdout.write(`${checks} location component fixtures passed.\n`);

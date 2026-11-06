import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { normalizeHowHelps, mapDirectusPerson } from '../lib/content/build/persons.ts';
import { editorialFixture, editorialFetcher } from './fixtures/editorial.mjs';
import { fetchEditorialSnapshot } from '../lib/content/build/editorial.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const modules = new Map();
// Render the real profile, navigation, cards, layout and SmartLink. Substitute
// only Next's image/link boundaries; no production CMS or network is used.
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} };
  modules.set(filename, loaded);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const localRequire = (id) => {
    if (id === 'next/image')
      return function FixtureImage(props) {
        const attributes = { ...props };
        delete attributes.fill;
        delete attributes.priority;
        return React.createElement('img', attributes);
      };
    if (id === 'next/link')
      return function FixtureLink(props) {
        const attributes = { ...props };
        delete attributes.prefetch;
        return React.createElement('a', attributes);
      };
    if (id === 'server-only') throw new Error('Unexpected runtime CMS boundary');
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/')
        ? resolve(root, id.slice(2))
        : resolve(dirname(filename), id);
      const candidate = [base, `${base}.ts`, `${base}.tsx`].find((path) => existsSync(path));
      assert.ok(candidate, `Module exists: ${id}`);
      return loadSource(candidate);
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', source)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
const Profile = loadSource(
  resolve(root, 'components/dynamic-content/person/PersonProfile.tsx'),
).default;
const config = {
  url: 'https://cms.example.test',
  clientSlug: 'sonshine-roofing',
  token: 'synthetic-only',
};
const fixture = editorialFixture();
const makePerson = (changes = {}) =>
  mapDirectusPerson({ ...fixture.persons[1], ...changes }, config);
const nav = fixture.persons.slice(0, 3).map((item) => mapDirectusPerson(item, config));
const render = (person, people = nav) =>
  new JSDOM(
    renderToStaticMarkup(
      React.createElement(Profile, {
        person,
        people,
        contact: React.createElement(
          'a',
          { href: '/contact-us#book-an-appointment' },
          'Contact Us',
        ),
      }),
    ),
  ).window.document;

assert.deepEqual(normalizeHowHelps(null), []);
assert.deepEqual(normalizeHowHelps(undefined), []);
assert.deepEqual(normalizeHowHelps([{ text: ' First ' }, { text: '  ' }, { text: 'Second' }]), [
  { text: 'First' },
  { text: 'Second' },
]);
for (const value of ['[]', {}, [null], ['plain'], [{ text: 42 }], [{}]]) {
  assert.throws(() => normalizeHowHelps(value), /how_helps/);
}
const firstName = makePerson({ first_name: 'JB', display_name: 'J. B. Public Name' });
assert.equal(firstName.firstName, 'JB');
assert.equal(
  makePerson({ first_name: ' ', display_name: 'Display Name' }).firstName,
  'Display Name',
);
const focal = makePerson({
  profile_image: { ...fixture.persons[1].profile_image, focal_point_x: 900, focal_point_y: 200 },
});
assert.deepEqual(focal.featuredImage.focalPoint, { x: 900, y: 200 });
assert.equal(
  makePerson({
    profile_image: { ...fixture.persons[1].profile_image, focal_point_x: -1, focal_point_y: 200 },
  }).featuredImage.focalPoint,
  null,
);

const injected = '<img src=x onerror=alert(1)>';
const person = makePerson({
  first_name: 'JB',
  how_helps: [
    { text: 'First responsibility' },
    { text: injected },
    { text: 'Last responsibility' },
  ],
});
const doc = render(person);
assert.deepEqual(
  [...doc.querySelectorAll('h2')].map((node) => node.textContent),
  ['How JB helps', 'Meet JB', 'Contact SonShine Roofing'],
);
assert.deepEqual(
  [...doc.querySelectorAll('[aria-labelledby="person-helps-heading"] li')].map(
    (node) => node.textContent,
  ),
  ['First responsibility', injected, 'Last responsibility'],
);
assert.equal(doc.querySelectorAll('[onerror], script').length, 0);
assert.equal(doc.querySelectorAll('h1').length, 1);
assert.equal(doc.querySelector('h1').textContent, person.title);
assert.equal(doc.querySelectorAll('a[href="/about-sonshine-roofing#meet-our-team"]').length, 2);
const biography = doc.querySelector('[aria-labelledby="person-bio-heading"]');
assert.equal(biography.querySelector('.prose').innerHTML, person.contentHtml);
const contact = doc.querySelector('[aria-labelledby="person-contact-heading"]');
assert.equal(doc.querySelectorAll('aside').length, 1);
assert.equal(contact.querySelectorAll('a[href="/contact-us#book-an-appointment"]').length, 1);
assert.ok(
  biography.compareDocumentPosition(contact) & 4,
  'Contact follows the biography in reading order',
);
assert.deepEqual(
  [...doc.querySelectorAll('nav a')].map((a) => a.getAttribute('href')),
  ['/person/nathan-borntreger', '/person/josh'],
);
const [previous, next] = [...doc.querySelectorAll('nav a > div')];
assert.equal(previous.firstElementChild.querySelector('img').getAttribute('alt'), '');
assert.equal(next.lastElementChild.querySelector('img').getAttribute('alt'), '');
const first = render(nav[0]);
assert.deepEqual(
  [...first.querySelectorAll('nav a')].map((a) => a.getAttribute('href')),
  ['/person/bob'],
);
const last = render(nav[2]);
assert.deepEqual(
  [...last.querySelectorAll('nav a')].map((a) => a.getAttribute('href')),
  ['/person/bob'],
);
assert.equal(render(person, [person]).querySelector('nav'), null);
assert.equal(render(person, []).querySelector('nav'), null);
const noDetails = render(
  makePerson({ how_helps: [{ text: '  ' }], profile_image: null }),
  nav.map((item) => ({ ...item, featuredImage: null })),
);
assert.deepEqual(
  [...noDetails.querySelectorAll('h2')].map((node) => node.textContent),
  ['Meet Fixture bob', 'Contact SonShine Roofing'],
);
assert.equal(noDetails.querySelectorAll('img').length, 0);

fixture.persons[0].first_name = 'Nathan';
fixture.persons[0].how_helps = [{ text: 'Preserved in the sealed snapshot' }];
fixture.persons[1].status = 'draft';
const env = {
  DIRECTUS_URL: config.url,
  DIRECTUS_TOKEN: config.token,
  DIRECTUS_CLIENT_SLUG: config.clientSlug,
};
await assert.rejects(fetchEditorialSnapshot(env, editorialFetcher(fixture)), /publication scope/);
fixture.persons = fixture.persons.filter((item) => item.status === 'published');
const capture = await fetchEditorialSnapshot(env, editorialFetcher(fixture));
assert.equal(
  capture.editorial.persons.some((item) => item.slug === 'bob'),
  false,
);
assert.equal(capture.editorial.persons[0].firstName, 'Nathan');
assert.deepEqual(capture.editorial.persons[0].howHelps, [
  { text: 'Preserved in the sealed snapshot' },
]);
console.log(
  'PASS: person repeater parsing, escaping, first names, images, navigation edges, and published snapshot behavior.',
);

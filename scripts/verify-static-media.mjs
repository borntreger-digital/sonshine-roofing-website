import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import { fetchStaticMediaSnapshot, mapStaticImage } from '../lib/content/directus-static-media.mjs';
import { STATIC_IMAGE_FILES, STATIC_IMAGE_FOLDER } from '../lib/content/static-image-files.mjs';
import { verifyVideoSchemaHtml } from './lib/video-schema.mjs';
const require = createRequire(import.meta.url), root = resolve(import.meta.dirname, '..');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const fixture = { url: 'https://images.test/original', description: 'Reviewed image description', type: 'image/webp', width: 400, height: 200, focalPoint: { x: 100, y: 150 } };
const mocks = {
  'next/image': (props) => React.createElement('img', Object.fromEntries(Object.entries(props).filter(([key]) => !['fill', 'priority'].includes(key)))),
  '@/lib/content/static-media': { staticImage: () => fixture },
  '@/lib/content/youtube': new Proxy({}, { get() { throw new Error('Runtime metadata fallback is forbidden for snapshot videos'); } }),
};
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const loaded = { exports: {} }; cache.set(path, loaded);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const localRequire = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? resolve(root, id.slice(2)) : resolve(dirname(path), id);
      const target = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
      if (!target) throw new Error(`Missing test import ${id}`);
      return load(target);
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', source)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
const { DirectusImage } = load(resolve(root, 'components/media/DirectusImage.tsx'));
const { imagePosition, imageBackground } = load(resolve(root, 'lib/content/public-image.ts'));
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
test('focal precedence and complete-image behavior', () => {
  assert.equal(imagePosition(fixture), '25% 75%');
  assert.equal(imagePosition(fixture, 'left top'), 'left top');
  assert.equal(imagePosition({ ...fixture, focalPoint: null }), '50% 50%');
  assert.equal(imageBackground({ ...fixture, focalPoint: null }).backgroundPosition, '50% 0%');
  assert.match(render(DirectusImage, { media: fixture, crop: true, fill: true }), /object-position:25% 75%/);
  assert.match(render(DirectusImage, { media: fixture, crop: true, position: '10% 20%' }), /object-position:10% 20%/);
  assert.doesNotMatch(render(DirectusImage, { media: fixture }), /object-position/);
});
test('description defaults, decorative empty alt and functional overrides', () => {
  assert.match(render(DirectusImage, { media: fixture }), /alt="Reviewed image description"/);
  assert.match(render(DirectusImage, { media: fixture, decorative: true, alt: 'Ignored' }), /alt=""/);
  assert.match(render(DirectusImage, { media: fixture, alt: 'Open roof photo' }), /alt="Open roof photo"/);
  assert.match(render(DirectusImage, { media: fixture }), /width="400" height="200"/);
});
const config = { url: 'https://cms.test', clientSlug: 'sonshine-roofing' };
const row = { id: 'file', folder: STATIC_IMAGE_FOLDER, type: 'image/png', description: 'Approved description', width: 400, height: 200, focal_point_x: 100, focal_point_y: 150 };
test('build normalization rejects invalid metadata and strips private fields', () => {
  for (const patch of [{ folder: 'foreign' }, { description: '' }, { type: 'video/mp4' }, { width: 0 }, { focal_point_x: 400 }, { focal_point_y: -1 }]) assert.throws(() => mapStaticImage({ ...row, ...patch }, config));
  const result = mapStaticImage({ ...row, uploaded_by: 'private', metadata: { internal: true } }, config);
  assert.deepEqual(Object.keys(result).sort(), ['url', 'description', 'type', 'width', 'height', 'focalPoint'].sort());
});
test('build batches exactly the allowlisted images and rejects incomplete results', async () => {
  const ids = Object.values(STATIC_IMAGE_FILES), requests = [];
  const env = { DIRECTUS_URL: 'https://cms.test', DIRECTUS_TOKEN: 'synthetic', DIRECTUS_CLIENT_SLUG: 'sonshine-roofing' };
  const fetcher = async (url, options) => {
    requests.push(url); assert.equal(options.cache, 'no-store'); assert.equal(options.headers.Authorization, 'Bearer synthetic');
    const filter = JSON.parse(url.searchParams.get('filter')); assert.equal(filter.folder._eq, STATIC_IMAGE_FOLDER);
    assert.ok(filter.id._in.every(id => ids.includes(id)));
    return { ok: true, json: async () => ({ data: filter.id._in.map(id => ({ ...row, id })) }) };
  };
  const snapshot = await fetchStaticMediaSnapshot(env, fetcher);
  assert.equal(Object.keys(snapshot.images).length, ids.length); assert.equal(requests.length, Math.ceil(ids.length / 50));
  await assert.rejects(fetchStaticMediaSnapshot(env, async () => ({ ok: true, json: async () => ({ data: [] }) })), /incomplete/);
});
test('snapshot video renders its verified upload date without a runtime lookup', () => {
  const { SnapshotVideoWithSchema } = load(resolve(root, 'components/utils/SnapshotVideoWithSchema.tsx'));
  const video = { youtubeId: 'abcdefghijk', title: 'CMS title', excerpt: 'CMS description', thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg', uploadDate: '2019-04-01T08:00:00-04:00' };
  const html = render(SnapshotVideoWithSchema, { video, canonicalUrl: '/about-sonshine-roofing', schemaId: 'test-video' });
  assert.match(html, /<iframe[^>]*src="https:\/\/www.youtube-nocookie.com\/embed\/abcdefghijk\?/);
  assert.match(html, /autoplay=0/); assert.match(html, /tabindex="-1"/); assert.match(html, /Play CMS title/);
  assert.match(html, /"name":"CMS title"/); assert.match(html, /"description":"CMS description"/);
  assert.match(html, /"embedUrl":"https:\/\/www.youtube-nocookie.com\/embed\/abcdefghijk"/);
  assert.doesNotMatch(html, /"contentUrl"/);
  assert.equal(verifyVideoSchemaHtml(html, '/about-sonshine-roofing', [video]), 1);
  for (const uploadDate of [null, 'invalid']) {
    const broken = render(SnapshotVideoWithSchema, { video: { ...video, uploadDate }, canonicalUrl: '/', schemaId: 'test-video' });
    assert.throws(() => verifyVideoSchemaHtml(broken, '/', [video]), /uploadDate/u,
      'the production artifact gate must reject the original missing-date rendering');
  }
});
test('legacy truck player retains click/viewport initial markup', () => {
  const Player = load(resolve(root, 'components/utils/LazyYoutubeEmbed.tsx')).default;
  assert.doesNotMatch(render(Player, { videoId: 'abcdefghijk', title: 'Truck' }), /<iframe/);
});

import assert from 'node:assert/strict';
import { verifyVideoSchemaHtml, expectedVideoSchemaPages } from './lib/video-schema.mjs';

const video = { '@type': 'VideoObject', name: 'Synthetic roof video', thumbnailUrl: ['https://images.test/roof.jpg'],
  embedUrl: 'https://www.youtube-nocookie.com/embed/abcdefghijk', uploadDate: '2019-04-01T12:00:00.000Z' };
const expected = { youtubeId: 'abcdefghijk', uploadDate: '2019-04-01T08:00:00-04:00' };
const html = value => `<html><script type="application/ld+json">${JSON.stringify(value)}</script></html>`;
const graph = value => ({ '@graph': [{ '@type': 'Service', subjectOf: [value] }, video] });
assert.equal(verifyVideoSchemaHtml(html(graph(video)), '/project/fixture', [expected]), 2);
for (const uploadDate of [undefined, null, '', 'invalid', '123', '2019-04-01', '2019-04-01T12:00:00']) {
  assert.throws(() => verifyVideoSchemaHtml(html(graph({ ...video, uploadDate })), '/project/fixture'), /uploadDate/u,
    'a valid direct VideoObject cannot hide a broken nested object');
}
for (const patch of [{ name: ' ' }, { thumbnailUrl: [] }]) assert.throws(() => verifyVideoSchemaHtml(html({ ...video, ...patch }), '/'), /requires/u);
assert.throws(() => verifyVideoSchemaHtml('<html></html>', '/', [expected]), /missing expected VideoObject/u);
assert.throws(() => verifyVideoSchemaHtml(html({ ...video, uploadDate: '2020-02-01T12:00:00Z' }), '/', [expected]), /captured YouTube date/u,
  'website chronology cannot replace the actual video publication date');
assert.throws(() => verifyVideoSchemaHtml('<script type="application/ld+json">{</script>', '/'), /invalid JSON-LD/u);
assert.equal(verifyVideoSchemaHtml('<script>const ignored = {"@type":"VideoObject"}</script>', '/other'), 0);
const home = { ...expected, id: 'home', slug: 'sonshine-roofing-best-of-the-best-2023' };
const about = { ...expected, id: 'about', slug: 'sonshine-roofing-introduction' };
const pages = expectedVideoSchemaPages({ videos: [home, about], projects: [{ slug: 'linked', videoId: home.id }, { slug: 'no-video' }] });
assert.deepEqual([...pages.keys()], ['/', '/about-sonshine-roofing', '/project/linked']);
assert.throws(() => expectedVideoSchemaPages({ videos: [], projects: [] }), /required page video/u);
console.log('Verified direct and nested video schema requirements, date provenance, and required placement coverage.');

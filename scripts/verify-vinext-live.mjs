import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

// Live-domain acceptance after the authorized DNS cutover. No valid lead or
// QuickQuote submission is sent; form probes must be rejected before delivery.
const config = JSON.parse(readFileSync('.cloudflare/output/v0/workers/default/worker.config.json', 'utf8'));
const origin = 'https://sonshineroofing.com';
assert.equal(config.name, 'sonshine-roofing-website');
assert.equal(config.env.NEXT_PUBLIC_ENV?.value, 'production');
assert.ok(!Object.keys(config.env).some(key => key.includes('PREVIEW')));
const get = (path, init = {}) => fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(30000), ...init });
const homepage = await get('/');
assert.equal(homepage.status, 200);
assert.equal(homepage.headers.get('x-sonshine-preview'), null);
assert.doesNotMatch(homepage.headers.get('x-robots-tag') ?? '', /noindex/);
const www = await fetch('https://www.sonshineroofing.com/roof-repair?cutover-check=1', { redirect: 'manual' });
assert.equal(www.status, 308);
assert.equal(www.headers.get('location'), 'https://sonshineroofing.com/roof-repair?cutover-check=1');
for (const host of ['sonshineroofing.com', 'www.sonshineroofing.com']) {
  for (const path of ['/', '/roof-repair?cutover-check=1&value=a%2Fb', '/api/lead']) {
    const response = await fetch(`http://${host}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 308, `HTTPS upgrade: ${host}${path}`);
    assert.equal(response.headers.get('location'), `https://sonshineroofing.com${path}`);
    await response.arrayBuffer();
  }
}
const html = await homepage.text();
assert.doesNotMatch(html, /website forms go to the n8n sandbox|Preview for testing/);
assert.match(html, /rel="canonical" href="https:\/\/sonshineroofing.com/);
for (const directive of ['script-src', 'script-src-elem', 'connect-src']) {
  const part = homepage.headers.get('content-security-policy').split(';').find(value => value.trim().startsWith(directive + ' '));
  assert.ok(part?.includes('https://analytics.ahrefs.com'), directive);
}
const robots = await (await get('/robots.txt')).text();
assert.match(robots, /User-agent: \*\s+Allow: \//i);
assert.match(robots, /Sitemap: https:\/\/sonshineroofing.com\/sitemap_index/);
for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
  if (/\bname=["'](?:robots|googlebot)["']/i.test(tag)) assert.doesNotMatch(tag, /\bnoindex\b/i);
}

const prerender = JSON.parse(readFileSync('dist/server/vinext-prerender.json', 'utf8'));
const routes = prerender.routes.filter(item => item.status === 'rendered');
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < routes.length) {
    const route = routes[next++];
    const path = route.path ?? route.route;
    const response = await get(path);
    assert.equal(response.status, route.responseStatus ?? 200, path);
    await response.arrayBuffer();
  }
}));
for (const path of ['/project/not-a-real-project', '/.generated/editorial.json', '/_vinext/static-cache/index.json']) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  await response.arrayBuffer();
}
const gone = await get('/parrish-roofing-contractor');
assert.equal(gone.status, 410);
await gone.arrayBuffer();
for (const kind of ['', 'blog', 'image', 'location', 'person', 'project', 'roofing-glossary', 'special-offer', 'static', 'video']) {
  const response = await get('/sitemap_index' + (kind ? '/' + kind : ''));
  assert.equal(response.status, 200, 'Production sitemap ' + kind);
  const xml = await response.text();
  assert.match(xml, /<(?:urlset|sitemapindex)\b/);
  assert.doesNotMatch(xml, /workers\.dev/);
}

const image = html.match(/src="([^" ]*\/_next\/image\?[^" ]+)"/)?.[1]?.replaceAll('&amp;', '&');
assert.ok(image, 'Optimized homepage image');
const imageUrl = new URL(image, origin);
imageUrl.searchParams.set('w', '384');
const imageResults = [];
for (const format of ['webp', 'avif', 'jpeg']) {
  const response = await get(imageUrl.pathname + imageUrl.search, { headers: { accept: 'image/' + format } });
  assert.equal(response.status, 200, format);
  assert.equal(response.headers.get('content-type'), 'image/' + format);
  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, 384);
  assert.equal(metadata.format, format === 'avif' ? 'heif' : format);
  let cache;
  for (let attempt = 0; attempt < 5; attempt++) {
    const repeated = await get(imageUrl.pathname + imageUrl.search, { headers: { accept: 'image/' + format } });
    assert.equal(repeated.status, 200);
    cache = repeated.headers.get('x-sonshine-image-cache');
    await repeated.arrayBuffer();
    if (cache === 'HIT') break;
  }
  assert.equal(cache, 'HIT', format + ' edge image cache');
  imageResults.push({ format, width: metadata.width, bytes: bytes.length, cache });
}

const badOrigin = await get('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://untrusted.example' }, body: '{}' });
assert.equal(badOrigin.status, 403);
const invalidForm = await get('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: '{}' });
assert.equal(invalidForm.status, 400);
const getLead = await get('/api/lead');
assert.equal(getLead.status, 405, 'Production hostname reaches the native handler');
console.log(JSON.stringify({ origin, routes: routes.length, sitemaps: 10, images: imageResults,
  productionMode: true, ahrefsPolicy: true, indexable: true, canonicalRedirect: true,
  invalidOriginRejected: true, invalidFormRejected: true,
  productionLeadSubmitted: false, quickQuoteSubmitted: false }, null, 2));

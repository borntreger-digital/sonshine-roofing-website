import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

// Read-only hosted acceptance for the separate production Worker. No valid lead
// or QuickQuote submission is sent; this temporary hostname blocks lead ingress.
const config = JSON.parse(readFileSync('.cloudflare/output/v0/workers/default/worker.config.json', 'utf8'));
const origin = 'https://sonshine-roofing-website.borntregerdigital.workers.dev';
assert.equal(config.name, 'sonshine-roofing-website');
assert.equal(config.env.NEXT_PUBLIC_ENV?.value, 'production');
assert.ok(!Object.keys(config.env).some(key => key.includes('PREVIEW')));
const get = (path, init = {}) => fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(30000), ...init });
const homepage = await get('/');
assert.equal(homepage.status, 200);
assert.equal(homepage.headers.get('x-sonshine-preview'), null);
assert.match(homepage.headers.get('x-robots-tag'), /noindex/);
const html = await homepage.text();
assert.doesNotMatch(html, /website forms go to the n8n sandbox|Preview for testing/);
assert.match(html, /rel="canonical" href="https:\/\/sonshineroofing.com/);
for (const directive of ['script-src', 'script-src-elem', 'connect-src']) {
  const part = homepage.headers.get('content-security-policy').split(';').find(value => value.trim().startsWith(directive + ' '));
  assert.ok(part?.includes('https://analytics.ahrefs.com'), directive);
}
assert.match(await (await get('/robots.txt')).text(), /Disallow: \//);

// A trailing DNS dot resolves to the same Cloudflare Worker and must retain
// the temporary-host restrictions. These are read-only GET checks.
for (const path of ['/', '/robots.txt', '/api/lead']) {
  const response = await fetch(origin + '.' + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, path === '/api/lead' ? 421 : 200, 'Trailing-dot temporary host: ' + path);
  assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
  const body = await response.text();
  if (path === '/robots.txt') assert.match(body, /Disallow: \//);
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
    assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/, path);
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

for (const path of ['/api/lead', '/api/lead/', '/api/%6cead', '/api/lead%2f']) {
  const response = await get(path, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://sonshineroofing.com' }, body: '{}' });
  assert.ok(response.status === 421 || (path.includes('%') && response.status === 404), 'Temporary hostname rejects leads even with a production Origin header');
  await response.arrayBuffer();
}
console.log(JSON.stringify({ origin, routes: routes.length, sitemaps: 10, images: imageResults,
  productionMode: true, ahrefsPolicy: true, temporaryHostNoindex: true, temporaryHostLeadIngress: 'blocked',
  productionLeadSubmitted: false, quickQuoteSubmitted: false }, null, 2));

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

// Only the deliberately isolated Worker may receive these synthetic requests.
const config = JSON.parse(readFileSync('.cloudflare/output/v0/workers/default/worker.config.json', 'utf8'));
const origin = config.env.SONSHINE_PREVIEW_ORIGIN?.value;
assert.equal(config.name, 'sonshine-roofing-vinext-proof');
assert.equal(origin, 'https://sonshine-roofing-vinext-proof.borntregerdigital.workers.dev');
const integrations = config.env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS?.value === '1';
if (integrations) assert.equal(config.env.SONSHINE_PREVIEW_DELIVERY?.value, 'sandbox');
else {
  assert.equal(config.env.SONSHINE_PREVIEW_DISCARD_LEADS?.value, '1');
  assert.ok(!config.env.N8N_WEBHOOK_URL && !config.env.N8N_WEBHOOK_SECRET);
}
const get = (path, init = {}) => fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(30000), ...init });
const homepage = await get('/');
assert.equal(homepage.status, 200);
assert.equal(homepage.headers.get('x-sonshine-preview'), 'isolated');
assert.match(homepage.headers.get('x-robots-tag'), /noindex/);
const html = await homepage.text();
assert.match(html, integrations ? /website forms go to the n8n sandbox/ : /Preview for testing/);
assert.match(await (await get('/robots.txt')).text(), /Disallow: \//);

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
for (const path of ['/sitemap_index', '/sitemap_index/blog', '/project/not-a-real-project', '/.generated/editorial.json', '/_vinext/static-cache/index.json']) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  await response.arrayBuffer();
}
const gone = await get('/parrish-roofing-contractor');
assert.equal(gone.status, 410);
await gone.arrayBuffer();
const quote = await get('/instant-quote');
if (integrations) assert.doesNotMatch(await quote.text(), /QuickQuote is disabled in this preview/);
else assert.match(await quote.text(), /QuickQuote is disabled in this preview/);

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

const payload = {
  version: 'v2', formType: 'contact-lead', sri_lead_id: 'sri_synthetic-hosted-preview',
  submittedAt: new Date().toISOString(), source: { page: '/contact-us', utm_source: 'synthetic-preview-check' },
  contact: { firstName: 'Synthetic', lastName: 'Preview', email: 'synthetic@example.com', phone: '9415550100' },
  smsConsent: { projectSms: 'no', marketingSms: 'no' }, details: {},
  antiSpam: { cfToken: 'XXXX.DUMMY.TOKEN.XXXX' },
};
const send = (body, requestOrigin = origin) => get('/api/lead', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: requestOrigin }, body: JSON.stringify(body),
});
assert.equal((await send(payload, 'https://untrusted.example')).status, 403);
assert.equal((await send({})).status, 400);
assert.equal((await send({ ...payload, smsConsent: { projectSms: '', marketingSms: 'no' } })).status, 400);
const submitted = await send(payload);
assert.equal(submitted.status, integrations ? 400 : 200, integrations ? 'Real Turnstile rejects dummy token' : 'Test-key validation and discard');
if (!integrations) assert.deepEqual(await submitted.json(), { ok: true });
console.log(JSON.stringify({ origin, routes: routes.length, images: imageResults, noindex: true, quickQuoteDisabled: !integrations, syntheticSubmission: integrations ? 'dummy token rejected; real browser acceptance checked separately' : 'validated and discarded' }, null, 2));

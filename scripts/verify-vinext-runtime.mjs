import assert from 'node:assert/strict';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { globSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { verifyVinextArtifact } from './verify-vinext-artifact.mjs';

const { result, output, config, prerender, snapshots } = verifyVinextArtifact();
const preview = config.env.NEXT_PUBLIC_ISOLATED_PREVIEW?.value === '1';
const integrations = preview && config.env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS?.value === '1';
const origin = preview ? config.env.SONSHINE_PREVIEW_ORIGIN.value : 'https://sonshineroofing.com';
const scratch = await mkdtemp(join(tmpdir(), 'sonshine-workers-runtime-'));
const received = [];
let captchaMode = 'pass', rejectDelivery = false;
let mf;
let imageFetches = 0;
const imageFixture = readFileSync('public/og-default.png');
const imageOrigin = new URL(snapshots['editorial.json'].assetOrigin).origin;
try {
  // Only the distributable artifact: no source tree, CMS credentials or files.
  await cp(output, scratch, { recursive: true });
  const bundle = join(scratch, 'bundle');
  const modules = ['index.js', ...globSync('**/*.js', { cwd: bundle }).filter(path => path !== 'index.js')];
  const bindings = Object.fromEntries(Object.entries(config.env).filter(([, value]) => value.type === 'text').map(([key, value]) => [key, value.value]));
  Object.assign(bindings, {
    ALLOWED_ORIGIN: origin,
    N8N_WEBHOOK_URL: integrations ? 'https://n8n.borntregerdigital.com/webhook/sonshine-workers-preview' : 'https://lead-receiver.example.test', N8N_WEBHOOK_SECRET: 'synthetic-receiver-only',
    TURNSTILE_SECRET_KEY: 'synthetic-turnstile-only', REVALIDATE_SECRET: 'synthetic-revalidate-only',
    SONSHINE_PREVIEW_DISCARD_LEADS: '1',
  });
  const runtimeOptions = {
    name: config.name,
    modulesRoot: bundle,
    modules: modules.map(path => ({ type: 'ESModule', path: join(bundle, path) })),
    compatibilityDate: config.compatibilityDate,
    compatibilityFlags: config.compatibilityFlags,
    bindings,
    images: { binding: 'IMAGES' },
    assets: {
      directory: join(scratch, 'assets'), binding: 'ASSETS',
      routerConfig: { has_user_worker: true },
      run_worker_first: config.assets.runWorkerFirst,
      assetConfig: { html_handling: 'none', not_found_handling: 'none' },
    },
    outboundService: async request => {
      const url = new URL(request.url);
      if (url.origin === imageOrigin && url.pathname === '/assets/vinext-synthetic-image') {
        assert.equal(request.headers.get('cookie'), null);
        assert.equal(request.headers.get('authorization'), null);
        imageFetches++;
        return new Response(imageFixture, { headers: { 'content-type': 'image/png' } });
      }
      if (url.origin === imageOrigin && url.pathname === '/assets/vinext-redirect') {
        return new Response(null, { status: 302, headers: { location: 'https://untrusted.example/private' } });
      }
      if (url.origin === imageOrigin && url.pathname === '/assets/vinext-non-image') {
        return new Response('<html>not an image</html>', { headers: { 'content-type': 'text/html' } });
      }
      if (url.origin === imageOrigin && url.pathname === '/assets/vinext-large-image') {
        return new Response('too large', { headers: { 'content-type': 'image/png', 'content-length': String(21 * 1024 * 1024) } });
      }
      if (url.hostname === 'challenges.cloudflare.com' && url.pathname === '/turnstile/v0/siteverify') {
        return Response.json(captchaMode === 'pass' ? { success: true } : { success: false, 'error-codes': [captchaMode === 'spent' ? 'timeout-or-duplicate' : 'invalid-input-response'] });
      }
      if (url.href === new URL(bindings.N8N_WEBHOOK_URL).href) {
        received.push({ secret: request.headers.get('x-ss-secret'), payload: await request.json() });
        return Response.json({ ok: !rejectDelivery }, { status: rejectDelivery ? 503 : 200 });
      }
      throw new Error(`Unexpected runtime outbound request: ${url.hostname}`);
    },
  };
  mf = new Miniflare(convertV4MiniflareOptions(runtimeOptions));
  const get = (path, init) => mf.dispatchFetch(`${origin}${path}`, { redirect: 'manual', ...init });
  const policyResponse = await get('/privacy-policy');
  const parsePolicy = value => new Map((value ?? '').split(';').map(part => part.trim()).filter(Boolean)
    .map(part => { const [directive, ...sources] = part.split(/\s+/); return [directive, sources]; }));
  const capturedPolicy = parsePolicy(snapshots['editorial.json'].buildSettings.contentSecurityPolicy);
  const servedPolicy = parsePolicy(policyResponse.headers.get('content-security-policy'));
  for (const [directive, sources] of capturedPolicy) {
    const expected = (!preview || integrations) && ['script-src', 'script-src-elem', 'connect-src'].includes(directive)
      ? (sources.includes('https://analytics.ahrefs.com') ? sources : [...sources, 'https://analytics.ahrefs.com']) : sources;
    assert.deepEqual(servedPolicy.get(directive), expected, `Workers analytics CSP: ${directive}`);
  }
  assert.equal(servedPolicy.size, capturedPolicy.size, 'No unrelated CSP directives added');
  await policyResponse.arrayBuffer();
  for (const route of prerender.routes.filter(item => item.status === 'rendered')) {
    const path = route.path ?? route.route;
    const response = await get(path);
    assert.equal(response.status, route.responseStatus ?? 200, path);
    await response.arrayBuffer();
  }
  for (const kind of ['', 'blog', 'image', 'location', 'person', 'project', 'roofing-glossary', 'special-offer', 'static', 'video']) {
    const path = '/sitemap_index' + (kind ? '/' + kind : '');
    const response = await get(path);
    assert.equal(response.status, preview ? 404 : 200, path);
    if (preview) await response.arrayBuffer();
    else assert.match(await response.text(), /<(?:urlset|sitemapindex)\b/);
  }
  for (const [kind, total] of [['blog', snapshots['editorial.json'].posts.length], ['project', snapshots['projects.json'].projects.length], ['video', snapshots['projects.json'].videos.length]]) {
    const response = await get('/api/resources/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ first: 2 }) });
    assert.equal(response.status, 200, kind);
    const body = await response.json();
    assert.equal(body.total, total, kind);
    assert.equal(body.items.length, Math.min(2, total));
  }
  for (const path of ['/project/not-a-real-project', '/locations/not-a-real-location', '/roofing-glossary/not-a-real-term', '/.generated/editorial.json', '/_vinext/static-cache/index.json']) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    await response.arrayBuffer();
  }
  assert.equal((await get('/parrish-roofing-contractor')).status, 410);
  const canonical = await mf.dispatchFetch('https://www.sonshineroofing.com/roof-repair?test=1', { redirect: 'manual' });
  assert.equal(canonical.status, preview ? 421 : 308, 'Preview host restriction / canonical redirect');
  if (!preview) assert.equal(canonical.headers.get('location'), 'https://sonshineroofing.com/roof-repair?test=1');
  const homepage = await get('/');
  assert.ok(homepage.headers.get('content-security-policy'));
  const html = await homepage.text();
  if (preview) {
    assert.equal(homepage.headers.get('x-sonshine-preview'), 'isolated');
    assert.match(homepage.headers.get('x-robots-tag'), /noindex/);
    assert.match(html, integrations ? /website forms go to the n8n sandbox/ : /Preview for testing/);
    assert.match(await (await get('/robots.txt')).text(), /Disallow: \//);
    const quoteHtml = await (await get('/instant-quote')).text();
    if (integrations) assert.doesNotMatch(quoteHtml, /QuickQuote is disabled in this preview/);
    else assert.match(quoteHtml, /QuickQuote is disabled in this preview/);
  }
  if (!preview) {
    assert.equal(homepage.headers.get('x-sonshine-preview'), null);
    assert.doesNotMatch(homepage.headers.get('x-robots-tag') ?? '', /noindex/);
    assert.doesNotMatch(html, /website forms go to the n8n sandbox|Preview for testing/);
    const robots = await (await get('/robots.txt')).text();
    assert.match(robots, /^Allow:\s*\/\s*$/im, 'Production root crawling is allowed');
    assert.doesNotMatch(robots, /^Disallow:\s*\/\s*$/im, 'Production must not disallow the entire site');
    // Synthetic site settings use their own canonical URL; retain the strict
    // production origin assertion for every real release artifact.
    const sitemapOrigin = process.env.VINEXT_FIXTURE_REVISION
      ? snapshots['locations.json'].siteShell.settings.siteUrl : origin;
    assert.ok(robots.split('\n').some(line => line.trim() === `Sitemap: ${sitemapOrigin}/sitemap_index`));
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      if (/\bname=["'](?:robots|googlebot)["']/i.test(tag)) {
        // The release fixture deliberately marks its home page noindex to test
        // CMS metadata. Real production artifacts must remain indexable.
        if (process.env.VINEXT_FIXTURE_REVISION) assert.match(tag, /\bnoindex\b/i, 'Synthetic homepage respects its CMS noindex flag');
        else assert.doesNotMatch(tag, /\bnoindex\b/i, 'Production homepage indexing meta');
      }
    }
    const temporaryOrigin = 'https://sonshine-roofing-website.borntregerdigital.workers.dev';
    const temporaryPage = await mf.dispatchFetch(temporaryOrigin + '/');
    assert.equal(temporaryPage.status, 200);
    assert.match(temporaryPage.headers.get('x-robots-tag'), /noindex/);
    await temporaryPage.arrayBuffer();
    assert.match(await (await mf.dispatchFetch(temporaryOrigin + '/robots.txt')).text(), /Disallow: \//);
    const dottedOrigin = temporaryOrigin + '.';
    for (const path of ['/', '/robots.txt', '/api/lead']) {
      const dotted = await mf.dispatchFetch(dottedOrigin + path);
      assert.equal(dotted.status, path === '/api/lead' ? 421 : 200, 'Trailing-dot temporary host: ' + path);
      assert.match(dotted.headers.get('x-robots-tag') ?? '', /noindex/, 'Trailing-dot temporary host must remain excluded');
      const body = await dotted.text();
      if (path === '/robots.txt') assert.match(body, /Disallow: \//);
    }
    const countBefore = received.length;
    for (const path of ['/api/lead', '/api/lead/', '/api/%6cead', '/api/lead%2f']) {
      const blocked = await mf.dispatchFetch(temporaryOrigin + path, { method: 'POST', headers: { origin }, body: '{}' });
      assert.ok(blocked.status === 421 || (path.includes('%') && blocked.status === 404), 'Temporary production URL must reject lead requests, including unrecognized encoded paths');
      await blocked.arrayBuffer();
    }
    assert.equal(received.length, countBefore);
  }
  const revision = process.env.VINEXT_FIXTURE_REVISION;
  if (revision) {
    const post = await get('/' + snapshots['editorial.json'].posts[0].slug);
    assert.ok((await post.text()).includes(`Deployment ${revision}`));
    assert.equal((await get('/new-after-build')).status, revision === 'B' ? 200 : 404);
    assert.equal((await get('/fixture-post-1')).status, revision === 'B' ? 404 : 200);
    const redirect = await get('/wp-content/uploads/fixture-relative.jpg?ver=1');
    assert.equal(redirect.status, 308);
    assert.equal(new URL(redirect.headers.get('location'), 'https://sonshineroofing.com').pathname, revision === 'B' ? '/blog' : '/');
  }
  assert.match(html, /srcSet="[^"]*\/_next\/image\?url=https%3A/);
  const sourceUrl = imageOrigin + '/assets/vinext-synthetic-image';
  const imagePath = '/_next/image?' + new URLSearchParams({ url: sourceUrl, w: '384', q: '75' });
  for (const format of ['webp', 'avif', 'jpeg']) {
    const response = await get(imagePath, { headers: { accept: 'image/' + format, cookie: 'synthetic=private', authorization: 'Bearer synthetic-browser-only' } });
    assert.equal(response.status, 200, format);
    assert.equal(response.headers.get('content-type'), 'image/' + format);
    const bytes = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 384, 'Actual resized image width');
    assert.equal(metadata.format, format === 'avif' ? 'heif' : format);
    const before = imageFetches;
    // Cache writes are registered with waitUntil. A repeat must eventually hit
    // without a new origin fetch, separately for each negotiated format.
    let repeated;
    for (let attempt = 0; attempt < 10; attempt++) {
      repeated = await get(imagePath, { headers: { accept: 'image/' + format } });
      await repeated.arrayBuffer();
      if (repeated.headers.get('x-sonshine-image-cache') === 'HIT') break;
    }
    assert.equal(repeated.headers.get('x-sonshine-image-cache'), 'HIT');
    assert.equal(imageFetches, before);
    const head = await get(imagePath, { method: 'HEAD', headers: { accept: 'image/' + format } });
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  }
  for (const query of [
    { url: 'https://untrusted.example/image.png', w: '384', q: '75' },
    { url: 'http://127.0.0.1/private', w: '384', q: '75' },
    { url: sourceUrl, w: '777', q: '75' },
    { url: sourceUrl, w: '384', q: '99' },
    ...['redirect', 'non-image', 'large-image'].map(kind => ({ url: imageOrigin + '/assets/vinext-' + kind, w: '384', q: '75' })),
  ]) {
    const response = await get('/_next/image?' + new URLSearchParams(query));
    assert.equal(response.status, 400, 'Reject invalid image source or transform');
    assert.equal(response.headers.get('x-sonshine-image-cache'), null);
  }
  const asset = html.match(/src="(\/_next\/static\/[^"?]+\.js)"/)?.[1];
  assert.ok(asset, 'Client script reference');
  assert.equal((await get(asset)).status, 200, 'Client script asset');
  let rsc = await get('/contact-us', { headers: { rsc: '1' } });
  // vinext canonicalizes its RSC cache-busting query before serving the payload.
  for (let attempt = 0; rsc.status === 307 && attempt < 3; attempt++) {
    const destination = new URL(rsc.headers.get('location'), origin);
    assert.equal(destination.origin, origin);
    await rsc.arrayBuffer();
    rsc = await get(destination.pathname + destination.search, { headers: { rsc: '1' } });
  }
  assert.equal(rsc.status, 200);
  assert.match(rsc.headers.get('content-type') ?? '', /text\/x-component/);
  await rsc.arrayBuffer();
  assert.equal((await get('/api/revalidate')).status, 401);

  const payload = {
    version: 'v2', formType: 'contact-lead', sri_lead_id: 'sri_synthetic-vinext',
    submittedAt: '2026-10-26T12:00:00Z', source: { page: '/contact-us', gclid: 'synthetic-click', utm_source: 'fixture', utm_campaign: 'vinext' },
    contact: { firstName: 'Synthetic', lastName: 'Fixture', email: 'synthetic@example.com', phone: '9415550100' },
    smsConsent: { projectSms: 'no', marketingSms: 'yes' },
    details: { projectType: 'roof-replacement' }, antiSpam: { cfToken: 'synthetic-token' },
  };
  const send = (body = payload, requestOrigin = origin) => get('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json', origin: requestOrigin }, body: JSON.stringify(body) });
  assert.equal((await send(payload, 'https://untrusted.example')).status, 403);
  assert.equal((await send({ ...payload, antiSpam: { ...payload.antiSpam, hp_field: 'robot' } })).status, 200);
  assert.equal((await send({ ...payload, smsConsent: { projectSms: '', marketingSms: 'no' } })).status, 400);
  assert.equal(received.length, 0);
  assert.equal((await send()).status, 200, 'Synthetic lead success');
  if (preview && !integrations) {
    assert.equal(received.length, 0, 'Preview discards the valid submission even when a receiver is configured');
  } else {
  assert.equal(received.at(-1).secret, 'synthetic-receiver-only');
  assert.equal(received.at(-1).payload.lead_source, 'google_ads');
  assert.equal(received.at(-1).payload.smsConsent.disclosureVersion, 'sms-consent-v1');
  assert.equal(received.at(-1).payload.smsConsent.projectSms, 'no');
  assert.equal(received.at(-1).payload.smsConsent.marketingSms, 'yes');
  rejectDelivery = true;
  assert.equal((await send()).status, 503);
  rejectDelivery = false;
  assert.equal((await send()).status, 200);
  assert.equal(received.at(-1).payload.sri_lead_id, payload.sri_lead_id);
  }
  const count = received.length;
  for (captchaMode of ['fail', 'spent']) assert.equal((await send()).status, 400);
  assert.equal(received.length, count);
  if (preview) {
    captchaMode = 'pass';
    const before = received.length;
    await mf.setOptions(convertV4MiniflareOptions({ ...runtimeOptions, bindings: { ...bindings, SONSHINE_PREVIEW_DISCARD_LEADS: '0', SONSHINE_PREVIEW_DELIVERY: 'off' } }));
    assert.equal((await send()).status, 503, 'Preview fails closed when discard mode is disabled');
    assert.equal(received.length, before, 'No fallback to the configured receiver');
    if (integrations) {
      await mf.setOptions(convertV4MiniflareOptions({ ...runtimeOptions, bindings: { ...bindings, N8N_WEBHOOK_URL: 'https://lead-receiver.example.test' } }));
      assert.equal((await send()).status, 503, 'Preview rejects any non-sandbox receiver');
      assert.equal(received.length, before);
    }
  }
  console.log(`Workers runtime passed ${result.prerendered} prerendered routes, 10 sitemap ${preview ? 'exclusions' : 'responses'}, resource APIs, redirects, 404/410, private-file isolation, assets, RSC, image resizing/formats/cache/source restrictions and synthetic lead ${preview && !integrations ? 'discard' : 'delivery'}/failure checks. No live providers were contacted.`);
} finally {
  await mf?.dispose();
  await rm(scratch, { recursive: true, force: true });
}

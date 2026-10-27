import assert from 'node:assert/strict';
import { readFileSync, globSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { verifyDeploymentSnapshot } from '../lib/content/deployment-snapshot.mjs';

export function verifyVinextArtifact(root = process.cwd()) {
  const { snapshots } = verifyDeploymentSnapshot(root);
  const output = resolve(root, '.cloudflare/output/v0/workers/default');
  const config = JSON.parse(readFileSync(resolve(output, 'worker.config.json'), 'utf8'));
  assert.ok(existsSync(resolve(output, 'bundle/index.js')), 'Worker entrypoint exists');
  assert.ok(!config.routes?.length, 'The feasibility config must not claim production routes');
  if (config.env.NEXT_PUBLIC_ISOLATED_PREVIEW?.value === '1') {
    assert.equal(config.name, 'sonshine-roofing-vinext-proof');
    assert.equal(config.env.NEXT_PUBLIC_ENV?.value, 'preview');
    if (config.env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS?.value === '1') {
      assert.ok(config.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.value?.startsWith('0x'));
      for (const key of ['TURNSTILE_SECRET_KEY', 'N8N_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET']) {
        assert.equal(config.env[key]?.type, 'secret');
        assert.equal(config.env[key]?.value, undefined);
      }
      assert.equal(config.env.SONSHINE_PREVIEW_DELIVERY?.value, 'sandbox');
      assert.equal(config.env.SONSHINE_PREVIEW_DISCARD_LEADS?.value, '0');
      assert.equal(config.env.NEXT_PUBLIC_ENABLE_GTM_PREVIEW?.value, 'true');
      assert.match(config.env.NEXT_PUBLIC_GTM_ID?.value ?? '', /^GTM-/);
      assert.match(config.env.NEXT_PUBLIC_META_PIXEL_ID?.value ?? '', /^\d+$/);
      assert.equal(config.env.NEXT_PUBLIC_PREVIEW_ORIGIN?.value, config.env.SONSHINE_PREVIEW_ORIGIN?.value);
    } else {
      assert.equal(config.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.value, '1x00000000000000000000AA');
      assert.equal(config.env.TURNSTILE_SECRET_KEY?.value, '1x0000000000000000000000000000000AA');
      assert.equal(config.env.SONSHINE_PREVIEW_DISCARD_LEADS?.value, '1');
      assert.ok(!config.env.N8N_WEBHOOK_URL && !config.env.N8N_WEBHOOK_SECRET, 'Preview must have no live lead credentials');
      assert.equal(config.env.NEXT_PUBLIC_ENABLE_GTM_PREVIEW?.value, 'false');
      assert.equal(config.env.NEXT_PUBLIC_GTM_ID?.value, '');
      assert.equal(config.env.NEXT_PUBLIC_META_PIXEL_ID?.value, '');
    }
  }
  if (config.env.NEXT_PUBLIC_ISOLATED_PREVIEW?.value !== '1') {
    assert.equal(config.name, 'sonshine-roofing-website');
    assert.equal(config.env.NEXT_PUBLIC_ENV?.value, 'production');
    for (const key of Object.keys(config.env)) {
      assert.ok(!key.includes('PREVIEW'), `Unexpected preview configuration in production: ${key}`);
    }
    for (const key of ['TURNSTILE_SECRET_KEY', 'N8N_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET', 'ALLOWED_ORIGIN']) {
      assert.equal(config.env[key]?.type, 'secret', key);
      assert.equal(config.env[key]?.value, undefined, key);
    }
  }
  const prerender = JSON.parse(readFileSync(resolve(root, 'dist/server/vinext-prerender.json'), 'utf8'));
  const rendered = prerender.routes.filter(route => route.status === 'rendered');
  const paths = new Set(rendered.map(route => route.path ?? route.route));
  const editorial = snapshots['editorial.json'];
  for (const [records, prefix] of [
    [editorial.posts, '/'], [editorial.persons, '/person/'],
    [editorial.glossary, '/roofing-glossary/'], [editorial.offers, '/special-offers/'],
    [snapshots['projects.json'].projects, '/project/'], [snapshots['locations.json'].pages, '/locations/'],
  ]) for (const record of records) assert.ok(paths.has(prefix + record.slug), `Missing prerender: ${prefix}${record.slug}`);
  for (const path of ['/', '/blog', '/project', '/video-library', '/contact-us', '/privacy-policy']) {
    assert.ok(paths.has(path), `Missing fixed prerender: ${path}`);
  }
  for (const route of prerender.routes) {
    assert.ok(route.status === 'rendered' || (route.status === 'skipped' && /^\/(?:api\/|sitemap_index(?:\/|$))/.test(route.route)), `Unexpected prerender result: ${route.route}`);
    assert.ok(route.revalidate === undefined || route.revalidate === false, `Unexpected ISR: ${route.route}`);
  }
  const cache = JSON.parse(readFileSync(resolve(output, 'assets/_vinext/static-cache/index.json'), 'utf8'));
  for (const entry of Object.values(cache)) {
    assert.ok(entry.cacheControl?.revalidate === undefined || entry.cacheControl.revalidate === false);
  }
  assert.ok(Object.values(cache).filter(entry => entry.kind === 'html').length >= rendered.filter(route => route.router === 'app').length);
  const publicFiles = globSync('**/*', { cwd: resolve(output, 'assets'), exclude: path => path.includes('/.git/') })
    .filter(path => /\.(?:js|json|map|html|rsc)$/.test(path));
  for (const path of publicFiles) {
    const text = readFileSync(resolve(output, 'assets', path), 'utf8');
    assert.ok(!text.includes('Missing packaged deployment file:'), `Private reader exposed in ${path}`);
    assert.ok(!text.includes('".generated/editorial.json":'), `Complete private snapshot exposed in ${path}`);
  }
  const modules = globSync('**/*.js', { cwd: resolve(output, 'bundle') });
  const gzipBytes = modules.reduce((total, path) => total + gzipSync(readFileSync(resolve(output, 'bundle', path))).length, 0);
  const result = { prerendered: rendered.length, cacheEntries: Object.keys(cache).length, workerModules: modules.length, summedModuleGzipBytes: gzipBytes };
  return { result, output, config, prerender, snapshots };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log('Verified Workers artifact:', verifyVinextArtifact().result);
}

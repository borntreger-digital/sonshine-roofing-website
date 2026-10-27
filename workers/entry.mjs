import app from 'vinext/server/fetch-handler';
import { negotiateImageFormat } from 'vinext/server/image-optimization';
import { optimizeRemoteImage } from './remote-images.mjs';
import { analyticsPolicy } from './analytics-policy.mjs';
export * from 'vinext/server/fetch-handler';

// Canonicalization must precede the immutable page cache. The evaluated vinext
// artifact did not apply next.config's host condition to cached page responses.
const applicationWorker = {
  ...app,
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.hostname === 'www.sonshineroofing.com') {
      url.hostname = 'sonshineroofing.com';
      return new Response(null, { status: 308, headers: { Location: url.href } });
    }
    if (['GET', 'HEAD'].includes(request.method) && url.pathname === '/_next/image') {
      const head = request.method === 'HEAD';
      const imageRequest = head ? new Request(request, { method: 'GET' }) : request;
      // Cache each negotiated format separately. Cache API ignores ordinary Vary
      // headers; keeping the format in this private key avoids cross-format hits.
      const keyUrl = new URL(url);
      keyUrl.searchParams.set('__format', negotiateImageFormat(request.headers.get('Accept')));
      keyUrl.searchParams.set('__release', process.env.__SONSHINE_RELEASE_ID);
      keyUrl.searchParams.sort();
      const key = new Request(keyUrl);
      const cache = caches.default;
      const hit = await cache.match(key);
      if (hit) {
        const response = new Response(hit.body, hit);
        response.headers.set('X-Sonshine-Image-Cache', 'HIT');
        response.headers.set('X-Vinext-Cache', 'HIT');
        response.headers.set('x-nextjs-cache', 'HIT');
        return head ? new Response(null, response) : response;
      }
      // Never cache rejected requests. Remote and local paths share vinext's
      // parameter validation; remote fetches additionally enforce the allowlist.
      const source = url.searchParams.get('url') ?? '';
      const original = /^https?:/.test(source)
        ? await optimizeRemoteImage(imageRequest, env)
        : await app.fetch(imageRequest, env, context);
      const response = new Response(original.body, original);
      if (response.ok && response.headers.get('Content-Type')?.startsWith('image/')) {
        response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        response.headers.set('X-Sonshine-Image-Cache', 'MISS');
        context.waitUntil(cache.put(key, response.clone()));
      }
      return head ? new Response(null, response) : response;
    }
    return app.fetch(request, env, context);
  },
};
// The production artifact is usable before DNS cutover, but its temporary
// workers.dev address must not become an indexed duplicate or a lead ingress.
// These hostname-specific protections do not affect the production domains.
const worker = {
  ...applicationWorker,
  async fetch(request, env, context) {
    if (process.env.NEXT_PUBLIC_ENV !== 'production' || process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === '1') {
      return applicationWorker.fetch(request, env, context);
    }
    const url = new URL(request.url);
    // DNS permits a terminal dot; Cloudflare serves that spelling too.
    const temporaryHost = url.hostname.replace(/\.$/, '').endsWith('.workers.dev');
    let original;
    if (temporaryHost && url.pathname.replace(/\/+$/, '') === '/api/lead') {
      original = new Response('Lead submissions require the production website hostname.', { status: 421 });
    } else if (temporaryHost && url.pathname === '/robots.txt') {
      original = new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } else {
      original = await applicationWorker.fetch(request, env, context);
    }
    const response = new Response(original.body, original);
    const policy = response.headers.get('Content-Security-Policy');
    if (policy) response.headers.set('Content-Security-Policy', analyticsPolicy(policy));
    if (temporaryHost) response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  },
};
const previewWorker = {
  ...worker,
  async fetch(request, env, context) {
    const preview = process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === '1';
    if (!preview) return worker.fetch(request, env, context);
    const url = new URL(request.url);
    let response;
    if (url.origin !== env.SONSHINE_PREVIEW_ORIGIN && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      response = new Response('Preview hostname only', { status: 421 });
    } else if (url.pathname === '/robots.txt') {
      response = new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } else {
      response = await worker.fetch(request, env, context);
    }
    response = new Response(response.body, response);
    if (process.env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS === '1' && url.origin === env.SONSHINE_PREVIEW_ORIGIN) {
      const policy = response.headers.get('Content-Security-Policy');
      if (policy) response.headers.set('Content-Security-Policy', analyticsPolicy(policy));
    }
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.headers.set('X-Sonshine-Preview', 'isolated');
    return response;
  },
};

export default previewWorker;

import { handleImageOptimization } from 'vinext/server/image-optimization';
import { validateRemoteUrl } from 'vinext/shims/image-props';
import createImageOptimizer from '@vinext/cloudflare/images/images-optimizer.runtime';

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

async function fetchPublicImage(source) {
  let url = new URL(source);
  for (let hop = 0; hop <= 3; hop++) {
    if (url.protocol !== 'https:' || url.username || url.password || !validateRemoteUrl(url.href).allowed) {
      return new Response(null, { status: 400 });
    }
    // Never forward browser cookies, authorization or request headers to a CMS.
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location || hop === 3) return new Response(null, { status: 400 });
      url = new URL(location, url);
      continue;
    }
    if (!response.ok || !response.body || Number(response.headers.get('content-length')) > MAX_SOURCE_BYTES) {
      await response.body?.cancel();
      return new Response(null, { status: 400 });
    }
    let bytes = 0;
    const body = response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > MAX_SOURCE_BYTES) throw new Error('Image source exceeds the Images binding limit');
        controller.enqueue(chunk);
      },
    }));
    return new Response(body, { headers: { 'Content-Type': response.headers.get('content-type') ?? '' } });
  }
  return new Response(null, { status: 400 });
}

export async function optimizeRemoteImage(request, env) {
  const url = new URL(request.url);
  const source = url.searchParams.get('url');
  if (!source || source.length > 3072 || !/^https:\/\//.test(source)) {
    return new Response('Invalid image source', { status: 400 });
  }
  // vinext's optimizer accepts only local source paths. Keep its strict transform
  // validation and response headers, and provide our bounded, allowlisted fetch.
  // Preserve duplicate URL parameters so vinext still rejects ambiguous input.
  if (url.searchParams.getAll('url').length !== 1) return new Response(null, { status: 400 });
  url.searchParams.set('url', '/__sonshine_remote_image');
  const optimizer = createImageOptimizer({ env });
  try {
    return await handleImageOptimization(new Request(url, request), {
      fetchAsset: () => fetchPublicImage(source),
      transformImage: (body, options) => optimizer.transformImage(body, options),
    }, undefined, { qualities: [75] });
  } catch {
    return new Response('Image source unavailable', { status: 502 });
  }
}

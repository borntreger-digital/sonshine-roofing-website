import { fetchBuildGet } from '../lib/content/build/fetch-build-get.mjs';
// Full, verified route ownership inventory. Explicit count and stable IDs make
// truncated pages and changing inventories fail the build instead of hiding routes.
export async function readRouteCollection({ collection, fields, directusUrl, directusToken, clientSlug, fetcher = fetch, pageSize = 500 }) {
  const rows = [], ids = new Set();
  let expected;
  for (let page = 1; page <= 10000; page++) {
    const url = new URL('/items/' + collection, directusUrl);
    url.searchParams.set('fields', [...new Set(['id', 'client.slug', 'status', ...fields])].join(','));
    url.searchParams.set('filter', JSON.stringify({ _and: [{ client: { slug: { _eq: clientSlug } } }, { status: { _eq: 'published' } }] }));
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'id');
    url.searchParams.set('meta', 'filter_count');
    const payload = await fetchBuildGet(url, {
      fetcher, headers: { Accept: 'application/json', Authorization: 'Bearer ' + directusToken },
      operation: 'route-validator:collection',
    }, async response => {
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new Error(`[route-manifest] Directus ${collection} request failed with HTTP ${response.status}.`);
      }
      return response.json();
    });
    if (!Array.isArray(payload.data) || payload.errors?.length) throw new Error(`[route-manifest] Directus ${collection} returned an invalid payload.`);
    const count = payload.meta?.filter_count;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('[route-manifest] Missing verified inventory count.');
    expected ??= count;
    if (count !== expected) throw new Error('[route-manifest] Route inventory changed during pagination.');
    for (const row of payload.data) {
      if (!row.id || ids.has(String(row.id))) throw new Error('[route-manifest] Duplicate or missing route identity.');
      if (row.client?.slug !== clientSlug || row.status !== 'published') throw new Error('[route-manifest] Route escaped published client scope.');
      ids.add(String(row.id)); rows.push(row);
    }
    if (rows.length === expected) return rows;
    if (!payload.data.length || rows.length > expected || payload.data.length < pageSize) throw new Error('[route-manifest] Route inventory truncated or inconsistent.');
  }
  throw new Error('[route-manifest] Pagination safety limit exceeded.');
}

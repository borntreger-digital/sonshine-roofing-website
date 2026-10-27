import { fetchBuildGet } from './build/fetch-build-get.mjs';
const text = (value) => typeof value === 'string' ? value.trim() : '';
const fail = (message) => { throw new Error(`[Directus roofing_projects] ${message}`); };

function httpUrl(value, label) {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return raw;
  } catch { /* Report the field, never its potentially sensitive value. */ }
  return fail(`${label} must be an absolute HTTP(S) URL.`);
}

function image(value, config, label, required = true) {
  if (!value && !required) return null;
  if (!value || typeof value !== 'object' || !text(value.id)) return fail(`${label} requires an expanded Directus image.`);
  if (!text(value.type).startsWith('image/') || !text(value.description)) return fail(`${label} requires an image MIME type and file description.`);
  return {
    url: new URL(`assets/${encodeURIComponent(value.id)}`, `${config.url}/`).href,
    altText: text(value.description),
    width: Number.isFinite(value.width) ? value.width : null,
    height: Number.isFinite(value.height) ? value.height : null,
  };
}

function term(value, config, label, required = true) {
  if (!value && !required) return [];
  if (!value || value.client?.slug !== config.clientSlug || value.status !== 'published' || !text(value.name) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(text(value.slug))) {
    return fail(`${label} must be a published, client-scoped managed-list selection.`);
  }
  return [{ name: text(value.name), slug: text(value.slug) }];
}

function date(value, label, required = false) {
  const raw = text(value);
  if (!raw && !required) return null;
  if (!raw || !Number.isFinite(Date.parse(raw))) return fail(`${label} requires a valid date.`);
  return raw;
}

export function mapDirectusProject(row, config) {
  if (row.client?.slug !== config.clientSlug || row.status !== 'published') return fail('A record escaped the published client scope.');
  if (!text(row.scope_key).startsWith(`${config.clientSlug}:`)) return fail('Project requires its database-maintained client scope key.');
  const slug = text(row.slug);
  if (!text(row.id) || !text(row.service_area?.id)) return fail('Project and primary service area require canonical identities.');
  let neighborhood = null;
  if (row.neighborhood !== null) {
    const value = row.neighborhood;
    if (!value || typeof value !== 'object' || !text(value.id) || value.client?.slug !== config.clientSlug || value.service_area !== row.service_area.id) return fail('Neighborhood must be expanded and match the project client and primary service area.');
    if (!['published', 'draft', 'archived'].includes(value.status)) return fail('Neighborhood publication state is missing or invalid.');
    if (value.status === 'published') {
      if (!text(value.name) || !text(value.slug)) return fail('Published neighborhood requires a name and slug.');
      neighborhood = { id: value.id, name: text(value.name), slug: text(value.slug) };
    }
  }
  const title = text(row.title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || !title || !text(row.description)) return fail('Published records require a URL-safe slug, title, and description.');
  const published = date(row.published_at, `${slug}: published_at`, true);
  const modified = date(row.modified_at || row.published_at, `${slug}: modified`);
  if (!Array.isArray(row.gallery)) return fail(`${slug}: gallery must be expanded completely.`);
  const sorts = new Set();
  const gallery = [...row.gallery].sort((a, b) => a.sort - b.sort).map((entry) => {
    if (!Number.isInteger(entry.sort) || sorts.has(entry.sort)) return fail(`${slug}: gallery needs distinct explicit sort values.`);
    sorts.add(entry.sort);
    return image(entry.directus_files_id, config, `${slug}: gallery ${entry.sort}`);
  });
  if (row.product_links != null && !Array.isArray(row.product_links)) return fail(`${slug}: product_links must be an ordered list.`);
  const productLinks = (row.product_links ?? []).map((entry) => {
    if (!text(entry.label)) return fail(`${slug}: product links require a label.`);
    return { productName: text(entry.label), productLink: httpUrl(entry.href, `${slug}: product link`) };
  });
  const platform = text(row.review_source).toLowerCase();
  const reviewPlatform = ({ 'google reviews': 'google', 'facebook reviews': 'facebook', 'yelp reviews': 'yelp', 'better business bureau': 'bbb' })[platform] || platform || 'google';
  if (text(row.client_testimonial) && !['google', 'facebook', 'yelp', 'bbb'].includes(reviewPlatform)) return fail(`${slug}: unrecognized testimonial source.`);
  const testimonial = text(row.client_testimonial) ? {
    customerReview: text(row.client_testimonial),
    customerName: text(row.client_testimonial_name) || undefined,
    reviewDate: date(row.client_testimonial_date, `${slug}: testimonial date`) || undefined,
    reviewUrl: httpUrl(row.review_url, `${slug}: review URL`) || undefined,
    reviewPlatform,
  } : null;
  const heroImage = image(row.featured_image, config, `${slug}: featured image`);
  const ogImage = image(row.og_image_override, config, `${slug}: social image`, false);
  if (row.focus_keywords != null && !Array.isArray(row.focus_keywords)) return fail(`${slug}: focus_keywords must be a list.`);
  const keywords = (row.focus_keywords ?? []).map(text);
  if (keywords.some(keyword => !keyword)) return fail(`${slug}: supplied focus keywords must be nonempty text.`);
  if ((keywords.length && !text(row.primary_focus_keyword)) || (text(row.primary_focus_keyword) && keywords[0] !== text(row.primary_focus_keyword))) return fail(`${slug}: primary keyword must lead focus_keywords.`);
  return {
    id: row.id, serviceAreaId: row.service_area.id, neighborhood,
    scopeKey: text(row.scope_key), slug, uri: `/project/${slug}/`, title,
    year: new Date(published).getFullYear(), date: published, modified,
    projectDescription: text(row.description), heroImage, projectImages: gallery,
    productLinks, customerTestimonial: testimonial,
    reviewSnippet: testimonial?.customerReview ?? null,
    reviewAuthorName: testimonial?.customerName ?? null,
    materialTypes: term(row.material_type, config, `${slug}: material`),
    roofColors: term(row.roof_color, config, `${slug}: roof color`, false),
    serviceAreas: term(row.service_area, config, `${slug}: service area`),
    noindex: row.noindex === true, focusKeywords: keywords,
    seo: {
      title: text(row.meta_title) || null,
      description: text(row.meta_description) || null,
      canonicalUrl: `/project/${slug}`,
      openGraph: {
        title: text(row.og_title) || null,
        description: text(row.og_description) || null,
        type: 'article',
        image: ogImage ? { url: ogImage.url, width: ogImage.width, height: ogImage.height } : null,
      },
    },
  };
}

const FILE_FIELDS = ['id', 'description', 'width', 'height', 'type'];
const TERM_FIELDS = ['id', 'name', 'slug', 'status', 'client.slug'];
const PROJECT_FIELDS = [
  'id', 'scope_key', 'client.slug', 'status', 'title', 'slug', 'description', 'published_at', 'modified_at',
  'product_links', 'client_testimonial', 'client_testimonial_name', 'client_testimonial_date', 'review_source', 'review_url',
  'noindex', 'meta_title', 'meta_description', 'primary_focus_keyword', 'focus_keywords', 'og_title', 'og_description', 'gallery.sort',
  ...['featured_image', 'og_image_override', 'gallery.directus_files_id'].flatMap((field) => FILE_FIELDS.map((name) => `${field}.${name}`)),
  ...['material_type', 'roof_color', 'service_area'].flatMap((field) => TERM_FIELDS.map((name) => `${field}.${name}`)),
  ...['id', 'name', 'slug', 'status', 'client.slug', 'service_area'].map(field => `neighborhood.${field}`),
];

export function directusBuildConfig(env = process.env) {
  const config = {
    url: text(env.DIRECTUS_URL).replace(/\/+$/u, ''),
    token: text(env.DIRECTUS_TOKEN || env.DIRECTUS_STATIC_TOKEN),
    clientSlug: text(env.DIRECTUS_CLIENT_SLUG),
  };
  if (!config.url || !config.token || !config.clientSlug) return fail('Build requires DIRECTUS_URL, DIRECTUS_TOKEN, and DIRECTUS_CLIENT_SLUG.');
  httpUrl(config.url, 'Directus URL');
  return config;
}

export async function readDirectusCollection(config, fetcher, collection, fields, options = {}) {
    const rows = [];
    const ids = new Set();
    let expectedCount;
    for (let page = 1; ; page += 1) {
      const url = new URL(`items/${collection}`, `${config.url}/`);
      url.searchParams.set('fields', ['id', ...fields].join(','));
      url.searchParams.set('filter', JSON.stringify(options.filter ?? { client: { slug: { _eq: config.clientSlug } }, status: { _eq: 'published' } }));
      url.searchParams.set('limit', '100');
      url.searchParams.set('page', String(page));
      url.searchParams.set('sort', 'id');
      url.searchParams.set('meta', 'filter_count');
      const deep = options.deep ?? (collection === 'roofing_projects' ? { gallery: { _limit: -1, _sort: ['sort'] } } : null);
      if (deep) url.searchParams.set('deep', JSON.stringify(deep));
      const payload = await fetchBuildGet(url, {
        fetcher, headers: { Accept: 'application/json', Authorization: `Bearer ${config.token}` },
        operation: 'snapshot:collection',
      }, async res => {
        if (!res.ok) {
          await res.body?.cancel().catch(() => {});
          return fail(`${collection} HTTP ${res.status}.`);
        }
        return res.json();
      });
      if (payload.errors?.length || !Array.isArray(payload.data)) return fail(`${collection} returned an invalid collection response.`);
      const count = payload.meta?.filter_count;
      if (!Number.isSafeInteger(count) || count < 0) return fail(`${collection} did not provide a verified inventory count.`);
      expectedCount ??= count;
      if (count !== expectedCount) return fail(`${collection} inventory changed during pagination; retry the build.`);
      for (const row of payload.data) {
        if (!row.id || ids.has(row.id)) return fail(`${collection} pagination returned missing or repeated identities.`);
        ids.add(row.id);
        rows.push(row);
      }
      if (rows.length > expectedCount) return fail(`${collection} returned more records than its verified count.`);
      if (rows.length === expectedCount) return rows;
      if (payload.data.length < 100) return fail(`${collection} inventory is truncated.`);
    }
}

/** Build source only. The coordinated generator removes the private ID map. */
export async function fetchDirectusProjectSnapshot(env = process.env, fetcher = fetch) {
  const config = directusBuildConfig(env);
  const read = (collection, fields) => readDirectusCollection(config, fetcher, collection, fields);
  const [rows, materialRows, colorRows, areaRows] = await Promise.all([
    read('roofing_projects', PROJECT_FIELDS),
    read('roofing_material_types', TERM_FIELDS),
    read('roofing_roof_colors', TERM_FIELDS),
    read('roofing_service_areas', TERM_FIELDS),
  ]);
  const projects = rows.map((row) => mapDirectusProject(row, config)).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  if (new Set(projects.map((row) => row.slug)).size !== projects.length) return fail('Published project slugs must be unique.');
  const terms = (items, label) => items.flatMap((row) => term(row, config, label)).sort((a, b) => a.name.localeCompare(b.name));
  return { version: 2, clientSlug: config.clientSlug, projects, projectIds: new Map(rows.map((row) => [row.id, row.slug])), terms: { materials: terms(materialRows, 'Materials'), roofColors: terms(colorRows, 'Roof colors'), serviceAreas: terms(areaRows, 'Service areas') } };
}

import { createHash } from 'node:crypto';
import { directusBuildConfig, readDirectusCollection } from './directus-projects.mjs';
import { sanitizeFaqHtml } from './directus-faq-html.ts';
import { sanitizeSponsorHtml } from './directus-sponsor-html.ts';
import { fetchDirectusSiteShellSnapshot } from './directus-site-shell.ts';
import { formatSpecialOfferExpiration, isSpecialOfferExpired, parseSpecialOfferDate } from '../lead-capture/specialOfferDates.ts';

const text = value => typeof value === 'string' ? value.trim() : '';
const fail = message => { throw new Error(`[Directus locations] ${message}`); };
const required = (value, label) => text(value) || fail(`${label} is required.`);
const identity = value => text(value) || (Number.isSafeInteger(value) && value > 0 ? String(value) : fail('Canonical identity is required.'));
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const FILE_FIELDS = ['id', 'description', 'type', 'width', 'height'];
const areaFields = ['id', 'client.slug', 'status', 'name', 'slug', 'scope_key', 'page_status'];
const fileFields = prefix => FILE_FIELDS.map(field => `${prefix}.${field}`);
const scopeFields = prefix => ['id', 'client.slug', 'status', ...(prefix === 'website_page' ? ['path', 'nav_label'] : prefix === 'service_area' ? ['slug', 'page_status', 'name'] : ['slug', 'nav_label'])].map(field => `${prefix}.${field}`);

export function projectSnapshotDigest(snapshot) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

function inScope(row, config, label) {
  if (row.client?.slug !== config.clientSlug || row.status !== 'published') fail(`${label} escaped published client scope.`);
  identity(row.id);
}
function url(value, label) {
  if (!text(value)) return null;
  try {
    const parsed = new URL(value);
    if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.href;
  } catch { /* Report the field only. */ }
  return fail(`${label} requires an absolute HTTP(S) URL.`);
}
function date(value, label, mandatory = false) {
  if (!text(value) && !mandatory) return null;
  if (!text(value) || !Number.isFinite(Date.parse(value))) fail(`${label} requires a valid date.`);
  return text(value);
}
function image(value, config, label) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || !text(value.id) || !text(value.description) || !text(value.type).startsWith('image/')) fail(`${label} requires an expanded described image or explicit null.`);
  return { url: `${config.url}/assets/${encodeURIComponent(value.id)}`, altText: text(value.description), width: value.width ?? null, height: value.height ?? null };
}
function neighborhoodImage(value, config) {
  const photo = image(value, config, 'Neighborhood photo');
  if (!photo) return null;
  // A missing expansion must not silently discard a required photo credit.
  if (!Object.hasOwn(value, 'metadata') || (value.metadata !== null && (typeof value.metadata !== 'object' || Array.isArray(value.metadata)))) {
    fail('Neighborhood photo metadata must be an expanded object or explicit null.');
  }
  const credit = value.metadata?.attribution;
  if (credit == null) return { ...photo, attribution: null };
  if (typeof credit !== 'object' || Array.isArray(credit)) fail('Neighborhood photo attribution must be an object.');
  // Only this public allowlist enters the snapshot, never arbitrary metadata or EXIF.
  return { ...photo, attribution: {
    title: required(credit.title, 'Photo attribution title'),
    creator: required(credit.creator, 'Photo attribution creator'),
    creatorUrl: url(credit.creator_url, 'Photo attribution creator URL'),
    sourceUrl: url(required(credit.source_url, 'Photo attribution source URL'), 'Photo attribution source URL'),
    license: required(credit.license, 'Photo attribution license'),
    licenseUrl: url(required(credit.license_url, 'Photo attribution license URL'), 'Photo attribution license URL'),
    changes: text(credit.changes) || null,
  } };
}
function uniqueRows(rows, label) {
  if (!Array.isArray(rows) || new Set(rows.map(row => row.id)).size !== rows.length) fail(`${label} has missing or duplicate inventory.`);
}
function area(row, config) {
  inScope(row, config, 'Service area');
  if (!SLUG.test(text(row.slug)) || row.scope_key !== `${config.clientSlug}:${row.slug}`) fail('Service-area identity is invalid.');
  if (!['taxonomy_only', 'draft', 'published'].includes(row.page_status)) fail('Service-area page publication state is invalid.');
  return { id: row.id, clientSlug: config.clientSlug, name: required(row.name, 'Service-area name'), slug: row.slug, pageStatus: row.page_status, href: row.page_status === 'published' ? `/locations/${row.slug}` : null };
}
function page(row, normalized, config) {
  if (typeof row.noindex !== 'boolean') fail('Published location requires explicit noindex.');
  const keywords = Array.isArray(row.focus_keywords) ? row.focus_keywords.map(value => required(value, 'Focus keyword')) : [];
  const primary = text(row.primary_focus_keyword);
  const primaryIndex = keywords.findIndex(value => value.toLowerCase() === primary.toLowerCase());
  if ((!row.noindex && (!primary || !keywords.length)) || (primary && primaryIndex < 0) || (keywords.length && !primary)) fail('Location primary keyword must belong to focus_keywords.');
  if (primaryIndex > 0) keywords.unshift(...keywords.splice(primaryIndex, 1));
  const overviewHtml = text(row.overview) ? sanitizeFaqHtml(row.overview) : null;
  if (text(row.overview) && !overviewHtml) fail('Location overview is empty after sanitization.');
  return { ...normalized, scopeKey: row.scope_key, title: required(row.page_title, 'Location title'), introduction: required(row.introduction, 'Location introduction'), overviewHtml,
    mapImage: image(row.overview_map, config, 'Location map'), publishedAt: date(row.published_at, 'Location publication', true), modified: date(row.date_updated || row.published_at, 'Location modified'),
    noindex: row.noindex, metaTitle: required(row.meta_title, 'Location meta title'), metaDescription: required(row.meta_description, 'Location meta description'), focusKeywords: keywords,
    ogTitle: text(row.og_title) || null, ogDescription: text(row.og_description) || null, ogImage: image(row.og_image_override, config, 'Location social image') };
}

export function normalizeLocationFaq(row, config) {
  inScope(row, config, 'FAQ');
  const scopes = ['website_page', 'service', 'service_area'];
  if (scopes.filter(key => row[key] != null).length > 1) fail('FAQ scopes are mutually exclusive.');
  const normalizedScopes = scopes.map(key => {
    const owner = row[key];
    if (owner === null) return null;
    if (!owner || typeof owner !== 'object') fail('FAQ scope must be explicitly expanded or null.');
    inScope(owner, config, 'FAQ owner');
    if (key === 'service_area' && owner.page_status !== 'published') fail('Local FAQ escaped page publication scope.');
    const path = key === 'website_page' ? required(owner.path, 'FAQ page path') : `${key === 'service_area' ? '/locations' : ''}/${required(owner.slug, 'FAQ owner slug')}`;
    if (!path.startsWith('/') || path.startsWith('//') || /[?#\\]/u.test(path)) fail('Invalid FAQ owner path.');
    return { id: owner.id, path, navLabel: required(key === 'service_area' ? owner.name : owner.nav_label, 'FAQ owner label') };
  });
  const contentHtml = sanitizeFaqHtml(required(row.answer, 'FAQ answer'));
  if (!contentHtml) fail('FAQ answer is empty after sanitization.');
  return { id: row.id, title: required(row.question, 'FAQ question'), contentHtml, websitePage: normalizedScopes[0], service: normalizedScopes[1], serviceArea: normalizedScopes[2], sortOrder: Number(row.sort_order) || 0 };
}

export function normalizeLocationSnapshot(data, config, projectSnapshot) {
  if (projectSnapshot.version !== 3 || projectSnapshot.clientSlug !== config.clientSlug) fail('Project snapshot is incompatible.');
  for (const name of ['areas', 'neighborhoods', 'neighbors', 'reviews', 'sponsors', 'sponsorAreas', 'faqs', 'faqScopes', 'faqUnavailable', 'navigation', 'coverage', 'coverageAreas', 'featuredOffers']) uniqueRows(data[name], name);
  if (!data.siteShell?.settings || !Array.isArray(data.siteShell.services)) fail('Required deployment site shell is missing.');
  const areas = data.areas.map(row => area(row, config));
  if (new Set(areas.map(item => item.slug)).size !== areas.length) fail('Duplicate service-area slugs.');
  const areaById = new Map(areas.map(item => [item.id, item]));
  const getArea = id => areaById.get(id) || fail('Relationship points outside published client taxonomy.');
  for (const project of projectSnapshot.projects) {
    const owner = getArea(project.serviceAreaId);
    if (project.serviceAreas?.[0]?.slug !== owner.slug || project.serviceAreas?.[0]?.name !== owner.name) fail('Project and location taxonomy changed during snapshot generation. Retry the build.');
  }
  const pages = data.areas.flatMap((row, index) => row.page_status === 'published' ? [page(row, areas[index], config)] : []);
  const neighborhoods = data.neighborhoods.map(row => {
    inScope(row, config, 'Neighborhood');
    getArea(row.service_area);
    if (!SLUG.test(text(row.slug))) fail('Neighborhood slug is invalid.');
    return { id: row.id, name: required(row.name, 'Neighborhood name'), slug: row.slug, serviceAreaId: row.service_area,
      description: text(row.description) || null, landmarks: text(row.landmarks) || null, image: neighborhoodImage(row.image, config), mapImage: image(row.coverage_map, config, 'Neighborhood coverage map'), sort: Number(row.sort) || 0 };
  }).sort((a,b) => a.sort-b.sort || a.id.localeCompare(b.id));
  const pairs = new Set();
  const neighbors = data.neighbors.map(row => {
    getArea(row.service_area); getArea(row.nearby_area);
    const key = `${row.service_area}:${row.nearby_area}`;
    if (row.approved !== true || row.service_area === row.nearby_area || pairs.has(key)) fail('Invalid approved nearby-area pair.');
    pairs.add(key);
    return { serviceAreaId: row.service_area, nearbyAreaId: row.nearby_area };
  });
  const reviews = data.reviews.map(row => {
    inScope(row, config, 'Review');
    if (row.rating !== 5) fail('Location reviews require verified five-star rating.');
    const owner = row.service_area === null ? null : getArea(row.service_area);
    return { id: identity(row.id), clientSlug: config.clientSlug, status: row.status, serviceAreaIds: owner ? [owner.id] : [], areaName: owner?.name ?? '', rating: row.rating,
      authorName: required(row.author_name, 'Review author'), text: required(row.review_text, 'Review text'), date: date(row.source_created_at || row.review_date, 'Review date'), url: url(row.url, 'Review source') };
  });
  const sponsorIds = new Set(data.sponsors.map(row => row.id));
  const sponsorPairs = new Set();
  const memberships = new Map();
  for (const row of data.sponsorAreas) {
    if (!sponsorIds.has(row.sponsor)) fail('Sponsor relationship points outside published client sponsors.');
    const owner = getArea(row.service_area);
    const key = `${row.sponsor}:${owner.id}`;
    if (sponsorPairs.has(key)) fail('Duplicate sponsor service-area pair.');
    sponsorPairs.add(key);
    memberships.set(row.sponsor, [...(memberships.get(row.sponsor) ?? []), owner]);
  }
  const sponsors = data.sponsors.map(row => {
    inScope(row, config, 'Sponsor');
    const owners = memberships.get(row.id) ?? [];
    const contentHtml = sanitizeSponsorHtml(required(row.description, 'Sponsor description'));
    if (!contentHtml) fail('Sponsor description is empty after sanitization.');
    const featuredImage = image(row.logo, config, 'Sponsor logo');
    if (!featuredImage) fail('Sponsor logo is required.');
    return { id: row.id, clientSlug: config.clientSlug, status: row.status, serviceAreaIds: owners.map(owner => owner.id), areaNames: owners.map(owner => owner.name), sort: Number(row.sort) || 0,
      feature: { id: row.id, slug: required(row.slug, 'Sponsor slug'), title: required(row.title, 'Sponsor title'), contentHtml, featuredImage,
        links: { websiteUrl: url(row.website_url, 'Sponsor website'), facebookUrl: url(row.facebook_url, 'Sponsor Facebook'), instagramUrl: url(row.instagram_url, 'Sponsor Instagram') } } };
  });
  const navNodes = data.navigation.map(row => {
    if (row.status !== 'published' || row.menu?.client?.slug !== config.clientSlug || row.menu?.status !== 'published' || row.menu?.key !== 'header') fail('Navigation escaped published client menu.');
    let href;
    if (row.link_type === 'service_area') {
      href = getArea(row.service_area).href ?? undefined;
    } else if (['page', 'service'].includes(row.link_type)) {
      const owner = row[row.link_type];
      if (!owner || owner.client?.slug !== config.clientSlug) fail('Navigation owner is not client scoped.');
      identity(owner.id);
      if (!['published', 'draft', 'archived'].includes(owner.status)) fail('Navigation owner publication state is invalid.');
      if (owner.status === 'published') {
        if (row.link_type === 'page') {
          href = required(owner.path, 'Navigation page path');
          if (!href.startsWith('/') || href.startsWith('//') || /[?#\\]/u.test(href)) fail('Invalid navigation page path.');
        } else {
          if (!SLUG.test(text(owner.slug))) fail('Navigation service slug is invalid.');
          href = `/${owner.slug}`;
        }
      }
    } else if (row.link_type === 'external_url') {
      // Legacy internal links may still point to a location during staged cutover.
      const raw = text(row.url);
      if (raw.startsWith('/') && !/^\/[\\/]/u.test(raw)) href = raw;
      else href = url(raw, 'Navigation link') ?? undefined;
    } else if (row.link_type === 'anchor') {
      if (!text(row.anchor).startsWith('#')) fail('Invalid navigation anchor.');
      href = row.anchor;
    }
    if (href && !href.startsWith('#')) {
      const site = new URL(data.siteShell.settings.siteUrl);
      const destination = new URL(href, site);
      const sameSite = destination.hostname.replace(/^www\./u, '') === site.hostname.replace(/^www\./u, '') && destination.port === site.port;
      if (sameSite) {
        let pathname;
        try { pathname = decodeURIComponent(destination.pathname).replace(/\/+$/u, ''); } catch { fail('Navigation pathname encoding is invalid.'); }
        if (pathname === '/locations' || pathname.startsWith('/locations/')) {
          const locationPath = pathname.match(/^\/locations\/([^/]+)$/u);
          const owner = locationPath ? areas.find(item => item.slug === locationPath[1]) : null;
          href = owner?.href ? `${owner.href}${destination.search}${destination.hash}` : undefined;
        }
      }
    }
    if (href && (/^\/[\\/]/u.test(href) || (!href.startsWith('/') && !href.startsWith('#') && !/^https?:/u.test(href)))) fail('Invalid navigation destination.');
    return { id: row.id, parent: row.parent, label: required(row.label, 'Navigation label'), href, sort: Number(row.sort) || 0 };
  }).sort((a,b) => a.sort-b.sort || a.id.localeCompare(b.id));
  const navigation = navNodes.filter(row => !row.parent).map(row => ({ label: row.label, ...(row.href && row.href !== '#' ? { href: row.href } : {}),
    ...(navNodes.some(child => child.parent === row.id) ? { children: navNodes.filter(child => child.parent === row.id).map(child => ({ label: child.label, ...(child.href ? { href: child.href } : {}) })) } : {}) }));
  const sectionIds = new Set(data.coverage.map(row => row.id));
  const sectionPairs = new Set();
  for (const row of data.coverageAreas) {
    getArea(row.service_area);
    if (!sectionIds.has(row.section)) fail('Coverage relation escaped client sections.');
    const key = `${row.section}:${row.service_area}`;
    if (sectionPairs.has(key)) fail('Duplicate coverage service-area pair.');
    sectionPairs.add(key);
  }
  const coverage = data.coverage.map(row => {
    if (row.client?.slug !== config.clientSlug) fail('Coverage section escaped client scope.');
    return { id: row.id, key: text(row.key), title: text(row.title), areaIds: data.coverageAreas.filter(item => item.section === row.id).sort((a,b) => (Number(a.sort)||0)-(Number(b.sort)||0) || a.id.localeCompare(b.id)).map(item => item.service_area) };
  });
  const faqById = new Map(data.faqs.map(row => [row.id, row]));
  const unavailableFaqIds = new Set(data.faqUnavailable.map(row => row.id));
  for (const raw of data.faqScopes) {
    const scopes = ['website_page', 'service', 'service_area'];
    if (scopes.some(key => raw[key] === undefined) || scopes.filter(key => raw[key] !== null).length > 1) fail('FAQ scope inventory is incomplete or scopes are mutually exclusive.');
    const expanded = faqById.get(raw.id);
    if (!expanded && !unavailableFaqIds.has(raw.id)) fail('Eligible FAQ is missing from published inventory without a verified unpublished owner.');
    if (unavailableFaqIds.has(raw.id) && (expanded || scopes.every(key => raw[key] === null))) fail('FAQ publication inventories disagree.');
    if (expanded && scopes.some(key => (expanded[key]?.id ?? null) !== raw[key])) fail('FAQ scope expansion does not match its stored relationship.');
  }
  if (data.faqs.some(row => !data.faqScopes.some(raw => raw.id === row.id))) fail('FAQ inventories changed during the build.');
  if (data.faqUnavailable.some(row => !data.faqScopes.some(raw => raw.id === row.id))) fail('Unpublished FAQ owner inventory changed during the build.');
  const offerSlugs = new Set();
  const offers = data.featuredOffers.map(row => {
    inScope(row, config, 'Featured offer');
    if (row.featured !== true || !SLUG.test(text(row.slug)) || offerSlugs.has(row.slug)) fail('Featured offer identity/publication is invalid.');
    offerSlugs.add(row.slug);
    if (text(row.expiration_date) && !parseSpecialOfferDate(row.expiration_date)) fail('Featured offer expiration is invalid.');
    return { slug: row.slug, title: required(row.title, 'Featured offer title'), href: `/special-offers/${row.slug}`,
      eyebrow: required(row.eyebrow, 'Featured offer eyebrow'), introduction: required(row.introduction, 'Featured offer introduction'), discount: text(row.discount) || null,
      expirationLabel: formatSpecialOfferExpiration(row.expiration_date), legalDisclaimer: text(row.legal_disclaimer) || null,
      featuredImage: image(row.featured_image, config, 'Featured offer image'), expirationDate: text(row.expiration_date) || null };
  }).filter(offer => !isSpecialOfferExpired(offer.expirationDate)).sort((a,b) =>
    ((parseSpecialOfferDate(a.expirationDate)?.getTime() ?? Infinity) - (parseSpecialOfferDate(b.expirationDate)?.getTime() ?? Infinity)) || a.slug.localeCompare(b.slug));
  const featuredOffer = offers.length ? Object.fromEntries(Object.entries(offers[0]).filter(([key]) => key !== 'expirationDate')) : null;
  return { version: 1, contractVersion: 'location-v3', clientSlug: config.clientSlug, projectSnapshotHash: projectSnapshotDigest(projectSnapshot), siteShell: data.siteShell, featuredOffer, areas, pages, neighborhoods, neighbors, reviews, sponsors, navigation, coverage,
    faqs: data.faqs.map(row => normalizeLocationFaq(row, config)).sort((a,b) => a.sortOrder-b.sortOrder || a.id.localeCompare(b.id)) };
}

export async function fetchDirectusLocationSnapshot(projectSnapshot, env = process.env, fetcher = fetch, shared = {}) {
  const config = directusBuildConfig(env);
  const scope = { client: { slug: { _eq: config.clientSlug } }, status: { _eq: 'published' } };
  const read = (collection, fields, filter = scope) => readDirectusCollection(config, fetcher, collection, fields, { filter });
  const faqScope = { _or: [
    { website_page: { _null: true }, service: { _null: true }, service_area: { _null: true } },
    { website_page: scope, service: { _null: true }, service_area: { _null: true } },
    { website_page: { _null: true }, service: scope, service_area: { _null: true } },
    { website_page: { _null: true }, service: { _null: true }, service_area: { ...scope, page_status: { _eq: 'published' } } },
  ] };
  const data = {};
  data.siteShell = await fetchDirectusSiteShellSnapshot(env, fetcher);
  // A bounded sequence avoids bursting the shared CMS. Every list is paginated.
  data.areas = await read('roofing_service_areas', [...areaFields, 'page_title', 'introduction', 'overview', 'published_at', 'date_updated', 'noindex', 'meta_title', 'meta_description', 'primary_focus_keyword', 'focus_keywords', 'og_title', 'og_description', ...fileFields('overview_map'), ...fileFields('og_image_override')]);
  data.neighborhoods = await read('roofing_neighborhoods', ['id','client.slug','status','name','slug','service_area','description','landmarks','sort', ...fileFields('image'), 'image.metadata', ...fileFields('coverage_map')]);
  data.neighbors = await read('roofing_service_area_neighbors', ['id','service_area','nearby_area','approved','sort'], { service_area: scope, nearby_area: scope, approved: { _eq: true } });
  data.reviews = shared.reviews ?? await read('reviews', ['id','client.slug','status','service_area','rating','author_name','review_text','review_date','source_created_at','url'], { ...scope, rating: { _eq: 5 }, review_text: { _nnull: true }, author_name: { _nnull: true } });
  data.sponsors = shared.sponsors ?? await read('sponsor_features', ['id','client.slug','status','slug','title','description','sort','website_url','facebook_url','instagram_url', ...fileFields('logo')]);
  data.sponsorAreas = await read('sponsor_service_areas', ['id','sponsor','service_area'], { sponsor: scope, service_area: scope });
  data.faqScopes = await read('faqs', ['id','website_page','service','service_area']);
  const unpublishedOwner = { client: scope.client, status: { _in: ['draft', 'archived'] } };
  data.faqUnavailable = await read('faqs', ['id'], { _and: [scope, { _or: [
    { website_page: unpublishedOwner }, { service: unpublishedOwner },
    { service_area: { client: scope.client, _or: [{ status: { _in: ['draft', 'archived'] } }, { status: { _eq: 'published' }, page_status: { _in: ['taxonomy_only', 'draft'] } }] } },
  ] }] });
  data.faqs = await read('faqs', ['id','client.slug','status','question','answer','sort_order', ...scopeFields('website_page'), ...scopeFields('service'), ...scopeFields('service_area')], { _and: [scope, faqScope] });
  data.navigation = await read('navigation_items', ['id','status','menu.client.slug','menu.status','menu.key','label','parent','sort','link_type','url','anchor','service_area', ...['page','service'].flatMap(key => ['id','client.slug','status', key === 'page' ? 'path' : 'slug'].map(field => `${key}.${field}`))], { status: { _eq: 'published' }, menu: { ...scope, key: { _eq: 'header' } } });
  data.coverage = await read('service_area_sections', ['id','client.slug','title'], { client: { slug: { _eq: config.clientSlug } } });
  if (data.coverage.length !== 1) fail('Expected one client coverage section.');
  data.coverageAreas = await read('service_area_section_areas', ['id','section','service_area','sort'], { section: { client: { slug: { _eq: config.clientSlug } } }, service_area: scope });
  data.featuredOffers = shared.offers?.filter(row => row.featured === true) ?? await read('special_offers', ['id','client.slug','status','featured','slug','title','eyebrow','introduction','discount','expiration_date','legal_disclaimer', ...fileFields('featured_image')], { ...scope, featured: { _eq: true } });
  return normalizeLocationSnapshot(data, config, projectSnapshot);
}

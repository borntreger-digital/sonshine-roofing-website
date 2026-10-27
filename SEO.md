# SEO Guide

## Canonicals and metadata

- Base site metadata in `app/(site)/layout.tsx`.
- Per-page metadata in each route’s `generateMetadata`.
- Use `NEXT_PUBLIC_BASE_URL` for absolute canonical urls if needed.

## Robots

- Non-production `robots.txt` uses `Disallow: /`. Preview hosting and its
  indexing controls are documented in [the deployment runbook](DEPLOY.md).
- Production: `Allow: /` with sitemap at `/sitemap_index`.
- Page-level robots overrides:
  - `noindex, nofollow`: `/thank-you`, `/tell-us-why`, `/truck-for-sale`, and
    the 404 metadata.
  - `noindex, follow`: `/reviews`, `/roofing-glossary/[slug]`, and any Directus
    route owner whose `noindex` field is true unless the route supplies a
    stricter follow policy.
  - Directus `persons` and `special_offers` use their stored `noindex` toggle.
    Keep approved public profiles indexable. Special-offer expiration does not
    override the toggle.
  - `index, follow`: the `/faq` archive.
  - Legacy `/faq/[slug]` URLs intentionally return a normal 404 and are excluded from sitemaps.

## Sitemaps

- Index: `/sitemap_index`
- Children:
  - `/sitemap_index/static` (build-time manifest)
  - `/sitemap_index/blog`, `/project`, `/location`, `/roofing-glossary`, `/person`, `/special-offer`, `/video`, `/image`
- The `/faq` archive remains in the static manifest; individual FAQ anchors are not sitemap URLs.
- `/sitemap_index/roofing-glossary` reads Directus and emits only term records
  whose own `noindex` value is false. The business policy keeps glossary terms
  noindex, so the child sitemap should remain empty while the archive stays
  indexable.
- The retired sitemap-preview flag is absent from the Dockerfile. Sitemap
  endpoints return 404 outside production; see [the application inputs](DEPLOY.md#application-environment-variables).
- After releases that touch image content, resubmit `/sitemap_index/image` in Search Console.

## Structured data

- RoofingContractor and Services JSON-LD are injected in
  `app/(site)/layout.tsx`.
- Person, DefinedTerm, and FAQ JSON-LD where relevant.
- Ensure visible content matches JSON-LD.

## Open Graph and Twitter

- Prefer the described Directus `site_settings.default_og_image` where the
  route adapter exposes it.
- The tracked local fallback is `public/og-default.png` (1200 x 630). Its
  cache-versioned metadata URL is defined by `DEFAULT_OG_IMAGE` in
  `lib/seo/meta.ts`; keep direct route fallbacks aligned with that value when
  the asset changes.

## Project content and freshness

- Project routes, image entries, and video entries use the same deployment-frozen
  Directus snapshot. The project sitemap includes only published projects whose
  stored `noindex` is false. Mixed sitemaps may refresh other content independently.
- Project canonicals remain `/project/{slug}`. Archive SEO remains in the existing
  `/project` `website_pages` record. Gallery order and the full image set are retained.
- Blog/project metadata and sitemap dates use canonical `modified_at`; original
  publication uses `published_at`. Detail pages display both dates in America/New_York.
  See [editorial dates](docs/editorial-dates.md).

## Location publication

`roofing_service_areas` owns `/locations/{slug}` in production.
Published taxonomy plus `page_status=published` enables a route only after a
successful deployment. `noindex` pages remain routable and leave location/image
sitemaps. Metadata, related content and sitemap images use the same deployed
snapshot. Draft, taxonomy-only and unknown slugs return 404; revalidation cannot
create a page. Initial pages need editorial review before indexing/publication.

Location pages use the actual global business identity and address. They do not
invent local branches or calculate business rating/count from selected reviews.
No Review/AggregateRating markup is emitted by the location layout, and stale
hardcoded global rating totals are removed. Google's
[review-snippet guidance](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
excludes self-serving local-business reviews from that rich result (checked
2026-09-15). FAQ structured data uses sanitized visible answers and correct global
or single-owner scope from the deployment snapshot.

# Location content model

Current authoring contract after the September 2026 Directus migration. The
application snapshot format is `location-v3`; retained setup tooling is model v7.
Use [location authoring](location-authoring.md) for edits and [DEPLOY.md](../DEPLOY.md)
for publication/recovery. Historical release decisions remain dated evidence.

## Model and ownership

- `roofing_service_areas` owns `/locations/{slug}`. Preserve taxonomy identity,
  required project association, `status` and `scope_key`.
  Use independent `page_status` (`taxonomy_only`, `draft`, `published`, default
  `taxonomy_only`), `page_title`, plain-text `introduction`, optional restricted
  HTML `overview`, optional `overview_map`, `published_at`, and
  the standard shared SEO group.
  Page publication also requires published taxonomy and the correct client.
  Published `noindex` pages remain routable but leave location/image sitemaps.
- `roofing_neighborhoods`: client, status, name, slug, required `service_area`,
  plain-text description (at most 220 characters; nullable drafts) and optional
  landmarks, optional `image` for a verified
  neighborhood photo and a separate optional `coverage_map` for an actual map,
  sort. Names are required. Use client/slug
  uniqueness and a primary area; resolve conflicting assignments before writes.
- Preserve existing Parrish coverage with one canonical taxonomy-only area if
  absent. This creates no additional landing page or WordPress taxonomy identity.
- Projects have private `job_id` and `zip`, plus nullable `neighborhood`.
  Existing primary `service_area` remains required. Normalize blank job IDs to
  null, enforce client/job uniqueness, and prevent cross-client or mismatched
  neighborhood/area assignments. After verified complete enrichment, a separate
  constraint makes job ID and ZIP required for SonShine only.
- Reviews have optional `service_area`.
  Imported location reviews are manually maintained. Preserve original attribution,
  actual approved ratings, dates, source URLs and owner replies; missing dates stay
  null. `external_id` is reserved for verified Google resource identity and remains
  null on WordPress-only imports. No feed membership fields or n8n changes belong
  to normal authoring. Existing Google-managed records and sitewide feed behavior
  remain under their existing workflow; never duplicate a confirmed existing match.
  Conflicting or workflow-managed matches require explicit disposition before a
  manual-location import can alter them.
- `sponsor_service_areas(sponsor, service_area)` supplies multiple geography
  relations through `sponsor_features.service_areas`; keep `service_area_slugs`.
- `roofing_service_area_neighbors(service_area, nearby_area, approved, sort)` is
  directed. Default approval false; exclude self-links, duplicate pairs, and
  cross-client pairs. Select only directly approved neighbors. Taxonomy-only
  neighbors may supply published content.
- `service_area_section_areas(section, service_area, sort)` replaces copied
  coverage names/links through `service_area_sections.areas`; retain legacy JSON.
- `navigation_items.service_area` and `link_type=service_area` resolve canonical
  links only for deployed published pages, preserving explicit ordering.
- `faqs.service_area` is exclusive with `website_page` and `service`. Global means
  all three are empty. Retain the existing restricted FAQ HTML sanitizer.
- Restrict deletion/reassignment of associated canonical records; preserve
  client consistency through database constraints and actual role permissions.
  Leave `location_landing_pages` untouched; no location owners in `website_pages`.

## Deployment and public data

Keep the existing `.generated/projects.json` v2 project/video snapshot. A
coordinated prebuild generates `.generated/locations.json` v1 (`location-v3` contract) containing explicit
public projections of areas, neighborhoods, approved adjacency, local reviews,
sponsors, coverage, FAQ scopes, and navigation. Record artifact versions and a
project-snapshot digest, and reject incompatible artifacts. Include a required
`siteShell` with normalized public site settings and services so shared layout
reuse during client navigation cannot introduce newer CMS hero/header/footer copy.
Freeze the shared featured-offer popup in the same artifact; an intentionally
absent offer is null, while a required fetch/validation failure aborts the build.
Runtime location
routes, navigation, FAQs, and sitemap consumers read deployed content only.

Project projections may include canonical CMS ID, primary area ID, and a nullable
public neighborhood (ID/name/slug). Job IDs and ZIP are never requested by website
readers or copied into public props/snapshots. No customer-address inputs or
private migration maps enter Git or generated website content. Website-reader and
public permissions must deny job references even through nested relationships.

Required fetch, pagination, schema, tenant, and publication failures abort builds.
Optional empty content is distinct from invalid/missing relation expansion.
Location routes use `dynamicParams=false`, static generation, and no ISR.
Revalidation cannot publish locations. Published videos linked to unpublished
projects remain independent and expose no project geography.

## Selection and presentation

Use canonical IDs and one shared, pure selector. Return local and nearby groups.
Projects: local then directly approved nearby, maximum six combined. Reviews:
editorially published, actual rating five, assigned area, all local records plus
directly approved nearby records only when needed to reach six. Render reviews
in one carousel without separate nearby headings or badges; neither Google ID
nor feed membership is required. Dates descend within each group, missing dates
last, stable ID breaks ties. Sponsors: every local match, then nearby toward
three combined; CMS sort then ID, canonical-ID deduplication. Unassigned reviews
and sponsors never provide regional backfill. Retain actual area labels.

Common order: shared hero/local introduction; projects and existing video
functionality; one combined review carousel; shared homepage service cards; neighborhoods/map;
partnerships; global/local FAQs. Omit empty sections and absent optional fields.
Null project neighborhood means no label, wrapper, or placeholder. Neighborhood
cards can link to matching published projects but have no routes or archive filter.
Render complete descriptions without hiding continuation text. Neighborhood
photos occupy the top 16:9 frame, with crops checked for meaningful subjects;
select images that need no public attribution because cards omit credit blocks.
Coverage maps remain uncropped and have no customer pins. Use concise verified coverage language.
Longboat Key is organized under Sarasota by owner decision. Other conflicts need
verification. The owner approved these direct nearby lists on 2026-09-15:
Sarasota → Bradenton, Lakewood Ranch, Siesta Key, Osprey;
Bradenton → Palmetto, Lakewood Ranch, Sarasota;
Lakewood Ranch → Bradenton, Sarasota, Myakka City;
Venice → Nokomis, Osprey, North Port, Englewood;
North Port → Venice, Englewood, Port Charlotte.

Google's review-snippet rules exclude self-serving local-business review rich
results. Location pages emit no Review/AggregateRating markup or selected-feed
rating totals. The existing company identity/address remains global. Source:
[Google review-snippet documentation](https://developers.google.com/search/docs/appearance/structured-data/review-snippet), checked 2026-09-15.

## Migration, release, and limits

Source inventory is paginated and repeatable. Every source page, neighborhood,
review occurrence, media asset, and relationship gets a disposition (create,
update, match, conflict, held, excluded). Stable source keys survive row reordering.
Write designated migration-owned fields only; compare target modification state
before updates and preserve later editor changes. Match confirmed records, retain
source dates/URLs/replies, never infer five stars from frontend display or invent
Google identifiers/dates. No overwriting deployed media. Keep originals and
compatibility fields through verification.

For a confirmed existing review, explicitly verified missing source URL, reply or
date may be filled when null; conflicting populated values remain editorial
conflicts. Explicitly approved initial review geography can fill an empty relation;
subsequent migration runs preserve editor-owned assignments and publication.

Private source exports, narrow before-images and recovery maps belong in the
approved durable root `/Users/home/Documents/SonShine-Migration-Recovery/2026-09-15`
(directory 0700, files 0600). Repository reports contain sanitized counts, hashes
and verification outcomes only. Retain prior preparation artifacts as withdrawn
historical evidence; do not execute abandoned workflow patches or seed plans.

Static review import requires a reviewed dry run, current deduplication evidence,
verified source facts and owner-approved location associations, and fresh target
conflict checks. Create drafts, verify every field, then apply the already-approved
editorial publication in a separate status-only step. Imported null-identity reviews
must remain outside the unchanged Google workflow and sitewide feed. No workflow
pause, publication, feed seeding, or website deployment is an import prerequisite.
Deployment is still required for changed location content to appear publicly.

Rollback is confined to affected migration-owned fields/records, with narrow
before-images and later-editor checks. Preserve the existing workflow. The previous
application remains compatible with null-identity static reviews. Removing unused
feed-preparation fields requires proof they remain unused and no dependencies would
be broken; retain their narrow recovery metadata privately.

All 53 owner-supplied project/job and postal ZIP enrichments were applied and
verified, followed by the SonShine-only required-field constraint. These private
references and all existing privacy protections remain independent of review scope.
No deployment, merge or remote Git push is authorized by CMS import approval.

## File ownership

Coordinator: contract, application data/snapshot adapters, shared types, consumers,
publication integration, common utilities, package scripts, authoring docs, release
evidence. Model specialist: new schema/permission/SQL preparation and model tests.
Review specialist: static review source verification, deduplication, URL corrections and removal of abandoned workflow tooling.
Migration specialist: new migration tooling, inventory, manifest, migration tests.
Frontend specialist (after reassignment): common location components, selectors,
focused selector/component tests. Explicit handoff transfers ownership; no two
writers edit a file simultaneously. Freeze revisions and hashes before review.

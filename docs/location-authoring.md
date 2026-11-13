# Authoring location hubs

The five location hubs were released on September 17, 2026. Consult
[deployment and recovery](../DEPLOY.md) before publishing later changes.

## Prepare the canonical area

Edit the existing `roofing_service_areas` record. Preserve its slug and taxonomy
identity. Keep taxonomy `status=published` for associations. Use `page_status=draft`
while preparing the page; use `taxonomy_only` when the area needs associations
without a landing page. Unpublishing a page preserves project relationships.

Write a short `page_title` and plain-text `introduction`. Add an optional concise
`overview` using the same restricted paragraphs/lists/links as FAQs. Keep shared
company history, branding and hero media in `site_settings`. Describe coverage
accurately; do not imply a city branch or projects that have not been documented.

Complete shared SEO fields and use the primary phrase in `focus_keywords`.
Review canonical `/locations/{slug}`, titles, descriptions and image descriptions.
`noindex` is independent of page publication. The five initial pages become
indexable only after editorial review and a successful deployment.

## Coverage and matching content

- Use `roofing_neighborhoods` for real neighborhood names and one primary area.
  Fill published descriptions with complete plain text of at most 220 characters.
  Directus shows the editor limit and validates it on save; null remains valid
  for a draft. Landmarks are separate optional plain text. Shorten source copy
  without adding unsupported project claims. ZIP alone is insufficient
  membership evidence.
- Longboat Key belongs to Sarasota under the owner's organization decision.
  Resolve other conflicts before assignment. No neighborhood route/filter exists.
- Optional coverage maps require verified descriptions and must not show customer
  homes or job pins. Upload a new file when changing deployed media; preserve the
  old file and source bytes for rollback.
- Store verified neighborhood photos in `image`; `coverage_map` is reserved for
  actual maps. Both are optional and need accurate image descriptions.
- Neighborhood photos fill a cropped 16:9 frame at the top of each card. Review
  signs and subjects at the actual display sizes and preserve them with suitable
  focal positioning. Actual coverage maps remain uncropped.
- Neighborhood cards do not display photo credit, source, license, or crop
  disclosures. Select photos whose terms permit this use without public
  attribution. Replace an incompatible photo rather than remove its credit and
  continue using it. If a suitable replacement cannot be found, ask the owner
  for one while other work continues.
- Preserve original media and its provenance metadata for recovery and other
  uses. Existing `metadata.attribution` may contain `title`, `creator`,
  `source_url`, `license`, `license_url`, `creator_url`, and `changes`. The build
  still accepts an object or explicit null and retains the public projection;
  arbitrary metadata and EXIF must not enter the snapshot.
- Projects retain a required primary service area. Neighborhood is nullable and
  shown only when verified; a missing value produces no label or placeholder.
  The private AccuLynx job reference and ZIP never enter website snapshots.
- Select each sponsor's canonical `service_areas`; preserve legacy slug arrays
  through verification. Review assignments are editor-owned and optional.
- Approve each directed nearby relation explicitly. Selection never expands
  recursively. An area can supply content with no landing page, provided its
  taxonomy and content are published and client-scoped.

Projects show at most six combined: local first, newest dates first, missing dates
last. Reviews show all eligible local records, adding directly approved nearby
records only when needed to reach six. They share one carousel with no separate
nearby heading or badge. Reviews require verified rating five and editorial
publication; Google feed membership/identity are irrelevant to local eligibility.
Sponsors show every local match, then nearby matches toward three total. Cards
keep their actual area labels. Fewer eligible records produce fewer cards.

## Reviews and FAQs

Verify source attribution, exact text, rating, dates, URL, and any retained reply
before importing a review. Never derive a rating from the old site's star graphic.
Keep missing dates empty. `external_id` is reserved for verified Google resource
identity; WordPress provenance is separate. Manually imported location reviews keep
that identity null and are maintained directly in Directus. The existing Google
workflow stays unchanged and does not manage these imports. See [manual review
ownership](location-reviews.md). Project testimonials stay independent.

Each FAQ has zero or one scope: `website_page`, `service`, or `service_area`.
Zero means global. Local questions must concern actual local coverage or conditions;
shared company facts belong in global questions. Answers use the restricted FAQ
sanitizer, and visible content matches the FAQ structured data.

## Preview and publish

For an existing description field, use the focused
`node scripts/setup-location-schema.mjs --neighborhood-description --dry-run`
mode with the configured URL and authorized `LOCATION_DIRECTUS_ADMIN_TOKEN`.
Review its changes, then use `--apply` and `--verify-only`. This updates only
the field's editor guidance and API validation, preserves other metadata and
database nullability, and refuses a collection containing another client's
records. The broad setup command deliberately skips existing field metadata.

A successful credentialed prebuild packages project/video and matching location
snapshots. Page routes, metadata, FAQs, coverage, navigation, local selections and
location/image sitemap entries come from those artifacts. CMS edits and revalidation
do not change deployed location pages; new matching content requires deployment.
Shared site settings, service summaries and the featured-offer popup also come
from the snapshot, including when visitors navigate from another page.

Review desktop/mobile layout, correct local/nearby headings, source links, optional
omissions, map safety, indexability, canonicals and video behavior on all five
initial pages. Record the deployed application revision and the rendered
`data-location-snapshot` digest. Production schema/data/deployment actions
follow the coordinated release procedure and exact authorization boundaries.

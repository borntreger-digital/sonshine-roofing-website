# Content Workflow

## Deployment-only publishing contract

All Directus-owned website content is captured during prebuild and becomes public
only when that successful build is deployed. This includes edits, new records,
unpublishing, slug changes, metadata, shared content, reviews, redirects, robots,
`llms.txt`, archives, resource API responses, and every sitemap. A CMS save alone
never changes an existing deployment. Urgent removals also require a deployment.

`scripts/prebuild.mjs` coordinates complete, client-scoped reads and existing
normalizers/sanitizers. It writes private `projects.json`, `locations.json`,
`static-media.json`, and `editorial.json` under `.generated/`. Shared sponsors,
reviews, and offers are captured once for their consumers. Site settings supply
both rendering and build configuration. Route ownership is checked against the
captured records; runtime lookup, navigation, pagination and sitemaps use that
same inventory. Published `noindex` records remain routable.

`.generated/content-manifest.json` seals the snapshot files, static sitemap
manifest and optional `llms.txt` with hashes. Required fetch, pagination, scope,
normalization and integrity failures stop the candidate build. There is no stale
snapshot, empty-inventory or live-CMS recovery path. Server startup validates the
whole bundle. Keep these artifacts private, ignored by Git, and packaged together
with the standalone application; do not change them inside a running deployment.

Build-time Directus GETs retry transient connection failures and interrupted
response bodies, including the collection readers shared by editorial, projects,
videos, locations, site settings and redirects, the static-file metadata batches,
and the standalone route inventory. Each read gets up to three 20-second attempts
with bounded backoff (at most 62 seconds including waits). Every attempt preserves
the original authorization, client/publication filters and no-store policy.
Authentication/HTTP errors, invalid JSON, TLS errors and inventory/normalization
failures still fail immediately. Exhausted retries stop capture; they cannot seal
partial content or reuse a prior snapshot. Diagnostics include only an allowlisted
operation, error code, attempt and elapsed time. `npm run verify:build-fetch`
checks the real readers, pagination, deadlines and failed-capture seal removal.
External YouTube metadata requests and runtime lead submissions are unchanged.

Content pages and sitemaps have no ISR. Every CMS detail route disables dynamic
fallback, so a slug absent from its deployment returns 404. Runtime resource APIs
remain interactive but read local snapshots. Both authenticated revalidation
methods return HTTP 410 with a deployment-required message and perform no cache
writes; unauthenticated requests return 401.

Offer expiration, consent state, opening-hours displays and other existing
clock/client behavior continue to operate on captured values. External media
bytes and YouTube playback are not packaged with the content. Replace published
Directus media by uploading a new file and changing its reference; preserve old
files so older deployments and rollback retain their media.

See [deployment verification](DEPLOY.md#cache-and-invalidation) for the build,
runtime and two-release acceptance gates.

## Where content lives

- Directus `roofing_service_areas` owns location landing pages. The five hubs were deployed and verified on September 17; see [release evidence](docs/location-release-20260917.md).
- Static image selections use Directus File Library originals in
  `/clients/sonshine_roofing/static`; metadata is deployment-frozen as described
  below. Retain legacy WordPress sources until a separately authorized cleanup
  after proven production cutover.
- Directus, filtered by related `client.slug = DIRECTUS_CLIENT_SLUG`:
  - `blog_posts` and flat, client-scoped `blog_topics`: the exclusive blog
    source for archives, filters, post pages, recommendations, metadata, and
    blog/image sitemaps.
  - `roofing_projects` and client-scoped `roofing_material_types`,
    `roofing_roof_colors`, and `roofing_service_areas`: the exclusive project
    source for project records and project media.
  - `videos`, `video_categories`, and `video_category_assignments`: the exclusive
    video-library source, including the independently authored videos linked to projects.
  - `site_settings`: shared brand, contact, address, social, image, hero media, footer badges, company facts, robots, CSP, analytics switch, schema values, and optional raw `llms.txt` content.
  - `website_pages`: normalized SEO records for fixed routes only; canonicals are route-derived.
  - `services`: primary service route owners, including their SEO metadata.
  - `faqs`: published WYSIWYG-authored semantic HTML answers. Fixed routes use `website_page`, service routes use `service`, and local routes use `service_area`, and a record is global only when all three scopes are null.
  - `navigation_items`: header navigation and matching footer link groups.
  - `redirects`: published legacy redirect rules loaded at build time.
  - `special_offers`: special-offer pages and popup content.
  - `legal_copy`: WYSIWYG privacy/SMS terms content.
  - `persons`: the exclusive source for the ten approved SonShine profiles. The
    adapter covers team cards, profile routes, person navigation, metadata, and
    page/image sitemaps.
  - `sponsor_features`: the exclusive source for partnership cards on the
    homepage and location landing pages.
  - `reviews` and `reviews_carousels`: the site-wide Google review feed and its
    per-client display settings.
  - `roofing_glossary_terms`: the exclusive source for the glossary archive,
    term routes, route-owned SEO, contextual term linking, and glossary sitemap.
- Next.js app pages: route layouts, components, and page body copy not yet moved to Directus.
- Home and About select published Directus videos from the shared build
  snapshot. Both belong to the public video library. The personal
  `/truck-for-sale` page keeps its body and two YouTube videos completely
  code-owned and stays `noindex, nofollow`; its images use Directus originals.
  Truck videos have no CMS records, library membership or snapshot selectors.

## Static images

- `lib/content/static-image-files.mjs` holds stable file selections. The build
  fetches only those files from the SonShine static folder, validates image MIME,
  description, intrinsic dimensions and original-pixel focal coordinates, and
  writes private `.generated/static-media.json`. Missing or invalid data fails
  the build. File metadata edits become visible through a new build/deployment.
- `staticImage` and `staticImageUrl` are server-only selectors. `DirectusImage`
  renders their public fields synchronously with Next Image delivery. Shared
  client header/lead forms receive only their selected public metadata through
  `StaticMediaProvider`; the standalone truck gallery receives its own records.
  Credentials, complete CMS exports and private snapshots stay server-side.
- Description is the informative-image default. Decorative illustrations use
  empty alt; logo links use a contextual link name. Cropped images opt into
  focal positioning: explicit usage/style position, then file focal converted
  from original pixels, then center. Decorative Hero backgrounds use the same
  precedence with top-center as their final fallback. Full logos and lightboxes
  retain the complete image. Existing CMS images keep their current presentation.
- Preserve originals and distinct crops/resolutions. Replace a published image
  by uploading a new file and changing its selection, so old deployments retain
  their referenced media. Migration evidence, approvals, originals and recovery
  ledgers are private and do not belong in this repository.

## Publishing shared site content in Directus

- Keep exactly one `site_settings` record for the SonShine client.
- Use unique normalized paths in `website_pages`; the 404 record is `/404` even though it has no public canonical.
- Keep the four primary `services` records published; they own their public
  routes and SEO. There are no duplicate service records in `website_pages`.
- Navigation links to service routes use `link_type=service` and the `service`
  relation. Fixed routes continue to use `link_type=page`.
- Store the complete keyword set in `focus_keywords` and include the
  `primary_focus_keyword` phrase. The adapter matches it case-insensitively and
  returns it first; a missing match fails content loading with
  `DIRECTUS_PRIMARY_FOCUS_KEYWORD_MISMATCH`.
- Route owners use the shared `seo` group: `noindex`, `meta_title`,
  `meta_description`, `primary_focus_keyword`, `focus_keywords`, `og_title`,
  `og_description`, and `og_image_override`. Keep explicit Directus values;
  frontend derivation exists only as a fallback.
- Every Directus image must have a `directus_files.description`.
- `site_settings.hero_image` and `site_settings.hero_video` are the exclusive
  hero-media sources for the homepage and location landing pages. Both files
  require a description; the image must use an image MIME type and the video
  must use a video MIME type. These fields are build-only and require a new
  site build before changes become public.
- Footer badges are image-only records in `site_settings.badges`; each image needs a description. Embedded badge HTML is not rendered.
- Populated social fields must contain absolute HTTP(S) URLs. Invalid values fail production builds.
- `site_settings.content_security_policy` is required and production builds fail when it is empty or unavailable.
- `site_settings.enable_site_analytics` is the CMS switch for GTM and Meta Pixel; the required public IDs still come from environment variables.
- `site_settings.llms_txt` is optional and is published verbatim as `/llms.txt`. Empty or whitespace-only content produces no file.
- Header, body, and footer script fields remain intentionally disabled.
- Operational hours and timezone intervals in `lib/contact-hours.ts` are a documented code-controlled exception because UI state and JSON-LD require normalized schedules.

## Publishing reviews in Directus

- The owner-approved Google Ads landing pages are a code-owned selection exception:
  `lib/landing/reviews.ts` contains six verbatim replacement reviews (also used on
  financing) and six repair reviews, curated from verified published reviews.
  They render through the same fetch-free carousel view as the organic site,
  without reading the live feed or carousel settings. Edit these campaign
  selections in code; do not change organic review ownership or synchronization.
- The site-wide review widget reads published, SonShine-scoped Google reviews
  whose rating is five and whose verified Google `external_id` is populated. Records also need
  an author name and review text to render.
- Keep exactly one SonShine-scoped `reviews_carousels` record. Its `limit` and
  `gbp_profile_link` configure the widget.
- Location hubs select editorially published, five-star, geographically assigned reviews from the deployment snapshot. Imported location reviews are manually maintained and keep `external_id` null. Unassigned reviews cannot supply local or nearby results. The existing Google workflow and sitewide feed remain unchanged. See [manual location reviews](docs/location-reviews.md).

## Publishing FAQs in Directus

- Keep each FAQ assigned to one client and one scope: `website_page` for a fixed
  route, `service` for a service route, or `service_area` for a location page.
- Leave all three scope relations empty only for genuinely global FAQs. At most one scope may be populated; all owners must belong to the same client.
- Use only paragraphs, links, bold/italic emphasis, ordered or unordered lists, list items, and line breaks in `answer` (`p`, `a`, `strong`, `em`, `ul`, `ol`, `li`, and `br`).
- Link attributes are limited to `href`, `rel`, `target`, and `title`. Destinations must begin with exactly one `/`, begin with `#`, or use `http`, `https`, `mailto`, or `tel`. Do not use protocol-relative or unsafe-protocol URLs.
- Do not add images, headings, tables, classes, IDs, inline styles, scripts, event handlers, or arbitrary editor/source markup.
- The editor toolbar guides authors, but the restricted frontend sanitizer is the authoritative security boundary. `_blank` links receive `rel="noopener noreferrer"`.
- FAQ JSON-LD uses parser-derived, entity-decoded plain text from `faqHtmlToPlainText()`; never remove tags with a regex.
- Publication uses `status`; scope uses `website_page`, `service`, or `service_area`. FAQs and owner visibility are normalized into the deployment snapshot.
- Page sections render global FAQs plus FAQs whose related fixed-page path or
  service slug or published location slug matches the current route.
- Location hubs show every eligible local FAQ first, then all global FAQs. The
  current editorial set has five local and eight shared answers per hub; there is
  no combined eight-answer cap. The DOM order and FAQ structured data agree.
- The `/faq` archive renders General first, then fixed-page/service groups by
  their editor-facing labels, including published location groups. Its structured
  data covers the same answers as the displayed list.

## Publishing redirects in Directus

- Redirect changes become active only after a new site build.
- Keep `source_path` unique, set `preserve_query=true`, and use a supported status code (`301`, `302`, `303`, `307`, or `308`).
- Use `/prefix/*` for prefix wildcards. Invalid, duplicate, or self-redirect records fail the build.
- Canonical-host, global de-pagination, global `.html`, and WordPress sitemap-pattern rules remain in `next.config.mjs`.
- `proxy.ts` owns the normalized code-only legacy redirect and configured 410
  responses. Keep their exact path list in code rather than duplicating it in
  Directus.
- Deleted deprecated landing-page routes intentionally return 404; do not add redirects for them.

## Publishing location hubs

- Preserve canonical service-area IDs, slugs, and `scope_key`.
  `page_status` is independent of taxonomy `status`: `taxonomy_only` keeps content
  associations without a page, `draft` prepares copy, and `published` enables a
  route after successful deployment. A published taxonomy remains required.
- Store local page copy, described coverage maps,
  and the shared SEO fields on `roofing_service_areas`. `noindex` changes indexing,
  not route availability. New pages stay drafts until editorial review. The five
  migrated owners are published in Directus and deployed. Later CMS edits become
  public only through a successful frontend build and deployment.
- Use reusable `roofing_neighborhoods` with one primary area and real names.
  Optional descriptions are short plain text. Coverage does not claim a completed
  project. Verified projects may link from a card; neighborhoods have no routes.
  Migration reruns preserve edited descriptions unless an explicit description
  revision is supplied and its before-image still matches. Leave a project
  neighborhood empty with a documented exception when no recognized neighborhood
  can be verified.
- Select only directly approved `roofing_service_area_neighbors`. Projects show
  up to six combined, local first. Reviews show every eligible local review and,
  when there are fewer than six, enough approved nearby reviews to reach six if
  available. Render the selected reviews in one carousel without separate nearby
  headings or badges. Sponsors show every local match, then nearby matches toward
  three. Empty sections and absent neighborhoods/maps disappear. Unassigned
  records are not geographic backfill.
- Canonical coverage relations replace copied names/URLs. Navigation may use
  `link_type=service_area` with a service-area relation; published pages get links,
  taxonomy-only areas can remain plain coverage text. Keep CMS sort order.
- The `.generated/locations.json` v1 artifact references the matching project/video
  snapshot digest under contract `location-v3`. It also freezes public site settings,
  service summaries and the shared offer popup across client navigation. Routes, location/image sitemap entries, FAQs, geography and
  navigation remain frozen for a deployment. Required schema/fetch/tenant failures
  stop prebuild. Unknown, draft and taxonomy-only routes return 404.
- Read [location authoring](docs/location-authoring.md) for editorial checks and
  [the model contract](docs/location-contract.md) for schema and permissions,
  and [DEPLOY.md](DEPLOY.md) for deployment and recovery. The unrelated
  `location_landing_pages` scaffold remains outside this model.

## Website preview selection

- Homepage category previews select up to six items per configured topic or
  material from the complete deployment snapshot, before applying the limit.
- Blog recommendations rank all shared topics, then publication date, and fill
  remaining slots with recent articles. They exclude the current article and
  deduplicate by slug.
- Project previews prefer nonblank project testimonials, then publication date.
  Related projects prioritize the same service area before regional backfill;
  location hubs retain local priority and their separate approved-nearby group.
  Both reviewed and unreviewed projects can fill the six available slots.
- These preview rules do not change archive chronology or complete neighborhood
  project listings. Cards use one column below 768px, two from 768px, and three
  from 1024px; the six-card limit is the same on mobile.

## Publishing blog posts in Directus

- Directus is the only frontend blog source. There is no environment-controlled
  WordPress fallback.
- Set `status=published` to expose a post and provide one to three published,
  SonShine-scoped `blog_topics` relations.
- Preserve `published_at`, `modified_at`, `meta_title`,
  `meta_description`, and a described Directus featured image.
- Leave `author` empty for the SonShine Roofing Organization fallback; use only
  the approved SonShine-scoped Michael Borntreger person relation for his posts.
- `modified_at` is maintained automatically and read-only in the editor.
  Preserve `published_at` as the original publication date; historical corrections
  remain explicit editorial edits. See [editorial dates](docs/editorial-dates.md).

## Publishing roofing projects in Directus

- Edit projects only in `roofing_projects`. Keep the SonShine client, a unique
  stable slug, `status`, `published_at`, plain-text `description`, and a described
  `featured_image`. Published WordPress projects were the migration scope;
  unpublished WordPress records remain excluded.
- Internal `job_id` is the private AccuLynx reference; populated values are unique within the client. The verified 53-project backfill and SonShine-only job ID/ZIP requirement were applied on 2026-09-15. Unrelated clients keep optional fields. Actual public/website permissions exclude job ID and ZIP; neither is fetched or packaged by the website. Neighborhood stays optional and its label disappears when absent. See [enrichment evidence](docs/location-enrichment-evidence.md).
- Select one published material and one published service area from the reusable
  managed lists. Roof color is optional and single-select. Preserve existing
  names/slugs because archive URLs use `mt`, `rc`, and `sa` query parameters.
- Order all gallery entries explicitly with `roofing_projects_files.sort`.
  Every gallery image appears; no default connection limit truncates the list.
  Shared featured/gallery assets can reference the same Directus file.
- Keep product links in their displayed order as `{ label, href }` entries.
  Product and review links require absolute HTTP(S) URLs. Store the project
  video relationship in the independently authored `videos` record. The retired
  project `youtube_url` field was removed in the September 23 schema cleanup.
- The testimonial belongs to the project: `client_testimonial`,
  `client_testimonial_name`, `client_testimonial_date`, `review_source`, and
  `review_url`. It is independent of shared review synchronization and has no
  owner-reply field.
- Brewster Rd has an owner-approved exception: keep its existing testimonial
  and leave `review_url` empty. This does not block publication. New reviews
  require editorial verification and a source link unless explicitly excepted.
- Keep all project narrative in the plain-text `description`. There is no
  separate project body in the frontend or migration/import path. Shared HTML
  sanitizers remain required for other content types.
- State the job type early in the description. Project badges and service
  structured data use its first explicit "roof installation" or "roof replacement"
  phrase; copy without either phrase receives the neutral "Roofing Project" label.
- Project SEO uses the shared SEO fields and stored `noindex` policy. Both keyword fields are optional in the editor and build. If supplied,
  keywords must be nonempty text with the primary phrase first in `focus_keywords`.
- `published_at` retains original publication; `modified_at` records public-facing
  content edits. Both appear on detail pages. Audit housekeeping and deployments
  preserve these dates; see [editorial dates](docs/editorial-dates.md).
- Archive search matches the title plus plain-text description, without case
  sensitivity. Results, totals, pagination, and all filter counts use that same
  matching set, including when material, color, and service-area filters combine.
- All project views use one build-generated dataset, including archive search,
  facets, pagination, homepage/location cards, video-library selections, metadata,
  and sitemaps. Save CMS changes, run a successful frontend production build,
  and deploy it to publish them. New slugs remain unavailable until deployment;
  project routes have no ISR or on-demand generation.
- Imported originals retain their bytes. Image descriptions were reviewed
  separately and belong in `directus_files.description`. Future uploads use the
  normal image-processing workflows. When replacing a published image, upload a
  new file and change the relation; overwriting an existing file would change
  media referenced by an older deployment before release and weaken rollback.
- Follow [the project authoring procedure](docs/project-authoring.md) for verified
  job facts, description copy, media, metadata review, and release checks.
- Deployment order for retiring `roofing_projects.body`: deploy and verify the
  frontend that no longer requests the field, recheck all clients for meaningful
  body values and all integrations for consumers, then remove only that field.
  Keep the field present while release approval is pending. Retain its schema
  definition privately; an older frontend rebuild needs the field restored first.

## Publishing videos in Directus

- Author every library video in `videos`, including project clips. Keep the
  SonShine client, stable `slug`, `status`, `title`, plain-text `description`,
  `youtube_url`, and website `published_at`. Video wording is independent of
  later project and YouTube edits. Existing Unicode selection slugs are valid.
- Paste one YouTube reference. The database normalizes the URL and derives
  `youtube_id`; the frontend derives watch/embed URLs and YouTube thumbnails.
  Verify playback before publishing. No custom poster, uploaded video,
  per-video SEO fields, or dedicated video pages are part of this model.
- Set the optional `project` relation on the video. Each video has at most one
  project and each project at most one video. Select the same client. Unlink a
  video deliberately before deleting its related project.
- Select any applicable published `video_categories` through `categories`.
  Category names and sort values are editable; published slugs remain stable.
  Roofing Projects (`roofing-project`) is derived from the project relationship;
  Other (`other`) is derived when no relationship or published category exists.
  Those reserved slugs cannot be ordinary categories. Overlapping assignments
  match every assigned category without duplicating the video in the library.
- Video and project publication are independent. A published video linked to
  an unpublished project keeps its copy, selection link, and Roofing Projects
  classification; it exposes no project link, material, or location. Its sitemap
  destination becomes the library selection URL. Unpublishing a video removes
  it from the library and project player while leaving the project page intact.
- `published_at` controls newest-first website chronology. True YouTube upload
  dates are separate metadata; absence of a verified upload date never causes
  the website timestamp to be presented as YouTube's upload date.
- Home/About select their required published entries through `getPageVideo`.
  Directus owns their names and descriptions. About's September 21, 2026
  `published_at` records its new library admission, not its historical first use
  on the About page. YouTube upload dates use the existing batched build lookup;
  missing optional metadata never starts a runtime metadata fetch.
- These supporting placements emit an initial player iframe and matching
  `VideoObject` with an embed URL, omitting `contentUrl` because YouTube watch
  pages are not video-byte URLs. Playback preserves muted viewport autoplay,
  looping and reduced-motion click activation. Their player starts paused until
  activation. Dedicated watch-page eligibility is not implied.
- Projects and videos share the private `.generated/projects.json` artifact.
  Save CMS changes, complete a successful build, and deploy it to publish.
  The library, player lookup, resources API, project players, and video sitemap
  have no ISR, runtime CMS refresh, or WordPress fallback. Revalidation cannot
  publish CMS changes. YouTube playback itself remains an external service.
- Keep `legacy_ids`, `youtube_id`, and
  `scope_key` automation-owned. Existing GraphQL IDs and `project-<slug>` aliases
  keep shared links working independently of later project changes. Video sitemap freshness uses `date_updated` with `published_at` as fallback.
- Archive metadata remains in the `/video-library` `website_pages` record.
  Sharing from the player copies the stable library selection URL. Eligible
  project cards retain their project link; the modal keeps its existing layout.
- Canonical video constraints live in `docs/video-model-invariants.sql`;
  `scripts/setup-video-schema.mjs` maintains the supported schema. Home/About placement stays in
  code while video metadata comes from the deployment snapshot. Truck body copy
  and both videos stay code-owned; its images use the static-media snapshot.

## Publishing SonShine people in Directus

- Directus is the only frontend source for the ten approved profiles.
  WordPress person queries and fallback images are intentionally not supported.
- The approved order is Nathan Borntreger, Bob, Josh, JB, Jeremy K., Tara, Mina,
  Michael, Erick, and José. Antonio, Tony, Angela, Dean, Steve, and Matthew are
  explicitly excluded and must not be recreated by the migration script.
- `show_on_team` defaults to true. `noindex` defaults to true globally; keep it
  false for approved profiles that should be publicly indexable. Records still
  require the correct
  SonShine client, slug, display name, role, biography, sort value, and described
  profile image.
- `bio` allows only paragraphs, H2–H4 headings, links, bold/italic emphasis,
  ordered/unordered lists, list items, and line breaks. The frontend sanitizer
  is authoritative; images, media, tables, code, classes, IDs, colors, inline
  styles, scripts, and arbitrary source HTML are unsupported.
- Person SEO is stored explicitly in Directus, including the independently
  reviewed focus keywords. Display name/role, cleaned biography text, and the
  described profile image remain fallback sources only.

## Publishing sponsor features in Directus

- Published records are client-scoped and sorted by `sort`, then `title`.
  Homepage and location-page partnership cards have no WordPress fallback.
- Each record requires `slug`, `title`, restricted `description` HTML, and a
  logo with a non-empty Directus file description. Optional website, Facebook,
  and Instagram fields must use absolute HTTP(S) URLs.
- `service_areas` relates sponsors to canonical areas through `sponsor_service_areas`.
  Location selection uses these relations and direct approved neighbors; legacy
  `service_area_slugs` is retained for compatibility through verification. The
  homepage keeps its existing ordered partnership selection.
- `description` allows paragraphs, links, bold/italic emphasis, ordered or
  unordered lists, list items, and line breaks. The frontend sanitizer removes
  images, unsafe links, classes, styles, scripts, and unsupported markup.
- The partnership heading and introductory copy remain code-owned. Directus
  changes use the build-driven content path and require a new site build to
  appear publicly.

## Publishing roofing glossary terms in Directus

- Directus is the only frontend glossary source; there is no WordPress fallback.
- Every record requires the SonShine client, `status`, a client-scoped URL-safe
  `slug`, `title`, restricted `definition` HTML, and database-maintained
  `scope_key`.
- Keep `noindex=true` on every glossary term. The `/roofing-glossary` archive
  remains indexable through its separate `website_pages` record, while the
  glossary sitemap emits only terms whose own `noindex` value is false.
- `definition` allows paragraphs, links, bold/italic emphasis, inline code,
  superscript/subscript, ordered/unordered lists, list items, and line breaks.
  Images, headings, tables, classes, IDs, styles, scripts, and arbitrary source
  markup are unsupported; the frontend sanitizer is authoritative.
- Directus `date_updated` is the authoritative freshness timestamp for any
  glossary term that is later made indexable and emitted in the sitemap.

## Publishing special offers in Directus

- `eyebrow` and `introduction` are required for published offers. Drafts may be
  incomplete. Both are plain text, shared by the offer hero and featured popup;
  the hero displays the full introduction without truncation. The eyebrow appears
  above the title. Keep dollar amounts in `discount` to avoid duplicate editing.
- `description` is WYSIWYG Offer Details, rendered above the coupon form. Use
  paragraphs, bold/italic emphasis, ordered/unordered lists, and safe links. The
  offer sanitizer follows the restricted FAQ formatting contract; images,
  headings, tables, styles, scripts, and unsafe links are removed during capture.
  SEO fallbacks and Offer JSON-LD use parser-derived plain text, while explicit
  SEO fields retain precedence. The existing metadata length limits do not limit
  visible hero copy.
- Each offer page shows the latest eligible published review from the existing
  Google feed, selected at build time, with attribution and a source link. The
  page's license and founding-year reassurance comes from site settings.
- Coupon forms retain first name, last name, email, phone, and separate project
  and marketing SMS choices. Either No choice is valid. The website requests an
  emailed coupon and discloses sales follow-up; the existing lead router owns CRM
  creation and email delivery. Its acknowledgment precedes those actions.
- Successful requests use the existing `/thank-you` route with the heading
  "Your coupon is on the way", inbox/spam guidance, and the follow-up reminder.
  The website does not claim that the email has already been delivered.
- Set `status=published` to make an offer routable.
- Set `featured=true` to make an unexpired offer eligible for the sitewide popup.
- Popup route suppression is code-owned in
  `components/lead-capture/special-offer/SpecialOfferPopup.tsx`; Directus cannot
  override the excluded lead, legal, review, offer, or confirmation routes.
- New offers default to `noindex=true`; editors may turn indexing on. The stored
  toggle alone controls robots metadata and special-offer sitemap inclusion.
  Expiration disables the claim form and featured-popup eligibility, but does
  not override indexing.
- Use `featured_image.description` for image alt text and `legal_disclaimer` for disclaimer copy.
- Special-offer content is build-only. Static paths and sitemap entries enumerate
  the complete published inventory with verified pagination. Publish a new site
  build for Directus changes to reach the public offer route or its sitemap entry.

## Publishing legal copy in Directus

- Edit `legal_copy.privacy_policy` and `legal_copy.terms_of_use` with the WYSIWYG editor.
- Use semantic HTML without classes, IDs, inline styles, scripts, or event-handler attributes.
- Begin body headings at `h2`; the Next.js page shell owns the primary `h1`.
- `/privacy-policy` consumes `privacy_policy`; `/sms-terms-and-conditions` consumes `terms_of_use`.

## Glossary linking

- Term pages auto-link other terms in the content body (first occurrence per term).
- Avoid keyword stuffing; links are budgeted to prevent overlinking.

## Images

- For brand images, prefer Next.js `Image` component where possible.
- Prefer the described `site_settings.default_og_image` for shared Open Graph
  fallbacks. [SEO.md](SEO.md) is the canonical guide for the tracked local
  fallback asset and its cache-versioned metadata URL.

## Schema tooling

- Files under `docs/*.sql` are privileged Directus database migration and
  verification artifacts, not local setup commands. They may depend on
  already-applied database state and require explicit Directus write approval.
- `docs/directus-route-owner-invariants.sql` is the canonical shared
  client/route scope-key invariant for fixed pages, services, posts, offers,
  people, and glossary terms.
- One-time import, date-normalization and enrichment scripts are retired.
  Historical migration reports are evidence only. Use current package commands
  and the canonical model SQL; see [cleanup status](docs/migration-cleanup.md).

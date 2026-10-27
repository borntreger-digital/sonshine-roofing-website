# Deployment Runbook

## Current production: Cloudflare Workers

Verified October 27, 2026 after the owner-authorized DNS switchover.
`sonshine-roofing-website` serves `sonshineroofing.com` and
`www.sonshineroofing.com` through enabled production Custom Domains, with version
previews disabled. The original cutover application version was
`91f4d275-7fb0-41df-888f-79c4baf23f87`. Cloudflare manages the two proxied website
DNS records. The integration preview remains separate and unchanged.

The apex is canonical. HTTPS www redirects to HTTPS apex in the Worker. The
zone's single redirect rule `sonshine_website_https` upgrades HTTP on exactly
these two hostnames directly to HTTPS apex, preserving paths and query strings.
Its reviewed definition is `workers/production-https-rule.json`; it is a zone
rule, not automatically deployed by `cf deploy`. The zone-wide HTTPS setting
and unrelated rules were not changed. Keep this rule when rebuilding the Worker.
The production domain declarations are recorded in `cloudflare.config.ts` and
are omitted from preview configuration. This config-only cutover update did not
rebuild or modify the retained application artifact.

Run `node scripts/verify-vinext-live.mjs` for safe live acceptance. It verifies
HTTP/HTTPS canonical redirects, indexing, all 448 packaged routes, ten sitemaps,
real image resizing/cache and rejected form requests. It never sends a valid
lead or QuickQuote submission. Native forms verify Turnstile server-side before
n8n forwarding. The browser received a real Turnstile token on the live contact
page; successful production lead delivery was not exercised. Owner acceptance
of analytics is recorded; QuickQuote remains owner testing.

The original deployable release, frozen content and source archive are retained
privately in `.cloudflare/retained/production-20261027-91f4d275/`. The recovered
Workers source is now the release source for GitHub `main`. See
`docs/vinext-feasibility.md` for the migration history and checks.

### GitHub and Workers Builds

The connected repository is `borntreger-digital/sonshine-roofing-website`, branch
`main`, root `/`. Use these commands in Workers Builds:

- Build: `npm run build:vinext`
- Deploy: `npm run deploy:cloudflare`

The locked `cf` CLI deploys the verified `.cloudflare/output/v0/` artifact with
`--prebuilt`. This project uses `cloudflare.config.ts`; do not substitute the
older `npx wrangler deploy` command. `npm run build` and the Docker validation
remain available for the historical Next.js application and compatibility checks.

Configure `DIRECTUS_URL` and `DIRECTUS_CLIENT_SLUG=sonshine-roofing` as build
variables and `DIRECTUS_TOKEN` as an encrypted build secret. Optional
`YOUTUBE_API_KEY` enrichment is also a build secret. Production public settings
include `NEXT_PUBLIC_ENV=production`, `NEXT_PUBLIC_BASE_URL` and
`NEXT_PUBLIC_SITE_URL` set to `https://sonshineroofing.com`, the production
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and the existing `NEXT_PUBLIC_GTM_ID`,
`NEXT_PUBLIC_META_PIXEL_ID` and `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`. Do not enable
isolated-preview flags for production. Build settings are separate from runtime
bindings. Keep the four existing runtime secret bindings `N8N_WEBHOOK_URL`,
`N8N_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY` and `ALLOWED_ORIGIN`; do not copy them
into the build environment. Preserve the Images and Assets bindings.

Every ordinary Workers build runs the existing prebuild checks, captures fresh
CMS content, produces the Worker artifact and checks that private build inputs
are absent from it. Run `npm run verify:vinext-runtime` against that artifact for
isolated route, image and synthetic lead checks. CI's
`npm run verify:vinext-releases` exercises two synthetic releases and rollback
without CMS credentials. After the authorized main push, verify the corresponding
Workers build and deployment and run `node scripts/verify-vinext-live.mjs`.

### Cloudflare recovery

WEB-VPS and Coolify were retired on October 27, 2026. The former origin is no longer a recovery target.

For an authorized rollback:

1. Pause Workers Builds and wait for any in-progress deployment to finish. Select the
   accepted prior version of the production `sonshine-roofing-website` Worker,
   not the separate integration preview or legacy redirect Worker.
2. Match the version to its reviewed source and sealed content. Verify that its
   Images/Assets bindings and lead-delivery configuration remain compatible
   with the current external services before selecting **Rollback** in the
   Worker's **Deployments** tab.
3. Keep apex/www Custom Domains, DNS and the scoped HTTP-to-HTTPS rule in place.
   Confirm the selected version is active, then run
   `node scripts/verify-vinext-live.mjs`. Successful lead delivery and QuickQuote
   submissions require separate authorization.
4. Correct or revert source in a new reviewed commit before resuming automatic
   builds. A fresh `npm run build:vinext` captures current CMS content; rebuilding
   an older commit does not reproduce its previous content snapshot.

See [Cloudflare rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
The synthetic `verify:vinext-releases` check covers local release/rollback
behavior; it does not establish a rehearsed remote Worker rollback. This
frontend procedure does not restore Directus data or external media. Retain
referenced media and keep CMS recovery within its separately authorized OPS-VPS
backup procedure.

## Environments

- `NEXT_PUBLIC_ENV=production` enables production behavior.
- Any other value, including the conventional `staging`, is non-production.

## Application environment variables

The table describes application inputs. The [Workers Builds section](#github-and-workers-builds)
owns production build variables and runtime secret bindings; a key listed here
is not an instruction to add it to both environments. The retained Dockerfile
is for local/CI compatibility checks, not an active Coolify deployment.

| Key                                 | Application use                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ENV`                   | Build-time environment gate; use `production` for production.                    |
| `NEXT_PUBLIC_BASE_URL`              | Public site origin used during the build.                                        |
| `NEXT_PUBLIC_SITE_URL`              | Fallback public-site URL; prefer `NEXT_PUBLIC_BASE_URL`.                         |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`    | Public form widget configuration, baked into the build.                          |
| `NEXT_PUBLIC_GTM_ID`                | Public GTM ID, baked into the build.                                             |
| `NEXT_PUBLIC_META_PIXEL_ID`         | Public Meta Pixel ID, baked into the build.                                      |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Public map embed configuration, baked into the build.                            |
| `DIRECTUS_URL`                      | Build-time CMS endpoint.                                                         |
| `DIRECTUS_CLIENT_SLUG`              | Build-time tenant scope.                                                         |
| `DIRECTUS_TOKEN`                    | Server-only build credential.                                                    |
| `YOUTUBE_API_KEY`                   | Optional server-only metadata enrichment during the build; currently configured. |
| `N8N_WEBHOOK_URL`                   | Runtime lead-delivery endpoint.                                                  |
| `N8N_WEBHOOK_SECRET`                | Runtime lead-delivery credential.                                                |
| `TURNSTILE_SECRET_KEY`              | Runtime form-token verification credential.                                      |
| `ALLOWED_ORIGIN`                    | Runtime comma-separated browser-origin allowlist.                                |

`NEXT_PUBLIC_ENABLE_GTM_PREVIEW` is a preview-only option.
It permits analytics on an allowed non-production host when Directus also
enables site analytics. Keep its Docker build argument for those builds.

The standalone application reads its sealed content bundle and needs no
Directus credential or YouTube metadata request to serve it. Public build
values require a new build when changed. Runtime lead-delivery configuration
must remain available through the production Worker bindings.

WordPress connection/authentication, sitemap-preview and revalidation keys are
retired from the application configuration. The Dockerfile no longer passes WordPress or
sitemap-preview arguments. Sitemaps remain disabled outside production in this
configuration. The retained `/api/revalidate` compatibility endpoint returns
401 for GET and POST without a configured secret and never invalidates content.
Publish CMS changes with a successful build and deployment.

## Local Docker compatibility checks

The committed Dockerfile is retained for local and CI compatibility checks.
Production uses Workers Builds as documented above. Docker checks require a
BuildKit secret named `build_env`, containing
`DIRECTUS_TOKEN` and optionally `YOUTUBE_API_KEY` in dotenv format. Its loader
imports only those two keys into the build subprocess. Do not configure private
credentials as Docker build arguments. Public URLs, tenant scope and
`NEXT_PUBLIC_*` values remain ordinary build arguments. Runtime webhook and
Turnstile secrets remain runtime configuration only.

Every publishing run must supply a **new** nonsecret `CONTENT_BUILD_ID`, even
when rebuilding the same Git commit after a CMS edit. Use a deployment/run ID
plus attempt, not only a commit SHA. This changes the content-capture layer's
cache key; BuildKit secret contents alone do not invalidate caches. Alternatively,
run the builder stage with `--no-cache-filter builder`, still supplying the ID.

Example inputs (values are read from the existing protected build environment):

```sh
docker buildx build --secret id=build_env,src=/protected/build.env \
  --build-arg CONTENT_BUILD_ID="$DEPLOYMENT_RUN_ID" \
  --build-arg DIRECTUS_URL --build-arg DIRECTUS_CLIENT_SLUG \
  --build-arg NEXT_PUBLIC_ENV=production --build-arg NEXT_PUBLIC_BASE_URL \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY --build-arg NEXT_PUBLIC_GTM_ID \
  --build-arg NEXT_PUBLIC_META_PIXEL_ID --build-arg NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY .
```

Use the required secret mount and fresh content-capture ID for credentialed
Docker checks. A build-argument-only integration is insufficient; never expose
the private credentials as build arguments. Docker image retention is not the
production recovery path.

The manual `Credentialed Docker validation` workflow uses the same Dockerfile
and `--secret` contract without pushing an image. It requires the protected
`SONSHINE_BUILD_ENV` GitHub secret and matching public repository variables;
those settings must be provisioned separately. Pull-request checks use synthetic
content and require no credentials. Never run a privileged credentialed build
for an untrusted pull-request revision.

## Lead delivery (n8n)

- Set `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, and `TURNSTILE_SECRET_KEY` in
  staging and production. Use `ALLOWED_ORIGIN` for the comma-separated browser
  origin allowlist.
- [OPS.md](OPS.md) is the canonical public ingress and normalized v2 payload
  contract. Keep deployment values here and payload semantics there.

## Static sitemap (pages not in CMS)

- [SEO.md](SEO.md) is the canonical robots and sitemap behavior reference.
- Generated at build by `scripts/make-static-sitemap.mjs` → `public/__sitemaps/static-routes.json`.
- `/sitemap_index/static` is prerendered from that local, sealed manifest.
- If empty:
  - Confirm prebuild ran (visible in build logs "Wrote N static routes").
  - Confirm `proxy.ts` passes `^/__sitemaps/` and `^/sitemap_index` through
    unchanged; only the listed legacy paths should redirect or return 410.
  - Check `NEXT_PUBLIC_ENV`: sitemap endpoints intentionally return 404 in
    the current non-production configuration.

## Security headers and CSP

- next.config.mjs adds security headers for all requests.
- CSP is read from `site_settings.content_security_policy` and enforced with `Content-Security-Policy`.
- Production builds fail when Directus is unavailable, the client record is not unique, or CSP is empty.
- If scripts fail after a release, check browser console CSP violations first.
- `/instant-quote` embeds QuickQuote with contractor id `d9d4c0ba-e0cc-4f1c-a12e-5c30d9b2ce8d`.
- QuickQuote CSP dependencies:
  - Loader/runtime scripts: `qq.leadsbyquickquote.com`, `storage.googleapis.com`
  - API hosts: `quickquote-api-628343900656.us-central1.run.app`, `quickquote-api-223492134056.us-central1.run.app`, `quickquote-api-78479757910.us-central1.run.app`
  - Runtime dependencies: Google reCAPTCHA, Google Fonts, jsDelivr CSS, and possible HTTPS media assets.
- QuickQuote submissions are bridged into `lead_form_submitted` and `ads_lead_submit` dataLayer events as roof replacement conversions.

## Cache and invalidation

- Every Directus-owned surface uses the deployment bundle described in
  [CONTENT.md](CONTENT.md#deployment-only-publishing-contract). Build-only loaders
  use uncached, fully paginated reads; runtime adapters do not fetch CMS records.
- Content pages and sitemap handlers use `revalidate = false`; CMS detail routes
  use `dynamicParams = false`. The blog resource API searches the packaged posts.
  The static sitemap reads its packaged manifest locally during prerendering.
- Both `/api/revalidate` methods reject authenticated calls with 410 and an
  instruction to build/deploy. Missing or incorrect credentials receive 401.
  There are no runtime path, tag, or layout invalidations.
- `npm run build` captures, validates and seals the content bundle, builds Next,
  and checks the generated prerender manifest. Docker copies all private
  `.generated` artifacts and public build artifacts into the standalone image.
  Node startup validates the bundle hashes before serving requests.
- Run `npm run verify:deployment-builds` for two synthetic production builds with
  shared build caches. Each build is followed by both TypeScript 7 and compatibility
  TypeScript 6 checks in the same isolated root, including its generated Next route
  declarations and validators. The tests verify changed/new/removed content across releases,
  cold restarts, no runtime network reads, complete page inventories and fail-closed
  bundle validation. CI runs this without CMS credentials.
- For Workers release acceptance, use the build/runtime/live checks in
  [GitHub and Workers Builds](#github-and-workers-builds). For local standalone
  compatibility, `NEXT_PUBLIC_ENV=production npm run build` followed by
  `npm run verify:deployment-runtime` checks an isolated Next artifact with
  production sitemaps enabled; it does not deploy or verify the production Worker.
- After an authorized main push, verify the successful Workers build, active
  version and source commit. Check its sealed content, public routes,
  metadata, blog resource results, sitemaps and unknown-slug 404s. Compare content
  hashes with the reviewed candidate, accounting explicitly for commit-based
  static-sitemap timestamps and any intervening CMS edits.
- Failed builds leave the current deployment intact. Use [Cloudflare recovery](#cloudflare-recovery)
  to restore an accepted version with its matching content; rebuilding an old
  Git commit against today's CMS is not a content rollback.
- Existing remote-media delivery and clock-based behavior remain documented
  exceptions. Keep old media files and upload new replacements under new IDs.
- Retired webhook callers may receive 410. Do not change production n8n workflows
  as part of this frontend contract; separately authorized integration changes
  can adopt deployment-based publishing.

## Project releases and rollback

- Before a production release, use Node 24.22.1 to run `npm ci`, lint, the project and
  applicable verification scripts, and a credentialed `npm run build:vinext`. Preview
  that production build locally and check detail pages, full galleries, filters,
  pagination, videos, testimonials, SEO, and project/image/video sitemaps. Rebuild
  if content or code changes after verification.
- `scripts/generate-project-snapshot.mjs` runs before route validation and Next's
  build. It pages through every published, client-scoped project and managed
  list and explicitly expands all ordered gallery entries. Missing configuration,
  empty projects, invalid relations, missing image descriptions, or failed CMS
  reads stop the build and remove any stale project snapshot.
- Publish the verified revision through the Workers Builds pipeline. Project edits and new slugs stay
  invisible until that release; `/api/revalidate` cannot publish them.
- Keep the prior Worker version and its referenced media until acceptance.
  Rebuilding old source must remain compatible with the current CMS schema;
  a Worker rollback restores its sealed frontend snapshot, not the database.
  Follow [Cloudflare recovery](#cloudflare-recovery); database recovery belongs
  to a separately authorized OPS-VPS operation.
- Future uploads use the active Unified Image pipeline. File-description metadata
  remains independent of binary optimization; preserve rights and attribution.
- Canonical scope triggers remain in `scripts/sql/roofing-project-scope.sql`.
  Editorial date rules are in `docs/editorial-date-invariants.sql`. Apply privileged
  SQL only under explicit schema-change authorization, with the owning schema and
  tests verified first. One-time import/date-normalization commands are retired.

## llms.txt

- `scripts/generate-llms-txt.mjs` writes `public/llms.txt` verbatim from `site_settings.llms_txt` during prebuild.
- Empty or whitespace-only CMS content removes/skips the generated file.
- `public/llms.txt` is generated and gitignored; edit the Directus field rather than the build artifact.

## Analytics

- GTM and Meta Pixel render together only when Directus
  `site_settings.enable_site_analytics` is enabled, both public IDs are set, the
  browser host matches the configured site origin, and the environment is
  production or `NEXT_PUBLIC_ENABLE_GTM_PREVIEW` is enabled.
- This repository loads GTM but does not configure GA4. Validate GA4 and SPA
  route-change tracking in the external GTM/GA4 control plane.
- [docs/gtm-datalayer.md](docs/gtm-datalayer.md) is the canonical browser event,
  conversion-value, and deduplication reference.

## Production smoke checks

- Before promoting a build:
  - App boots and `/robots.txt` returns 200.
  - `/`, `/contact-us`, `/sitemap_index`, `/sitemap_index/static`, one Directus
    blog post, and one Directus-backed location hub render.
  - The production www and HTTP hostnames redirect to HTTPS apex through the
    existing Cloudflare rule.
  - Legacy redirects and configured 410 routes still behave correctly.
  - A deprecated static landing-page URL returns 404 without redirecting.
  - `/api/revalidate` returns 401 for GET and POST with the current secret-free
    configuration, without invalidating content.
  - An explicitly authorized synthetic lead submission verifies Turnstile and
    reaches n8n.
- After promotion:
  - TLS is valid on apex and `www`.
  - Production `robots.txt` allows crawling.
  - Static assets have long-lived cache headers.
  - `/api/*` responses are not cached.
  - GTM, Meta Pixel, maps, reviews, and external scripts load without CSP errors.

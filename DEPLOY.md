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

### Rollback to the retained Coolify site

The original Coolify container remains running and healthy at `187.77.18.204`,
with unchanged image and start time. Direct-origin HTTPS with the website Host
and TLS SNI still returns apex 200 and www 308. Preserve the application,
container, image, runtime settings and storage until the owner retires them.

1. Confirm the retained origin still passes trusted HTTPS using
   `curl --resolve sonshineroofing.com:443:187.77.18.204 https://sonshineroofing.com/`
   and the equivalent www request. Inspect Coolify health before changing traffic.
2. Detach only the apex and www Custom Domains from `sonshine-roofing-website`.
   Do not remove the legacy wp/next domains or any other Worker mappings.
3. Restore the two saved website DNS records: apex `A` → `187.77.18.204`, www
   `CNAME` → `sonshineroofing.com`, both **proxied**, TTL **Auto** (`1`). Exact
   pre-cutover metadata is retained privately in `logs/cutover-before.json`.
4. Keep the scoped HTTP-to-HTTPS rule; it works with the proxied Coolify origin
   too. Verify public TLS, apex 200, www/HTTP redirects, pages and form rejection
   after restoration. No rollback was performed during acceptance.

The DNS-only/Vercel instructions below are historical and are superseded by this
recovery procedure. Remote Worker-version rollback has not been rehearsed.
Before syncing website source, account for any retained Coolify GitHub build
trigger so an automatic build does not replace the preserved rollback image.
For the October 27 recovered-source main push, the owner explicitly chose to
leave SonShine's existing automatic-deployment trigger enabled. Check the actual
retained image after that push; do not assume the earlier image is still running.

## Historical Coolify deployment configuration

- Deployment target:
  - One production Coolify application.
  - GitHub App source, branch `main`.
  - Build pack: Dockerfile.
  - Exposed port: `3000`.
  - Health check path: `/robots.txt`.
  - Domains:
    - `https://sonshineroofing.com`
    - `https://www.sonshineroofing.com`
- Runtime:
  - The Docker image uses Next standalone output and runs `node server.js`.
  - Container defaults:
    - `NODE_ENV=production`
    - `HOSTNAME=0.0.0.0`
    - `PORT=3000`
- Legacy Cloudflare cutover notes:
  - These describe the original hosting migration. Confirm the current DNS and
    rollback targets outside this repository before using them as instructions.
  - Keep records DNS-only, not proxied.
  - Point apex `A` record to the Coolify server IPv4.
  - Point `www` to the apex with a `CNAME`, or use a matching `A` record.
  - Lower TTL before production cutover.
  - Ensure ports `80` and `443` reach Coolify/Traefik for Let's Encrypt.
- Legacy rollback:
  - The original migration plan kept Vercel live until Coolify passed smoke
    checks and used DNS for rollback.
  - Do not assume Vercel remains a valid DNS rollback target without external
    verification.

## Environments

- `NEXT_PUBLIC_ENV=production` enables production behavior.
- Any other value, including the conventional `staging`, is non-production.

## Coolify environment variables

Verified against Coolify key names and flags on September 22, 2026: production
has the 15 keys below. Preview has the same keys plus the GTM preview flag.
Coolify currently marks every configured key for both build time and runtime;
the table describes where the application consumes each value.

| Key | Application use |
| --- | --- |
| `NEXT_PUBLIC_ENV` | Build-time environment gate; use `production` for production. |
| `NEXT_PUBLIC_BASE_URL` | Public site origin used during the build. |
| `NEXT_PUBLIC_SITE_URL` | Retained origin fallback; prefer `NEXT_PUBLIC_BASE_URL`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public form widget configuration, baked into the build. |
| `NEXT_PUBLIC_GTM_ID` | Public GTM ID, baked into the build. |
| `NEXT_PUBLIC_META_PIXEL_ID` | Public Meta Pixel ID, baked into the build. |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Public map embed configuration, baked into the build. |
| `DIRECTUS_URL` | Build-time CMS endpoint. |
| `DIRECTUS_CLIENT_SLUG` | Build-time tenant scope. |
| `DIRECTUS_TOKEN` | Server-only build credential. |
| `YOUTUBE_API_KEY` | Optional server-only metadata enrichment during the build; currently configured. |
| `N8N_WEBHOOK_URL` | Runtime lead-delivery endpoint. |
| `N8N_WEBHOOK_SECRET` | Runtime lead-delivery credential. |
| `TURNSTILE_SECRET_KEY` | Runtime form-token verification credential. |
| `ALLOWED_ORIGIN` | Runtime comma-separated browser-origin allowlist. |

`NEXT_PUBLIC_ENABLE_GTM_PREVIEW` remains configured only for preview builds.
It permits analytics on an allowed non-production host when Directus also
enables site analytics. Keep its Docker build argument for those builds.

The standalone application reads its sealed content bundle and needs no
Directus credential or YouTube metadata request to serve it. Public build
values require a new build when changed. Runtime lead-delivery configuration
must remain available to the deployed container.

WordPress connection/authentication, sitemap-preview and revalidation keys are
retired from the Coolify setup. The Dockerfile no longer passes WordPress or
sitemap-preview arguments. Sitemaps remain disabled outside production in this
configuration. The retained `/api/revalidate` compatibility endpoint returns
401 for GET and POST without a configured secret and never invalidates content.
Publish CMS changes with a successful build and deployment.

## BuildKit secret migration (required before deploying this branch)

The committed Dockerfile requires a BuildKit secret named `build_env`, containing
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

**Rollout dependency:** configure the owning Coolify builder to deliver this
secret mount and a fresh capture ID before merging/deploying the Docker change.
A build-argument-only integration is insufficient. Validate its generated Docker
command in a nonproduction build; if the installed Coolify version cannot expose
BuildKit secrets, use a supported external image-build pipeline before rollout.
No Coolify configuration is changed by this maintenance PR. Keep the current
image for rollback; restoring that complete image also restores its content.

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
- If something breaks after the Coolify cutover, check browser console CSP violations first.
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
- For release acceptance, use Node 24.22.1, run all applicable `verify:*` checks, then
  `NEXT_PUBLIC_ENV=production npm run build` and
  `npm run verify:deployment-runtime`. The latter requires production sitemaps to
  be enabled in the build and runs an isolated copy of the standalone artifact.
- After an authorized main push, verify the successful Coolify deployment and
  running image commit. Check its bundle and prerender manifests, public routes,
  metadata, blog resource results, sitemaps and unknown-slug 404s. Compare content
  hashes with the reviewed candidate, accounting explicitly for commit-based
  static-sitemap timestamps and any intervening CMS edits.
- Failed builds leave the current deployment intact. Roll back by restoring the
  prior complete application image with its matching bundle; rebuilding an old
  Git commit against today's CMS is not a content rollback.
- Existing remote-media delivery and clock-based behavior remain documented
  exceptions. Keep old media files and upload new replacements under new IDs.
- Retired webhook callers may receive 410. Do not change production n8n workflows
  as part of this frontend contract; separately authorized integration changes
  can adopt deployment-based publishing.

## Project releases and rollback

- Before a production release, use Node 24.22.1 to run `npm ci`, lint, the project and
  applicable verification scripts, and a credentialed `npm run build`. Preview
  that production build locally and check detail pages, full galleries, filters,
  pagination, videos, testimonials, SEO, and project/image/video sitemaps. Rebuild
  if content or code changes after verification.
- `scripts/generate-project-snapshot.mjs` runs before route validation and Next's
  build. It pages through every published, client-scoped project and managed
  list and explicitly expands all ordered gallery entries. Missing configuration,
  empty projects, invalid relations, missing image descriptions, or failed CMS
  reads stop the build and remove any stale project snapshot.
- Deploy the verified revision through Coolify. Project edits and new slugs stay
  invisible until that release; `/api/revalidate` cannot publish them.
- Keep the prior deployment and its referenced media until acceptance. A frontend
  rollback must match the database schema; old images that request retired columns
  cannot be rebuilt against the reduced schema. Restore a compatible revision or
  recover the matching database through the existing VPS backup system.
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

## Coolify smoke checks

- Before promoting a build:
  - App boots and `/robots.txt` returns 200.
  - `/`, `/contact-us`, `/sitemap_index`, `/sitemap_index/static`, one Directus
    blog post, and one Directus-backed location hub render.
  - `www.sonshineroofing.com` redirects to `sonshineroofing.com` once both domains point at Coolify.
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

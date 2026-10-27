# Live vinext deployment on Cloudflare Workers

Status: production DNS cutover completed October 27, 2026. Both website
hostnames now serve `sonshine-roofing-website`. WEB-VPS and Coolify were retired
on October 27; [DEPLOY.md](../DEPLOY.md#cloudflare-recovery) owns current recovery. The owner will test QuickQuote separately. The owner recovered the
accidentally pruned `sonshine-roofing-vinext` worktree and authorized promoting
this release to GitHub `main`. The recovered migration is reconciled with
`981fe1e`, preserving the newer roof-repair landing-page grid edit. The current
build and deployment instructions are in `DEPLOY.md`; the observations below
record the earlier cutover and review.

## Production cutover acceptance

[Open the live site](https://sonshineroofing.com/). The existing reviewed Worker
version `91f4d275-7fb0-41df-888f-79c4baf23f87` remains active at 100%. The two
production Custom Domains are enabled with version previews disabled. Cloudflare
replaced only apex/www DNS with managed proxied Worker records; all 20 unrelated
DNS records, nine prior custom domains, Worker routes, runtime bindings and
integration-preview version remain unchanged.

Live verification passed 448 packaged routes, ten sitemaps, trusted TLS,
canonical/indexing checks, private-file and 404/410 behavior, three actual image
formats at 384 pixels with edge cache hits, and safe native-form rejection.
Desktop and mobile contact-page checks show no horizontal overflow or visible
broken images. Client navigation worked after dismissing the existing offer
popup, and Turnstile issued a real token. No successful production lead was sent.

Two independent reviewers found that Coolify had supplied HTTP-to-HTTPS
redirection outside the app. This cutover initially lost that behavior. The
scoped Cloudflare Single Redirect in `workers/production-https-rule.json` now
sends HTTP apex/www directly to HTTPS apex with 308, preserving path/query.
Both reviewers independently verified the correction; no remaining material
findings. The zone-wide HTTPS setting and unrelated routing were preserved.
Production-only domain declarations were added to `cloudflare.config.ts` for
future builds, and the live verifier now asserts HTTP redirects. No application
rebuild was needed for these routing changes.

Browser network evidence confirms GTM, Meta pixel and Ahrefs script/event
responses; Google Ads requests receive HTTP 200 before Chrome's known abort
labels. No application exceptions or CSP violations appeared on the privacy-page
analytics probe. Homepage/contact provider diagnostics include a blocked Meta
fallback form and Turnstile iframe messages; normal pixel delivery and Turnstile
token issuance succeed. No policy was broadened to suppress those diagnostics.
Owner analytics acceptance is complete; QuickQuote and successful production
native-lead delivery remain outside this acceptance.

At the initial cutover, the original Coolify container's identity, image, start
time and health were unchanged and direct-origin HTTPS passed. That temporary
retention ended with the October 27 retirement; the former DNS rollback
procedure is obsolete. The frozen application artifact remains
under `.cloudflare/retained/production-20261027-91f4d275/`; routing/config evidence
is separate from that immutable application release.

Evidence: `logs/cutover-before.json`, `cutover-boundary-after.json`,
`cutover-https-result.json`, `cutover-live.log`,
`cutover-browser-analytics-evidence.json`, `cutover-browser-layout.log`, and
`output/playwright/cutover-contact-{desktop,mobile}.png`.
Run `node scripts/verify-vinext-live.mjs` for repeatable checks with rejected
form probes only. GitHub source commits/pushes/merges and QuickQuote submissions
were not performed.

## Historical preparation and preview evidence

The sections below record verification before the live cutover. Their earlier
DNS and production-boundary statements describe that phase, not current hosting.

## Separate production Worker — pre-cutover verification

[Browse the production snapshot](https://sonshine-roofing-website.borntregerdigital.workers.dev).
Worker: `sonshine-roofing-website`. Version:
`91f4d275-7fb0-41df-888f-79c4baf23f87` after the independent review correction. Cloudflare reported 17 ms startup;
this is not request CPU or a traffic benchmark.

The build uses `NEXT_PUBLIC_ENV=production`, the existing production public keys
and a fresh read-only CMS snapshot. It contains no preview flags, notice,
sandbox delivery configuration or preview widget. The existing live Turnstile
and n8n secrets were copied through protected temporary inputs to this Worker's
runtime secret bindings. Native lead validation still runs in `/api/lead` before
n8n delivery. `ALLOWED_ORIGIN` permits only the apex and www; the existing origin's
localhost allowance was not copied. No source-server configuration changed.

The production response wrapper appends only the Ahrefs origin to the existing
script, script-element and connection directives. The shared CMS policy and
ordinary Next/Coolify build remain unchanged. The integration preview retains
the same allowance and was not redeployed.

The temporary workers.dev hostname sends noindex, disallows crawlers and rejects
native lead submissions, including the trailing-dot hostname spelling and even
with a forged production Origin header. Encoded
non-route variants return 404. These host-specific restrictions do not apply to
apex/www. The exact artifact was tested locally under production URLs: normal
robots/sitemaps, no preview notice/header, www canonical redirect and synthetic
lead success/failure validation passed. No production lead or QuickQuote
submission was sent. Production credentials are installed, but end-to-end live
lead delivery from Workers still needs controlled acceptance at switchover.
Analytics remains gated to the production hostname; use the existing integration
preview for pre-cutover event checks. Owner analytics acceptance is complete.

Hosted acceptance passed all 448 prerendered routes, ten sitemaps, private-file
and 404/410 checks, three image formats with actual 384-pixel output and edge
cache hits, Ahrefs CSP allowance and temporary-host form rejection. Lint, both
TypeScript versions, Tailwind and artifact checks passed. All 22 DNS records,
Worker routes, custom domains and the preview version matched their prior state.
The original container's identity, image, start time and health were unchanged;
the live CSP hash was identical. Cloudflare readback confirms production mode,
Images/assets bindings and all four runtime secret bindings.

The deployable artifact and frozen CMS snapshots are retained privately under
`.cloudflare/retained/production-20261027-91f4d275/`, together with an archive of
the local source. The preceding cb1ae1e5 release remains retained separately.
Keep these directories private and Git-ignored. Temporary files
containing build credentials and runtime secrets were deleted after deployment.
The prior preview artifact is retained at the location recorded in
`logs/production-retained-preview-path.txt`.

Validation evidence: `logs/production-build.log`, `production-runtime.log`,
`production-hosted.log`, `production-deploy.log`, `production-boundary-after.json`,
`production-origin-after.json`, and `production-live-response.json`.
Run `node scripts/verify-vinext-production.mjs` against the current production
artifact for the safe hosted checks; it sends only blocked empty lead requests.

At that stage, the next step was to authorize apex/www attachment and verify TLS, redirects,
indexing and controlled native lead delivery immediately afterward. The owner
will test QuickQuote after switchover. The temporary Coolify rollback window
was later closed; remote Worker-version rollback was not rehearsed in this stage. No GitHub source push,
commit or merge was performed in this task.

## Independent review follow-up

Two owner-requested review agents independently checked deployment isolation
and runtime/regression coverage. The deployment review found that a trailing
DNS dot on the workers.dev hostname bypassed the temporary-host classification.
Read-only GET probes demonstrated missing noindex/crawler exclusion and the
lead handler's normal 405 instead of the intended 421; no valid lead was sent.
The hostname classification now removes the terminal DNS dot. A regression
failed against the preceding artifact and passes against the corrected build,
covering homepage/robots noindex, crawler exclusion and lead GET rejection.

The runtime review independently matched all 1,748 retained artifact files,
checked source-map correspondence, and passed the 448-route artifact suite.
Its recommended production indexing assertions now explicitly require root
crawling to be allowed, forbid a root-wide robots disallow, and reject noindex
homepage robots/googlebot meta tags. Historical CSP wording was corrected:
Workers preserve all existing policy sources/directives and add Ahrefs; the
live Coolify policy is unchanged. The rebuilt release uses the identical sealed
content snapshot and retains the existing production secret bindings.

The correction was deployed only to the separate production Worker as version
`91f4d275-7fb0-41df-888f-79c4baf23f87`. Both reviewers independently accepted the
fix: the runtime reviewer tested normal/dotted host restrictions and unaffected
production indexing with zero outbound calls, and the deployment reviewer
confirmed the hosted dotted homepage/robots/lead GET behavior plus Cloudflare
version, secret-binding and domain/DNS/preview preservation. No blocker remained
from their findings. The final hosted sweep again passed all 448 routes, ten
sitemaps and image/cache checks. Source stays local for the owner's GitHub pass.
Evidence is in `logs/review-trailing-dot-before.log`, `review-build.log`,
`review-runtime.log`, `review-hosted.log`, `review-deploy.log` and
`review-boundary-after.json`. No live lead or QuickQuote submission was sent.

## Hosted preview

[Open the preview](https://sonshine-roofing-vinext-proof.borntregerdigital.workers.dev).

Worker: `sonshine-roofing-vinext-proof`. Current preview version:
`402ac267-2662-4742-8a18-d9227feb6ce2`. Updated October 27 local time.
Cloudflare reported 23 ms startup, which is
not request CPU usage or a production traffic benchmark. The prior initial
preview version `8dd1427f-0b08-4c7a-9fb4-f68a45c62284` is retained for rollback.

The build sets `NEXT_PUBLIC_ISOLATED_PREVIEW=1`,
`NEXT_PUBLIC_PREVIEW_INTEGRATIONS=1` and `NEXT_PUBLIC_ENV=preview`.
It displays a bottom notice, returns `X-Robots-Tag: noindex, nofollow, noarchive`,
disallows crawlers and disables ten sitemaps. Production canonicals remain.
The preview is publicly accessible; search-engine exclusion is not authentication.

### Native website forms: verified

The separate real Turnstile widget permits exactly this preview hostname. Its
secret and the sandbox webhook credentials are runtime Cloudflare secrets and
were absent from the build artifact. Origin, size, honeypot, field and SMS
validation remain enabled. Delivery requires `SONSHINE_PREVIEW_DELIVERY=sandbox`
and the exact URL `https://n8n.borntregerdigital.com/webhook/sonshine-workers-preview`;
any other receiver fails closed. There is no production fallback.

The owner selected **Test Data Generation Sandbox**. A separate authenticated
webhook/validator/acknowledgment branch was added and published before testing.
The five original manual-review nodes, connections and settings were preserved.
This branch has no CRM, email, NocoDB or child-workflow delivery.

One synthetic contact form passed real Turnstile in the in-app browser, reached
the thank-you page, and completed sandbox execution `873246` with zero validation
errors and `downstreamDelivery=false`. Its v2 field/type shape matches successful
native Website Lead Router executions `853006`, `846982` and `832335`; optional
campaign attribution was preserved. Customer values and raw execution payloads
were not copied into the repository. The production router's version and graph
were verified unchanged. Headless Chrome was rejected by Turnstile with 600010;
the successful in-app-browser test did not bypass or mock CAPTCHA.

### QuickQuote: rendered; vendor CAPTCHA hostname remains blocked

The vendor loader passes contractor identity at the top level, but its current
core widget ignores that when creating the form. The wrapper now fetches the
public configuration with the exact contractor ID, validates that identity,
loads the vendor core with automatic rendering off, and passes the configuration
through the supported `verticalOptions.configOverride`. The same path handles
client navigation and remounts. The original invalid-contractor error is resolved.

Desktop and 402-pixel mobile checks show all five fields, no horizontal overflow,
and a successful navigate-away/Back remount. The vendor requests were GET only,
with no failed QuickQuote requests or JavaScript exceptions. No field was filled
and no QuickQuote submission was sent.

**Not a complete QuickQuote acceptance pass:** the rendered vendor reCAPTCHA
shows “Invalid domain for site key” on workers.dev. QuickQuote's reCAPTCHA owner
must permit this exact preview hostname (or provide an approved preview embed)
before its verification can pass here. No vendor configuration, CAPTCHA bypass,
DNS change or live-site edit was made. Do not submit QuickQuote during this test.

### Analytics: owner-confirmed; preview diagnostic history

GTM and Meta IDs match the live site's public JavaScript. Analytics is enabled
only on the exact preview origin with explicit integration/preview flags, while
retaining the CMS enablement gate. A static client environment reference fixes
the preview flag that previously prevented loading. GTM and Meta scripts load,
and GTM's queue is initialized; event-firing acceptance belongs to the owner's
Tag Manager session.

October 27 analytics follow-up: the preview-only Ahrefs fix is deployed in the
version above. The response wrapper adds only `https://analytics.ahrefs.com` to
existing `script-src`, `script-src-elem` and `connect-src` directives, at that time only for the
exact isolated integration-preview origin. The later separate production Worker
also applies this allowance; shared CMS, live Coolify and GTM stay unchanged. This allows Ahrefs' public script and
its `/api/event` collector without replacing or loosening other directives.

The captured-policy regression and artifact runtime checks preserve every existing
source/directive, including duplicates, while allowing the approved Ahrefs origin
in the Workers releases. The live Coolify policy remains unchanged. Chrome
verification on the hosted preview received 200 for both
`analytics.js` and `/api/event`, with no CSP errors, on both the minimal privacy
page and the original Instant Quote page. WebKit also loaded Ahrefs.
All 448 hosted routes and image checks pass. Final readback confirmed unchanged
DNS, routes, custom domains and existing preview bindings, and an identical
production CSP hash. Cloudflare retained the existing runtime secret bindings;
no secrets were re-exported for this upload.

The Google Ads abort investigation reproduced on `/privacy-policy` without forms,
QuickQuote or navigation. Chrome's protocol records show all three `/ccm/collect`
and `/rmkt/collect` requests received HTTP 200 before `net::ERR_ABORTED`. Temporary
browser instrumentation showed `no-cors`, `keepalive: true`, no AbortSignal, no
AbortController call, three fulfilled opaque responses and zero rejected fetches.
WebKit also fulfilled all three as opaque responses. This supports a browser
network-reporting artifact rather than a failed request; it does not establish
why Chromium internally emits that cancellation or prove Ads attribution. No Ads
transport, consent setting or tag-container code was changed or suppressed.
The owner subsequently confirmed analytics is working.

References: [Ahrefs CSP guidance](https://help.ahrefs.com/en/articles/10631520-troubleshooting-ahrefs-web-analytics-snippet-isn-t-found-on-your-website)
and the [Fetch standard's opaque responses](https://fetch.spec.whatwg.org/#concept-filtered-response-opaque).

### Final verification and reproduction

All 448 hosted routes, ten sitemap exclusions, private-file/404/410 checks,
WebP/AVIF/JPEG resizing and cache hits pass. Lint, both TypeScript compilers,
Tailwind checks, artifact-only runtime delivery/failure guards, and two synthetic
production releases followed by rollback pass. The rollback verifier's fake
receiver now compares normalized URLs, including a trailing slash.

All 22 zone DNS records, production Worker routes and account custom domains
matched the earlier snapshot. Existing Turnstile widgets were unchanged. The
live apex still returns 200 and www redirects to the apex. Source remains local;
the primary checkout's pre-existing landing-page edit is untouched.

For the integration preview, supply the real public preview widget key and current
public analytics IDs through the environment, plus the read-only CMS build file:

```sh
NEXT_PUBLIC_ISOLATED_PREVIEW=1 \
NEXT_PUBLIC_PREVIEW_INTEGRATIONS=1 \
SONSHINE_PREVIEW_ORIGIN=https://sonshine-roofing-vinext-proof.borntregerdigital.workers.dev \
SONSHINE_BUILD_ENV_FILE=/path/to/local-build.env npm run build:vinext
node scripts/verify-vinext-runtime.mjs
node node_modules/cf/bin/cf deploy --dry-run --prebuilt --provision=false
```

The default isolated build without the integrations flag retains disabled
QuickQuote/analytics and public test CAPTCHA/discarded native submissions.
Integration deployment requires the three runtime secrets through a protected
secrets input. Verify exact Worker name, origin, sandbox receiver and no custom
routes before an authorized `cf deploy --prebuilt --provision=false`.
The hosted verifier rejects dummy CAPTCHA tokens; real acceptance is separate.

## Result

The production build uses vinext 1.3.1 and retains all 448 prerendered routes,
895 immutable HTML/RSC/metadata cache entries, and ten sitemap handlers. Content
is captured from Directus at build time and packaged privately. Workers never
query the CMS for page content. Public media remains on the existing CMS origin.

The Cloudflare CLI's `deploy --dry-run --prebuilt --provision=false` check passes.
It reports approximately 4.18 MiB of Worker code / 1.13 MiB gzip. These figures describe the earlier production-mode dry run. The hosted preview
measurement above supersedes them for the deployed preview.
There are approximately 1,041 asset files; the largest is a 5.03 MB PDF. These
are below the current published Workers Paid limits of 100,000 files and 25 MiB
per file. See [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/).

The compatibility scanner still reports 81%: 21 supported, two partial, four
unsupported. The four imports are in the existing Next-only video verifier,
not site code. Image behavior is covered by the adapter below; Next type
regeneration preserves the existing typed-link checks. The original Next
production build and its 460-route runtime sweep passed in the initial phase.

## Images

The Vite-only `next/image` adapter in `workers/image.tsx` keeps vinext's loading,
blur, ref and completion behavior but generates responsive optimization URLs
for remote images and fill images. It preserves dimensions, focal-point styles,
alt text, priority preloads, and explicit unoptimized/SVG handling. The normal
Next build continues to use its original image component.

vinext 1.3.1's optimization endpoint accepts local source paths only. The Worker
adds a bounded remote-source fetch using the same configured host allowlist,
validates each redirect, strips browser credentials and limits source streams
to 20 MiB. It uses the Cloudflare Images binding and vinext's transform validation
and image response headers. Widths use vinext/Next's configured defaults; quality
is restricted to 75. No dependency source files are patched.

The Cache API stores variants separately by source, size, quality, negotiated
format and content release digest. Browser cache lifetime is one hour; edge
lifetime is one day. GET and HEAD share the same cached representation. Changing
the frozen content release changes image URLs and cache keys. No KV or R2 cache
is required.

The isolated runtime verifier checks real decoded image widths for WebP, AVIF
and JPEG, repeat cache hits, source allowlisting, private-source rejection,
redirect rejection, non-image responses, size limits, credential stripping,
invalid transformation parameters, and HEAD responses. The local Images emulator
proves resize/format plumbing; its quality and encoding are not identical to
Cloudflare's production service. The hosted preview now verifies real transforms
and cache hits as described above. Account-level billed usage was not inspected.

## Dependency advisory

[GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98)
affects malformed ZIP64 extraction in fflate's `unzipSync`. The dependency chain
was vinext → @vercel/og → satori → fflate 0.7.3. Static triage found no application
entry point to that function: the site does not use ImageResponse/OG generation,
Satori imports `inflateSync`, and those packages were absent from Worker source
maps. That was not evidence of an exploitable site vulnerability in this revision.

A scoped `satori > fflate: 0.7.5` override now selects the patched maintenance
release, also deduping Satori's font parser onto it. `npm ci` succeeds and the full
`npm audit` reports zero vulnerabilities. Vite is pinned to patched 8.3.5. No
pre-existing main-branch package version was changed. The Cloudflare Vite plugin
and cf CLI remain beta releases, pinned by the lockfile.

## Browser evidence

Playwright exercised the production artifact in isolated Chrome desktop and
WebKit mobile sessions. Screenshots and command evidence are in the Git-ignored
`output/playwright/` directory.

- Homepage images, desktop service menu and client navigation to Contact.
- Project material filtering, clearing, browser Back restoring filters, and
  navigation to the matching project; the gallery opens, advances and closes.
- Blank contact-form validation and synthetic success in both browsers, with
  SMS consent, campaign attribution and the thank-you page preserved.
- Financing budget changes update the displayed estimates.
- Video cards open the expected privacy-enhanced embed and Escape unmounts the
  player after its closing animation; playback itself uses a local placeholder.
- Nine mobile pages: home, replacement, contact, blog, projects, videos, Sarasota,
  financing and glossary. No horizontal overflow or JavaScript exceptions; fonts
  and visible images loaded. Screenshot samples were visually inspected.
- Special-offer dismissal and existing synthetic offer/landing-conversion checks.

Browser tests replace CAPTCHA and lead delivery locally. Analytics remain gated
off on localhost. Third-party map, video and QuickQuote services are not treated
as live integration passes. WebKit reports non-fatal unused preload warnings for
some fonts/chunks. These are not hydration failures.

## Build and runtime checks

- Clean install, full dependency audit, lint, TypeScript 7 and compatibility
  TypeScript 6, Tailwind utility verification, and the compatibility scanner.
- Production build, sealed snapshot validation, prerender inventory, private-file
  isolation, and a scan ensuring actual private build input values are absent
  from all Workers output.
- Artifact-only runtime sweep: all 448 pages, ten sitemaps, resource APIs, redirects,
  404/410 handling, static assets, RSC and synthetic lead validation, origin,
  honeypot, CAPTCHA, delivery failure and retry paths.
- Two synthetic content builds A and B, then rollback to retained A, in a separate
  temporary source tree. Changed content and redirects, new routes and removed
  routes all behaved correctly. This used no CMS credentials or requests and did
  not replace the real candidate. It proves local artifact rollback, not a remote
  Cloudflare version rollback.
- Archive controls, special-offer flow and landing conversion verifiers.

## Reproduce

Use Node 24.22.1 and npm 12.2.1. Run `npm ci`.
Supply the protected content-capture environment through the process environment,
a Git-ignored `.env`, or `SONSHINE_BUILD_ENV_FILE` pointing to an existing protected
file. The wrapper reads only allowlisted keys in memory. Required build inputs:

- `DIRECTUS_URL`, `DIRECTUS_CLIENT_SLUG`, `DIRECTUS_TOKEN`; `YOUTUBE_API_KEY` when
  the existing content capture requires it.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_GTM_ID`,
  `NEXT_PUBLIC_META_PIXEL_ID`. Missing public integration settings fail the build.
- `NEXT_PUBLIC_ENV=production`; canonical base/site URLs default to
  `https://sonshineroofing.com`. Other public settings are listed in the wrapper.

The tested GTM and Meta values were verified against the live site's publicly
served JavaScript. Private runtime lead credentials are removed from build
inputs. CMS credentials are removed before Vite starts.

```sh
npm run build:vinext
npm run verify:vinext-runtime
npm run verify:vinext-analytics-policy
npm run verify:vinext-releases
npm run lint
npm run typecheck
npm run typecheck:compat
npm run verify:tailwind-utilities
npm audit
node node_modules/cf/bin/cf deploy --dry-run --prebuilt --provision=false
```

Vite and Next both write `.next/types/routes.d.ts`; the build wrapper regenerates
Next's declarations after Vite. Do not run the two builds concurrently in one
checkout. After `dev:vinext`, stop it and run Next's `typegen` before Next checks.

The deployable artifact is `.cloudflare/output/v0/`, not `dist/client` or a public
upload of the whole checkout. Keep its server code, source maps and snapshots
private. Preview locally with:

```sh
MINIFLARE_REGISTRY_PATH=/private/tmp/sonshine-vinext-registry \
  npm run start:vinext -- --host 127.0.0.1 --port 4179
```

## Historical preview-stage boundary

The separate production Worker is deployed without custom domains or routes;
production cutover remains separately authorized. Production lead/CAPTCHA
configuration and build separation are complete. Controlled production-host
integration acceptance, request CPU/traffic observation and a remote version
rollback check remain. Analytics is owner-confirmed, and the owner accepted
QuickQuote verification after switchover. This stage retained previous
artifacts and frozen snapshots and deferred host retirement. The later October 27
retirement supersedes that boundary; current recovery uses Cloudflare versions.

The integration task updated the named preview Worker, created its separate Turnstile widget,
published the selected sandbox listener, and updated the shared context. It did not change DNS, production routes,
custom domains, CMS content, production secrets, hosting plans or the live frontend.

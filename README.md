# SonShine Roofing

Production-facing Next.js application for SonShine Roofing. It owns the public
site, lead capture, attribution and consent, SEO, structured data, sitemaps, and
the frontend adapters and deployment snapshots for Directus.

## Architecture

- The Next.js application runs through vinext on Cloudflare Workers. The
  standalone Docker path is retained for local/CI compatibility checks.
- Directus is the primary content platform. It owns shared site content, fixed
  page and service SEO, blog posts, FAQs, people, roofing glossary terms,
  sponsor features, projects, videos/categories, reviews and review-carousel settings, special
  offers, legal copy, navigation, and published CMS redirects.
- Directus owns the five location hubs through the deployment snapshot; see
  [release evidence](docs/location-release-20260917.md). Legacy media URLs use
  Directus assets or the compatibility Worker at `wp.sonshineroofing.com`;
  the frontend no longer needs a WordPress installation or its environment keys.
- Home/About placement stays in code; video metadata and static images come
  from deployment snapshots. Truck body copy and both videos stay code-owned;
  truck images use the static-media snapshot.
- Next.js configuration and `proxy.ts` retain code-owned platform redirects and
  normalized legacy redirect/410 behavior.
- `POST /api/lead` validates public form submissions, verifies Turnstile, and
  forwards the normalized v2 payload to n8n.

See [CONTENT.md](CONTENT.md) before changing content ownership or CMS behavior.

## Local development

Use Node 24.22.1 and npm 12.2.1 and install the locked dependency tree.
Dependency scripts must have an exact-version review in `allowScripts`; `.npmrc`
fails installs with unreviewed scripts. The pinned toolchain is enforced by npm:

```bash
npm ci
npm run dev
```

`npm run dev` first runs the CMS-backed prebuild. Provide the Directus variables
described in [DEPLOY.md](DEPLOY.md) before startup; the prebuild validates route
ownership and regenerates the ignored static-sitemap and `llms.txt` artifacts.
Do not put secrets in public variables or commit local environment files.

## Validation

```bash
npm run lint
npm run typecheck
npm run typecheck:compat
npm run verify:tailwind-utilities
npm run verify:archive-controls
npm run verify:video-playback
```

`npm test` currently aliases lint. Run the relevant additional `verify:*`
command from `package.json` when changing a sanitizer, SEO rule, or
cache/revalidation contract. Use `npm run build` for full confidence when the
credentialed CMS environment is available; `npm run build:codex` supplies the
sandbox fetch proxy when that contract is needed.

All Directus content uses one sealed deployment bundle: project/video, location,
static-media and editorial snapshots, plus sitemap and `llms.txt` artifacts.
Prebuild captures and validates the complete inventories. Runtime pages, metadata,
archives and APIs read only those packaged files. Required failures stop the
candidate build; runtime has no CMS fallback. New slugs, edits and unpublishing
require a successful build and deployment. See [CONTENT.md](CONTENT.md).

Run `verify:editorial-pipeline` and `verify:deployment-contract` for source and
capture checks. `verify:deployment-builds` builds two isolated synthetic releases,
reuses build caches, and tests the standalone servers with outbound requests
blocked and Directus credentials absent. It needs Node 24.22.1 and installed dependencies,
not CMS access. `npm run build` also verifies the generated prerender manifest.
After a credentialed production-mode build, run `verify:deployment-runtime` to
exercise its packaged routes, APIs, RSC responses, revalidation rejection and cold
restart. These checks are distinct from the narrower adapter fetch-policy check.

## Archive controls

Projects, blog posts, and videos share a native single-selection search form.
Editing fields changes only draft values; Search applies every field together,
updates the URL, and restarts pagination. Clear all immediately resets the form
and results. Browser Back/Forward restores applied searches. Legacy URLs with
multiple values keep the first valid option per filter and display a notice.
Unrelated query parameters, including shared-video links, are preserved.

Option lists stay fixed and omit facet counts. Video categories can overlap,
while the public selector still selects one category at a time. Material and
location filters can combine with any category; they match context inherited
from a published related project. The deployed snapshot supplies matching,
distinct totals, category counts, and pagination.

`verify:archive-controls` runs the actual shared React controller in JSDOM with
synthetic results and a substituted Next navigation hook. It covers submission,
reset, request races, retry, history, legacy links, and the
shared accordion's readable fallback when animations cannot run. It needs no CMS
credentials. Also check native controls, layout, focus, Enter submission, and
reduced motion in a browser when changing this UI.

Video playback and the share bar follow the `v` query parameter. Open/close
handlers update that parameter once while preserving archive filters; restoring
a link or using Back/Forward does not write history. Links accept video slugs
and legacy IDs. A compact playback catalog from the page's existing content
reads resolves shared videos beyond the first result page.
The share controls sit inside the active player dialog so they remain reachable
by pointer and keyboard while playback is open.

`verify:video-playback` renders the actual video route, archive, grid, and modal
in JSDOM using Next's bundled React. It substitutes CMS/network calls, navigation,
and animation rendering to check the client script warning, sharing, history,
pagination, deep links, dismissal, and repeated visits. Browser checks must also
include navigation from another route; a direct page load alone missed the
original inline-script failure.

## Repository guides

- [docs/editorial-dates.md](docs/editorial-dates.md): publication and modification rules.
- [docs/migration-cleanup.md](docs/migration-cleanup.md): retired artifacts and preserved compatibility.
- [docs/media-provenance.md](docs/media-provenance.md): retained image approvals and rights evidence.
- [CONTENT.md](CONTENT.md): content ownership, Directus authoring rules, and
  publication behavior.
- [DEPLOY.md](DEPLOY.md): Workers Builds, application inputs, Cloudflare recovery,
  cache behavior, and deployment smoke checks.
- [OPS.md](OPS.md): public lead ingress and the normalized v2 payload contract.
- [SEO.md](SEO.md): robots, sitemap, metadata, and structured-data behavior.
- [docs/gtm-datalayer.md](docs/gtm-datalayer.md): Google Ads conversion events,
  value mapping, and browser-side deduplication.
- [SECURITY.md](SECURITY.md): private reporting and safe-testing expectations.
- [AGENTS.md](AGENTS.md): repository-specific automation and maintenance rules.

Directus, Cloudflare, n8n, analytics, and production lead
flows are external control planes. Do not mutate or deploy them without explicit
authorization for that action.

See [runtime maintenance](docs/runtime-modernization.md) for the compiler bridge,
CSS/lint compatibility checks and rendering experiment decisions.

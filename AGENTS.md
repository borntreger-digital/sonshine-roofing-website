# Repository purpose

This repository is the production-facing SonShine Roofing Next.js application.
It owns public routes, lead capture, attribution and consent behavior, SEO,
structured data, sitemaps, analytics integration, and Directus content captured
in deployment snapshots. Production runs through vinext on Cloudflare Workers.
Read `DEPLOY.md` before changing build commands, release settings or recovery;
it separates Workers production and recovery from local Docker compatibility checks.

## Sources of Truth

- Read `CONTENT.md` before changing content ownership.
- Directus, scoped by `DIRECTUS_CLIENT_SLUG`, owns blog posts/topics, site
  settings, fixed-page SEO, services, navigation, FAQs, published CMS redirects,
  special offers, legal copy, people, sponsor features, reviews and
  review-carousel settings, roofing glossary terms, projects, videos/categories,
  and their media.
- Directus `roofing_service_areas` owns location routes, verified in the September 17 release. Read `docs/location-contract.md` before location schema changes and `DEPLOY.md` before deployment or recovery, and `docs/location-reviews.md` for manually maintained location reviews and deduplication. Preserve the existing n8n workflow.
- Local Next.js code owns route composition, components, body copy not yet
  migrated, code-only legacy redirect and 410 responses in `proxy.ts`, and the
  normalized operational schedule in `lib/contact-hours.ts`.
- Directus is the exclusive frontend source for blog, person, sponsor-feature,
  roofing-glossary, project, and video records. Do not add a WordPress fallback for those
  areas.
- Directus content described as build-only does not become public until a new
  site build is deployed. Projects and videos share the private generated
  snapshot described in `CONTENT.md`; location/FAQ/navigation content uses its matching location snapshot. Preserve that boundary in runtime APIs,
  players, and mixed-source pages. Video publication is independent of its
  optional project's publication; follow the context visibility rules there.
- Static images, including truck images, use the private build snapshot and
  Directus File Library metadata described in `CONTENT.md`. Home/About video
  metadata uses the shared project/video snapshot. Truck-sale body copy and both
  personal truck videos remain code-owned; preserve its `noindex, nofollow` policy.

## Important Paths

- `app/(site)`: ordinary public routes and shared site layout.
- `app/(standalone)`: isolated standalone experience.
- `app/api`: lead, revalidation, resource, and staging diagnostic boundaries.
- `app/sitemap_index`: sitemap index and content-specific children.
- `components/lead-capture` and `lib/lead-capture`: forms, attribution,
  consent, validation, identifiers, and payload types.
- `lib/content`: Directus adapters, deployment snapshots, shared types and HTML sanitizers.
- `lib/seo` and `lib/telemetry`: metadata/schema and analytics behavior.
- `scripts`: generated artifacts, content verification, and current schema tooling.
- `cloudflare.config.ts`: production Worker domains, assets, Images and runtime
  bindings. `next.config.mjs` and `proxy.ts` retain application routing/headers;
  `Dockerfile` retains local standalone compatibility checks.
- Read `DEPLOY.md` before changing build inputs, runtime bindings or recovery.
  WEB-VPS and Coolify are retired; use accepted Cloudflare versions for rollback.

## Validation

Use Node 24.22.1 and npm 12.2.1; install with `npm ci`. Review new
dependency scripts before adding exact-version `allowScripts` decisions.
Read `docs/runtime-modernization.md` when changing runtime, lint, CSS or compiler
versions; it records compatibility gates and the rendering experiment decisions.

- Baseline: `npm run lint`, `npm run typecheck`, `npm run typecheck:compat`, and
  `npm run verify:tailwind-utilities`; `npm test` is currently an alias for
  lint.
- Editorial date/schema work: run `npm run verify:editorial-dates` and
  `node scripts/location-model/verify-sql.mjs`; read `docs/editorial-dates.md`.
- Sanitizer/SEO work: run the applicable
  `verify:directus-html`, `verify:html-text`, `verify:faq-html`,
  `verify:person-html`, `verify:sponsor-html`, `verify:glossary-html`, `verify:person-seo`,
  `verify:special-offer-indexing`, `verify:build-only-revalidation`,
  `verify:glossary-policy`, `verify:project-pipeline`,
  `verify:directus-fetch-policy`,
  `verify:security-input-handling`, `verify:request-body-limits`, or
  `verify:json-ld` script.
- Workers release: run a credentialed `npm run build:vinext`, then
  `npm run verify:vinext-runtime`. Use `npm run verify:vinext-releases` for
  synthetic release/rollback coverage without CMS credentials.
- Historical Next/Docker compatibility: run a credentialed `npm run build`.
- Sandboxed Codex build: use `npm run build:codex` when its proxy contract is
  required.

Build presteps generate or remove sitemap and `llms.txt` artifacts and can
dirty a worktree. Inspect generated changes and never include them
accidentally. Retired WordPress import commands and their migration-only verifiers were
removed; use the active `verify:*` commands in `package.json`.

## Content, Security, and Privacy

- Preserve tenant scoping, publication checks, described-image requirements,
  and the purpose-built sanitizer for every CMS HTML surface.
- Never render unsanitized CMS HTML or replace parser-based text extraction
  with regular-expression tag stripping.
- Lead routes process contact and referral details, addresses, attribution,
  IP-derived data, SMS consent, and Turnstile tokens. Use synthetic submissions
  only and never log or copy real payloads into fixtures, PRs, or notifications.
- Preserve Turnstile, honeypot, allowed-origin, SMS-consent, lead-ID, and n8n
  authentication behavior when touching lead flow.
- Keep Directus, n8n, Turnstile, and other private credentials server-only.
- Preserve CSP/security headers, analytics
  enablement gates, and safe external URL validation.

## Git and pull-request workflow

- Start from the intended committed `main` revision in an isolated worktree.
  The primary checkout may contain unrelated active work; never import it.
- Keep one focused maintenance branch and draft PR. Exclude user changes,
  generated prebuild output, local environment files, CMS exports, and
  migration artifacts.
- State source-of-truth impact, evidence, checks, limitations, PII/security
  considerations, and deployment impact.
- Review the diff for secrets before pushing. Automated maintenance may push
  and open a draft PR only when its prompt authorizes it; never merge it.

## Deployment Boundary

Directus, Cloudflare, n8n, analytics, revalidation, and production lead
flows are external control planes. Do not mutate, deploy, redeploy, publish,
revalidate production, submit real leads, or run migration apply commands
without explicit authorization for that exact action.

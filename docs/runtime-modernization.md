# Runtime and toolchain maintenance

The October 22, 2026 maintenance branch uses Node 24.22.1 and npm 12.2.1.
`.nvmrc`, npm `devEngines`, CI and the Docker toolchain stage agree. The runtime
image stays on Debian Bookworm and starts Node directly. `.npmrc` fails clean
installs when a dependency script has no recorded decision. The unrs-resolver
postinstall fallback is denied: its platform-specific optional package supplies
the native binary, verified after a clean install. Review each new version before
changing the exact `allowScripts` decision.

## Application and CSS

Next 16.4.2, React/DOM 19.3.1, Sharp 0.35.5 and sanitize-html 2.18.1 contain the
reviewed security fixes. Tailwind 4.3.3 uses `@tailwindcss/postcss` and
`tailwind-merge` 3.7.0. The explicit `@config` in `app/globals.css` retains the
existing typed theme, typography sizes and class-based dark mode. The migration
keeps the former shadow, outline and gradient appearance and handles individual
transform properties in menu transitions and reduced-motion resets.

`verify:tailwind-css` compiles the real stylesheet and checks theme values,
prose, forced-colors focus, class merging and the mobile/desktop card heights.
The last check covers a defect in the automatic upgrader that moved the desktop
height outside its media query. The three ads pages share this migration.
Tailwind 4's browser baseline is Safari 16.4+, Chrome 111+ and Firefox 128+.

A scoped `postcss-selector-parser` 7.1.7 override patches typography's older
transitive dependency. Its parser calls and generated prose output were checked;
the v7 change to insertion iteration does not affect typography's call pattern.
The obsolete Sharp override and unused `@eslint/eslintrc` override are removed.
Snapshot validation now maps the validated filenames to explicitly scoped paths,
avoiding Turbopack's whole-project file tracing while retaining every hash check.
The native Node glob API replaces this project's direct fast-glob uses. Route
inventories and generated sitemaps retain the same exclusion rules.

## Lint and type checking

ESLint 10 uses supported React, import and accessibility replacements. The
contract is covered by `verify:lint-contract` with negative/positive fixtures.

| Previous check                                                    | Current owner                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| React keys, display names and JSX comment text                    | `@eslint-react` explicit rules                                                        |
| Children props and children with inner HTML                       | `@eslint-react` explicit rules                                                        |
| Deprecated DOM rendering APIs                                     | `@eslint-react` DOM rules and React 19 types                                          |
| Class lifecycle/state safety                                      | Function components enforced by `no-class-component`; none existed in the application |
| Duplicate/undefined JSX props or components; string refs          | TypeScript checks, including failing contract fixtures                                |
| JSX variable references                                           | ESLint 10's JSX scope support                                                         |
| Unescaped JSX text                                                | Small local rule preserving the previous check                                        |
| Anonymous default exports                                         | `eslint-plugin-import-x`                                                              |
| All six configured accessibility rules and Next Image alt mapping | `eslint-plugin-jsx-a11y-x`, with failing fixtures for each                            |
| Rules of Hooks and exhaustive dependencies                        | `eslint-plugin-react-hooks`, retaining prior severities                               |

The standard parser handles JavaScript and CommonJS. The private Next Babel
parser is no longer required. The previous disabled prop-types, legacy React
import, unknown-property and external-target checks remain outside this rule set.

`typescript` is the supported `@typescript/typescript6` 6.0.2 compatibility
wrapper, whose locked compiler API is 6.0.3. Existing transpilation verifiers and
Next's language-service/build integration keep that API. The alias
`@typescript/native` supplies TypeScript 7.0.2's `tsc`. Run both `typecheck` and
`typecheck:compat`; generated Next route types are included after a production
build. CI first runs both compilers against the checkout's source. Then
`verify:deployment-builds` runs each compiler again after each synthetic Next
build (releases A and B), in that build's isolated root. It requires nonempty
`.next/types/routes.d.ts` and `.next/types/validator.ts`; the root's `tsconfig.json`
includes these generated declarations and route/page validators. Both compiler
checks disable incremental reuse and share the build's synthetic environment,
so CI covers generated route types without CMS credentials or developer artifacts.

## Rendering experiment decisions

Cache Components and Partial Prefetching remain disabled. Their finite cache
lifetime and lack of `dynamicParams=false` do not preserve the required zero-ISR
and zero-on-demand-fallback contract. The existing sealed snapshot, static
prerender inventory and runtime-network rejection checks remain authoritative.
An architecture change must establish equivalent output and cache guarantees
before changing those invariants.

The follow-up removes all 26 compiler-readiness warnings across 17 components.
Hydration-dependent UI uses a stable external-store snapshot; DOM headings and
the office clock subscribe to external state. Query/route identity resets
pagination and lightboxes, while the estimator, video history and loading states
are derived during render or updated by user/network events. Scroll-lock DOM
operations use browser methods and retain their cleanup. `lint:compiler` now runs
in CI and requires zero warnings without disabling any existing rule.

A scoped stable-compiler trial compiled the real archive component and passed its
10 interaction cases in five runs. Whole-process medians were 569 ms disabled and
822 ms enabled, including compiler/startup overhead. This is not a user-interaction
latency benchmark and does not establish a production performance benefit. The
stable and Rust compilers remain disabled. No demonstrated benefit justifies the
other disk-cache, lazy-import or worker-thread experiments.

## Verification and remaining release checks

The maintenance candidate passed clean npm 12 installation, both compilers,
replacement lint fixtures, the existing synthetic verifier suites, the two-release
production fixture test and a credentialed production Turbopack build. The real
build/runtime test verified 460 routes, RSC/resource results, unknown-slug 404s,
closed inventories, retired revalidation and cold restarts without CMS access.

The prior exception for GHSA-vfj7-8cjw-p6xm was removed during the October 27
Workers source promotion. GitHub withdrew that advisory on October 23 because
it was not practically exploitable:
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm. Fresh complete and production-only
npm audits reported zero vulnerabilities. The audit gate now accepts no advisory
exceptions and fails on any reported finding, inconsistent counts or audit outage.
Its tests include rejection of the former exception if it reappears. No dependency
downgrade, fork or audit-threshold relaxation was used.

The follow-up's production-mode lead verifier uses an isolated receiver and
Cloudflare's documented pass/fail/spent test keys. CI substitutes only the
provider response; `TURNSTILE_LIVE_TEST=1 npm run verify:lead-runtime` exercises
the real test-key endpoint against an already-built standalone artifact. It
checks origins, honeypots, validation, SMS choices, campaign data, retry identity
and downstream errors without real submissions. Browser events retain their
existing conversion deduplication checks, now explicitly included in the CI
`verify:landing-conversions` step. The API deliberately preserves a lead
ID across retry; downstream idempotency remains the existing n8n contract.

Analytics now waits until hydration establishes the actual browser hostname.
This fixes the static-server/localhost host-gate mismatch and prevents provider
scripts on unapproved hosts. Since there is no script execution without
hydration, the client component's noscript fallback is no longer a server-rendered
tracking mechanism. Enabled/disabled/host gates and one-time queue flushing are
covered by `verify:react-readiness`, alongside clock hydration, restored financing
state, reduced-motion scores, heading changes and route-scoped lightboxes. The
project gallery remembers its opening button explicitly, so Safari pointer clicks
restore focus correctly even when the browser did not focus that button on click.

Build-secret setup and the required per-capture cache ID are documented in
[DEPLOY.md](../DEPLOY.md#local-docker-compatibility-checks).
Credentialed local/CI Docker checks require those inputs. Production release and
recovery use the Workers procedure in that guide.

The follow-up also passed 458 public prerendered routes in the committed Linux
image with networking disabled, a private-value scan of image configuration,
history and all layers, and verification that the accepted development dependency
chain is absent from the runtime image. Chromium 155, WebKit 26.6 and Linux
Firefox 157 covered eight routes at 390, 768 and 1440 pixels. Twenty-four frozen
Chromium before/after screenshots had no changed pixels; media was replaced with
deterministic placeholders and tracking requests were blocked for that comparison.
The mobile menu, estimator, form validation and gallery had separate interaction
checks. External media delivery and production provider acceptance still need
release checks.

Deployment remains a separate action. Retain the prior complete image and its
sealed content bundle for rollback. Localhost cannot complete a production-bound
Turnstile challenge; real lead submission, analytics attribution and control-plane
changes are outside these local checks. A browser review must account for the
Tailwind browser baseline and externally loaded maps/video/CAPTCHA behavior.

References: [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide),
[ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0),
[TypeScript coexistence](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/),
[selector parser changelog](https://github.com/postcss/postcss-selector-parser/blob/main/CHANGELOG.md),
[Next security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026).

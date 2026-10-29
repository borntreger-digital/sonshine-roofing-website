# Project color materials

The website Directus model owns each color's `material_type` relationship. The
website publishes that classification in its build snapshot; saving the CMS
does not change a deployed gallery. This tooling is privileged migration work,
not an application startup step.

## Integrity and editor behavior

- `roofing_roof_colors.material_type` is a nullable UUID M2O to
  `roofing_material_types`. Published SonShine colors require a published parent.
  Draft colors can be incomplete. The database captures SonShine's client ID so
  renaming the client's slug does not disable the publication rule.
- Native composite foreign keys enforce color/material and project/material
  tenant agreement and project/color/material agreement. They cover inserts,
  partial updates, imports, parent reassignments and concurrent transactions.
  They also restrict deletion of referenced colors/materials. Project
  `material_type` remains required and `roof_color` remains optional.
- A hidden, generated `material_publication_status` column is an internal
  foreign-key component. It makes publication enforcement work in both
  directions without a lookup-trigger race. It is never a website field.
- Directus keeps its ordinary single-column M2O relationships. Its PostgreSQL
  schema inspector deliberately excludes composite foreign keys, as confirmed
  in [the 11.17.4 source](https://github.com/directus/directus/blob/v11.17.4/packages/schema/src/dialects/postgres.ts).
- The project color picker filters by current client, published status and
  current material. With no material it is read-only. When changing material on
  an existing CMS project, explicitly clear or replace the old color before
  saving; the database rejects an incompatible retained color. This CMS rule is
  separate from the public gallery's automatic draft-color reset.

`schema.mjs` records the intended editor metadata. The existing website reader's
color wildcard was replaced with a list preserving all previous columns plus
`material_type`, excluding the generated key. Other collection grants and all
policy assignments/scopes remain unchanged. Project `job_id` and `zip` remain
private.

## Safe application sequence

1. Obtain explicit authorization for the website Directus target. Read current
   infrastructure/security instructions and use the documented strict SSH
   connection. Do not use the separate Directus PR instance.
2. Capture private recovery images outside Git: color and material identity,
   client/name/slug/status/sort/scope keys; project material/color relationships
   and exact database editorial timestamps; affected Directus field/relation
   metadata; existing constraints; affected permission rows. Do not export
   project private fields, narrative, credentials or entire environment files.
3. Read the complete current inventory across tenants with explicit fields.
   `planBackfill` refuses other-tenant use, unused colors, ambiguous usage,
   unknown references or disagreement with an existing parent. Do not guess.
   Reconcile API dates to the exact PostgreSQL timestamp strings: JSON API dates
   can lose microseconds. Preserve those strings without `Date` reserialization.
4. Run `node scripts/project-color-model/verify-sql.mjs`. It runs synthetic
   PostgreSQL locally through PGlite; it never writes production fixtures.
5. Create the additive field and M2O using `schema.mjs` through Directus. Keep
   the field nullable initially. Do not proceed with a partial migration unless
   the database and permissions paths are already available.
6. Prepare the reviewed private SQL with
   `node scripts/project-color-model/prepare.mjs PRIVATE_INVENTORY PRIVATE_RECOVERY_DIRECTORY`.
   The directory must be outside Git and mode 0700; the output is mode 0600 and
   refuses to overwrite an existing file. Apply that file to the website
   PostgreSQL database with `psql -X -v ON_ERROR_STOP=1`. It locks the three
   tables briefly, checks exact reviewed inventory, backfills only null parents,
   checks dates, installs constraints and replaces the one verified color read
   grant, all in one transaction. A mismatch aborts; refresh/review instead of
   weakening the check. Preserve the applied SQL privately with the before-image.
7. Update project color options/conditions through Directus, mark the generated
   key hidden/read-only, and set the existing project color single-column
   relation to `RESTRICT` for update/delete. Those API schema changes also
   invalidate Directus system caches. Re-read metadata and the effective reader.
8. With the existing private build environment, run
   `SONSHINE_BUILD_ENV_FILE=/absolute/private/.env node scripts/project-color-model/verify-reader.mjs`.
   This verifies direct and nested relationship reads and private-field denial;
   it never prints credentials or records. Its 34/54/3 counts deliberately flag
   changes from this reviewed migration, so revise them only after new inventory
   review. Verify preserved values using exact database JSON before/after images.
9. Inspect unsaved editor create/edit behavior in an existing authenticated
   session when available. Do not create production test records or request
   credentials just for this optional check. A fresh frontend build and runtime
   QA must pass before separately authorized production release.

## Recovery

The prior frontend remains compatible with the additive CMS field and parent
backfill. For a frontend release rollback, retain the CMS classification and
deploy the prior accepted frontend artifact; do not automatically remove the
new model.

To undo CMS work, first obtain the intended rollback authorization, save current
scoped images, and compare current rows/metadata/permissions with the recorded
after-image. Stop on subsequent edits rather than restoring over them. During a
short write window, remove only the five `project_colors_*` constraints, then
their three supporting unique indexes; restore the original project roof-color
FK from the before-image. Restore the one color reader permission row and
project field/relation metadata from their before-images. Remove the generated
field and its metadata only after its publication FK is gone. Keep the ordinary
material field/backfill unless full removal is explicitly intended; if removal
is authorized and no subsequent work depends on it, remove its M2O relation and
field through Directus after archiving the mapping. Never drop shared tables,
restore a whole database, or change other policies. Re-read effective permissions
and confirm the prior website build still succeeds.

## October 29, 2026 execution evidence

Live named website Directus reads and PostgreSQL readback agreed on 54 published
SonShine projects, 34 published colors and three published materials, with no
other-tenant rows in these collections. Each color had exactly one material in
existing usage: Shingle 15 colors/29 projects; Metal 3 colors/6 projects; Tile
16 colors/19 projects. Three metal projects have no color and remain null.

The migration backfilled 34 rows. Five new constraints are validated. All 54
project relationship/client values and exact publication/modification timestamps
are unchanged. All 34 existing color identity/name/slug/client/status/sort/scope
values and all three material records are unchanged. Exactly one permission row
changed, and only its fields list changed. Actual website-reader requests passed
for all 34 parents and 54 nested project links; `job_id`, `zip` and the generated
key were excluded. The new editor filters/conditions and restrictive relations
were confirmed through Directus metadata readback.

The first transaction safely aborted because one API timestamp truncated 107
microseconds. Using the previously captured exact database timestamp resolved
that precision difference; no project date was changed. The regression suite
includes microsecond preservation.

Private recovery files are on OPS under
`/root/sonshine-project-colors-20261029/`, with a working copy under
`/private/tmp/sonshine-project-colors-20261029/` on the Mac. These paths contain
scoped identifiers/metadata and must stay outside Git. Unsaved editor behavior
could not be visually verified: the in-app browser reached Directus sign-in and
had no authenticated editor session. No production synthetic records, service
restart, frontend deployment or unrelated tenant changes were performed.

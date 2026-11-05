# Editorial dates

`published_at` is the original publication date. Editing, unpublishing, republishing,
cleanup and deployment preserve it. Historical corrections are explicit edits.
`modified_at` on blogs, projects and people is maintained by PostgreSQL and read-only
in the editor. Internal audit dates remain separate.

Blogs/projects display Published and Last modified on detail pages, including when
they share a calendar date. Semantic time values retain their timestamp; labels use
America/New_York. The normalized values also drive applicable metadata, blog schema
and sitemaps. Archive cards and other page layouts are unchanged. Person dates are
for sitemap chronology; profiles gain no visible publication field. Person
`how_helps` bullet edits advance only the profile date, not author-linked blogs;
unchanged values preserve dates. The focused additive trigger update is
`scripts/sql/person-how-helps.sql`.

`editorial-date-invariants.sql` compares explicit public scalar fields, topic and
gallery assignments/order, rendered author and taxonomy fields, referenced image
metadata and attached published videos. Moves affect both owners; unrelated records
are untouched. Private job fields, no-op saves, status-only republication, processing
metadata and schema maintenance preserve dates. Immutable media replacements use a
new file identity and relation. Shared navigation and general recommendations do not
make every page newly modified. All changes share their transaction timestamp and
roll back with the transaction.

The September 23 additive backfill preserved exact effective dates for all 109 blog
records, 53 projects and 17 people, including other tenants and nullable drafts.
Initial precedence was blog: source/audit/publication; project: audit/source/publication;
person: source/audit. Every existing record field was compared in the same transaction.
New blog/project records start from publication (nullable for drafts); new profiles
start at creation. Videos and service areas retain audit/publication precedence.

Run `npm run verify:editorial-dates` for isolated PostgreSQL tests; it creates only
synthetic records, with retired columns absent. Deploy both frontend consumers before
removing shared legacy fields. The owning production database must have these fields,
reader permissions and triggers before a build uses this contract. Never use a public
content edit or lead submission as a verification fixture.

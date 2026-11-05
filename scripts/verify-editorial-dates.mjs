import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const schema = JSON.parse(await readFile(new URL('./fixtures/editorial-schema.json', import.meta.url), 'utf8'));
const retired = new Set(['external_id', 'source_updated_at', 'wordpress_location_id', 'wordpress_id']);
for (const [table, fields] of Object.entries(schema)) {
  const columns = fields.filter(({ field }) => !retired.has(field) && !(table === 'roofing_projects' && ['body', 'youtube_url'].includes(field)))
    .map(({ field, type }) => `"${field}" ${type}${field === 'id' ? ' PRIMARY KEY' : ''}`);
  if (['blog_posts', 'roofing_projects', 'persons'].includes(table)) columns.push('modified_at timestamptz');
  await db.exec(`CREATE TABLE ${table} (${columns.join(',')})`);
}
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const original = '2020-01-01T00:00:00.123Z';
const insert = async (table, values) => {
  const fields = Object.keys(values);
  await db.query(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(values));
};
for (const n of [1, 2, 3]) {
  await insert('directus_files', { id: id(100 + n), description: `Image ${n}`, type: 'image/webp', width: 100, height: 100 });
  await insert('persons', { id: id(200 + n), first_name: `Author ${n}`, profile_image: id(100 + n), modified_at: original });
  await insert('blog_topics', { id: id(300 + n), name: `Topic ${n}`, status: 'published' });
  await insert('roofing_material_types', { id: id(400 + n), name: `Material ${n}`, status: 'published' });
  await insert('blog_posts', { id: id(n), title: `Blog ${n}`, status: 'published', published_at: original, modified_at: original, author: id(200 + n), featured_image: id(100 + n) });
  await insert('roofing_projects', { id: id(n), title: `Project ${n}`, status: 'published', published_at: original, modified_at: original, featured_image: id(100 + n), material_type: id(400 + n) });
  await insert('blog_posts_blog_topics', { id: id(n), blog_post: id(n), blog_topic: id(300 + n), sort: n });
  await insert('roofing_projects_files', { id: id(n), roofing_project: id(n), directus_files_id: id(100 + n), sort: n });
}
await insert('videos', { id: id(1), project: id(1), status: 'published', title: 'Published video' });
await insert('videos', { id: id(2), project: id(2), status: 'draft', title: 'Draft video' });
await db.exec(await readFile(new URL('../docs/editorial-date-invariants.sql', import.meta.url), 'utf8'));
// A rerun replaces rules without touching dates.
await db.exec(await readFile(new URL('../docs/editorial-date-invariants.sql', import.meta.url), 'utf8'));
const owners = ['blog_posts', 'roofing_projects', 'persons'];
const dates = async () => {
  const result = {};
  for (const table of owners) for (const row of (await db.query(`SELECT id, modified_at, ${table === 'persons' ? 'NULL' : 'published_at'} AS published_at FROM ${table} ORDER BY id`)).rows) result[`${table}:${row.id}`] = JSON.parse(JSON.stringify(row));
  return result;
};
const baseline = await dates();
let scenarios = 0;
async function scenario(label, sql, expected) {
  await db.exec('BEGIN');
  try {
    await db.exec(sql);
    const after = await dates();
    const changed = Object.keys(after).filter(key => after[key].modified_at !== baseline[key].modified_at).sort();
    assert.deepEqual(changed, expected.map(([table, n]) => `${table}:${id(n)}`).sort(), label);
    for (const key of Object.keys(after)) assert.equal(after[key].published_at, baseline[key].published_at, `${label}: original publication`);
    const transactionTime = (await db.query('SELECT transaction_timestamp() AS now')).rows[0].now.toISOString();
    for (const key of changed) assert.equal(after[key].modified_at, transactionTime, `${label}: transaction time`);
    scenarios++;
  } finally { await db.exec('ROLLBACK'); }
  assert.deepEqual(await dates(), baseline, `${label}: rollback`);
}
await scenario('substantive scalar edit', `UPDATE blog_posts SET title='Revised' WHERE id='${id(1)}'`, [['blog_posts', 1]]);
await scenario('no-op and caller date cannot fake editorial change', `UPDATE blog_posts SET title=title, modified_at=now(), date_updated=now(), sort=98`, []);
await scenario('status-only unpublish/republication preserves dates', `UPDATE blog_posts SET status='draft'; UPDATE blog_posts SET status='published'`, []);
await scenario('draft content edit', `UPDATE blog_posts SET status='draft', body='Revised' WHERE id='${id(1)}'`, [['blog_posts', 1]]);
await scenario('private project housekeeping', `UPDATE roofing_projects SET job_id='synthetic-job', zip='00000', sort=9, date_updated=now()`, []);
await scenario('gallery ordering', `UPDATE roofing_projects_files SET sort=8 WHERE id='${id(1)}'`, [['roofing_projects', 1]]);
await scenario('gallery move touches both parents', `UPDATE roofing_projects_files SET roofing_project='${id(2)}' WHERE id='${id(1)}'`, [['roofing_projects', 1], ['roofing_projects', 2]]);
await scenario('gallery deletion', `DELETE FROM roofing_projects_files WHERE id='${id(1)}'`, [['roofing_projects', 1]]);
await scenario('topic membership move', `UPDATE blog_posts_blog_topics SET blog_post='${id(2)}' WHERE id='${id(1)}'`, [['blog_posts', 1], ['blog_posts', 2]]);
await scenario('topic visibility', `UPDATE blog_topics SET status='draft' WHERE id='${id(301)}'`, [['blog_posts', 1]]);
await scenario('topic admin sort', 'UPDATE blog_topics SET sort=42', []);
await scenario('person responsibilities only touch that profile', `UPDATE persons SET how_helps='[{"text":"Helps the team"}]' WHERE id='${id(201)}'`, [['persons', 201]]);
await scenario('unchanged responsibilities preserve editorial dates', `UPDATE persons SET how_helps=how_helps, modified_at=now()`, []);
await scenario('author name', `UPDATE persons SET first_name='Revised' WHERE id='${id(201)}'`, [['persons', 201], ['blog_posts', 1]]);
await scenario('taxonomy label', `UPDATE roofing_material_types SET name='Revised' WHERE id='${id(401)}'`, [['roofing_projects', 1]]);
await scenario('related file description', `UPDATE directus_files SET description='Revised' WHERE id='${id(101)}'`, [['blog_posts', 1], ['roofing_projects', 1], ['persons', 201]]);
await scenario('file processing/provenance housekeeping', `UPDATE directus_files SET metadata='{"automation_history":[]}', modified_on=now(), filesize=123`, []);
await scenario('published video copy', `UPDATE videos SET description='Revised' WHERE id='${id(1)}'`, [['roofing_projects', 1]]);
await scenario('draft video copy', `UPDATE videos SET description='Revised' WHERE id='${id(2)}'`, []);
await scenario('publish video', `UPDATE videos SET status='published' WHERE id='${id(2)}'`, [['roofing_projects', 2]]);
await scenario('unpublish video', `UPDATE videos SET status='draft' WHERE id='${id(1)}'`, [['roofing_projects', 1]]);
await scenario('move published video', `UPDATE videos SET project='${id(2)}' WHERE id='${id(1)}'`, [['roofing_projects', 1], ['roofing_projects', 2]]);
await scenario('video aliases/audit housekeeping', `UPDATE videos SET legacy_ids='["old-public-alias"]', date_updated=now()`, []);
await insert('blog_posts', { id: id(99), published_at: original, modified_at: '1990-01-01' });
assert.equal((await db.query(`SELECT modified_at FROM blog_posts WHERE id='${id(99)}'`)).rows[0].modified_at.toISOString(), original);
await insert('blog_posts', { id: id(98), status: 'draft' });
assert.equal((await db.query(`SELECT modified_at FROM blog_posts WHERE id='${id(98)}'`)).rows[0].modified_at, null);
await db.close();
console.log(`PASS: editorial dates (${scenarios} PostgreSQL dependency/no-op/rollback scenarios; original publication and draft initialization; no retired columns).`);

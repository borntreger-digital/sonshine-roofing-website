// Synthetic PostgreSQL execution only. No credentials or production requests.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { backfillSQL, planBackfill } from './backfill.mjs';
import { projectColorOptions } from './schema.mjs';

const db = new PGlite();
const key = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [client, other, shingle, metal, otherMaterial, amber, bronze, draft, project] = [1,2,10,11,12,20,21,22,30].map(key);
await db.exec(`
SET TIME ZONE 'UTC';
CREATE TABLE clients(id uuid PRIMARY KEY,slug text UNIQUE NOT NULL);
CREATE TABLE roofing_material_types(id uuid PRIMARY KEY,client uuid NOT NULL REFERENCES clients(id),name text,slug text,status text NOT NULL,sort integer);
CREATE TABLE roofing_roof_colors(id uuid PRIMARY KEY,client uuid NOT NULL REFERENCES clients(id),name text,slug text,status text NOT NULL,sort integer,material_type uuid REFERENCES roofing_material_types(id) ON DELETE RESTRICT);
CREATE TABLE roofing_projects(id uuid PRIMARY KEY,client uuid NOT NULL REFERENCES clients(id),status text NOT NULL,material_type uuid NOT NULL REFERENCES roofing_material_types(id),roof_color uuid CONSTRAINT roofing_projects_roof_color_foreign REFERENCES roofing_roof_colors(id) ON DELETE SET NULL,published_at timestamptz,modified_at timestamptz);
INSERT INTO clients VALUES ('${client}','sonshine-roofing');
INSERT INTO roofing_material_types VALUES ('${shingle}','${client}','Shingle','shingle','published',1),('${metal}','${client}','Metal','metal','published',2);
INSERT INTO roofing_roof_colors(id,client,name,slug,status,sort) VALUES ('${amber}','${client}','Amber','amber','published',1),('${bronze}','${client}','Bronze','bronze','published',2);
INSERT INTO roofing_projects VALUES ('${project}','${client}','published','${shingle}','${amber}','2020-01-01','2020-02-01 00:00:00.123107+00'),('${key(31)}','${client}','published','${metal}','${bronze}','2020-01-02','2020-02-02'),('${key(32)}','${client}','published','${metal}',NULL,'2020-01-03','2020-02-03');
`);
const inventory = {
  materials: [{id:shingle,name:'Shingle',slug:'shingle',sort:1},{id:metal,name:'Metal',slug:'metal',sort:2}].map(x=>({...x,client:{slug:'sonshine-roofing'},status:'published'})),
  colors: [{id:amber,name:'Amber',slug:'amber',sort:1},{id:bronze,name:'Bronze',slug:'bronze',sort:2}].map(x=>({...x,client:{slug:'sonshine-roofing'},status:'published'})),
  projects: [{id:project,material_type:{id:shingle},roof_color:{id:amber}},{id:key(31),material_type:{id:metal},roof_color:{id:bronze}},{id:key(32),material_type:{id:metal},roof_color:null}].map((x,i)=>({...x,client:{slug:'sonshine-roofing'},status:'published',published_at:`2020-01-0${i+1}T00:00:00Z`,modified_at:`2020-02-0${i+1}T00:00:00Z`})),
};
// API date serialization can lose microseconds. The reviewed inventory uses the
// exact PostgreSQL before-image for dates, without parsing through JS Date.
inventory.projects[0].modified_at='2020-02-01T00:00:00.123107+00:00';
assert.deepEqual(planBackfill(inventory), [{id:amber,material_type:shingle},{id:bronze,material_type:metal}]);
assert.throws(()=>planBackfill({...inventory,projects:inventory.projects.slice(1)}), /Unused or ambiguous/);
assert.throws(()=>planBackfill({...inventory,projects:[...inventory.projects,{...inventory.projects[1],id:key(33),roof_color:{id:amber}}]}), /Unused or ambiguous/);
assert.throws(()=>planBackfill({...inventory,colors:inventory.colors.map(x=>({...x,client:{slug:'synthetic-other'}}))}), /Other tenant/);
const before = (await db.query('SELECT * FROM roofing_projects ORDER BY id')).rows;
const preciseBefore=(await db.query('SELECT id,modified_at::text AS value FROM roofing_projects ORDER BY id')).rows;
const sql = backfillSQL(inventory);
await db.exec(sql);
await db.exec(sql); // Reviewed rerun is harmless.
assert.deepEqual((await db.query('SELECT * FROM roofing_projects ORDER BY id')).rows,before);
assert.deepEqual((await db.query('SELECT id,modified_at::text AS value FROM roofing_projects ORDER BY id')).rows,preciseBefore);
await db.exec(`UPDATE roofing_roof_colors SET name='Edited' WHERE id='${amber}'`);
await assert.rejects(db.exec(sql), error=>error.code==='23514');
await db.exec('ROLLBACK');
await db.exec(`UPDATE roofing_roof_colors SET name='Amber' WHERE id='${amber}'`);
const invariants = await readFile(new URL('./invariants.sql',import.meta.url),'utf8');
await db.exec(invariants);
await db.exec(invariants);
await db.exec(`INSERT INTO clients VALUES ('${other}','synthetic-other'); INSERT INTO roofing_material_types VALUES ('${otherMaterial}','${other}','Other','other','draft',1);`);
let rejected=0;
async function rejects(statement) {
  await assert.rejects(db.exec(statement),error=>{assert.ok(['23503','23514','23502','23001','428C9'].includes(error.code),`Unexpected rejection ${error.code}`);rejected++;return true;});
}
await rejects(`UPDATE roofing_projects SET material_type='${metal}' WHERE id='${project}'`);
await rejects(`UPDATE roofing_projects SET roof_color='${bronze}' WHERE id='${project}'`);
await rejects(`UPDATE roofing_projects SET client='${other}' WHERE id='${project}'`);
await rejects(`UPDATE roofing_projects SET material_type=NULL WHERE id='${project}'`);
await rejects(`INSERT INTO roofing_projects VALUES ('${key(40)}','${client}','draft','${metal}','${amber}',NULL,NULL)`);
await rejects(`UPDATE roofing_roof_colors SET material_type='${metal}' WHERE id='${amber}'`);
await rejects(`UPDATE roofing_roof_colors SET client='${other}' WHERE id='${amber}'`);
await rejects(`UPDATE roofing_roof_colors SET material_type=NULL WHERE id='${amber}'`);
await rejects(`UPDATE roofing_roof_colors SET material_type='${otherMaterial}' WHERE id='${amber}'`);
await rejects(`UPDATE roofing_material_types SET client='${other}' WHERE id='${shingle}'`);
await rejects(`UPDATE roofing_material_types SET status='draft' WHERE id='${shingle}'`);
await rejects(`DELETE FROM roofing_material_types WHERE id='${shingle}'`);
await rejects(`DELETE FROM roofing_roof_colors WHERE id='${amber}'`);
await rejects(`INSERT INTO roofing_roof_colors(id,client,status) VALUES ('${draft}','${client}','published')`);
await db.exec(`INSERT INTO roofing_roof_colors(id,client,status) VALUES ('${draft}','${client}','draft')`);
await rejects(`UPDATE roofing_roof_colors SET status='published' WHERE id='${draft}'`);
await db.exec(`UPDATE roofing_roof_colors SET material_type='${metal}',status='published' WHERE id='${draft}'`);
await rejects(`UPDATE roofing_roof_colors SET material_publication_status=NULL WHERE id='${draft}'`);
// Optional color and legitimate atomic material+color changes stay supported.
await db.exec(`UPDATE roofing_projects SET roof_color=NULL WHERE id='${project}'; UPDATE roofing_projects SET material_type='${metal}',roof_color='${bronze}' WHERE id='${project}'`);
// Other tenants keep publication optional; same-client rules still protect links.
await db.exec(`INSERT INTO roofing_roof_colors(id,client,status) VALUES ('${key(23)}','${other}','published'); UPDATE roofing_roof_colors SET material_type='${otherMaterial}' WHERE id='${key(23)}'`);
await rejects(`INSERT INTO roofing_projects(id,client,status,material_type,roof_color) VALUES ('${key(41)}','${client}','draft','${metal}','${key(23)}')`);
// Client slug rename cannot turn off the captured tenant's publication contract.
await db.exec(`UPDATE clients SET slug='sonshine-renamed' WHERE id='${client}'`);
await rejects(`INSERT INTO roofing_roof_colors(id,client,status) VALUES ('${key(24)}','${client}','published')`);
assert.deepEqual(projectColorOptions.filter._and.at(-1),{material_type:{_eq:'{{material_type}}'}});
assert.equal((await db.query('SELECT count(*)::int AS n FROM roofing_projects WHERE roof_color IS NULL')).rows[0].n,1);
await db.exec(`CREATE TABLE directus_policies(id uuid PRIMARY KEY,name text);
CREATE TABLE directus_permissions(policy uuid,collection text,action text,fields text,permissions jsonb);
INSERT INTO directus_policies VALUES ('${key(90)}','Client Access');
INSERT INTO directus_permissions VALUES ('${key(90)}','roofing_roof_colors','read','*','{"client":{"_eq":"synthetic"}}'),('${key(90)}','roofing_projects','read','id,material_type,roof_color',NULL);`);
const permissionsSQL=await readFile(new URL('./reader-permission.sql',import.meta.url),'utf8');
await db.exec(permissionsSQL);
await db.exec(permissionsSQL);
const grant=(await db.query("SELECT fields,permissions FROM directus_permissions WHERE collection='roofing_roof_colors'")).rows[0];
assert.ok(grant.fields.includes('material_type')&&!grant.fields.includes('*')&&!grant.fields.includes('material_publication_status'));
assert.deepEqual(grant.permissions,{client:{_eq:'synthetic'}});
await db.exec("UPDATE directus_permissions SET fields='id,job_id' WHERE collection='roofing_projects'");
await rejects(permissionsSQL);
console.log(`PASS: reviewed backfill, rerun, drift abort, date preservation, optional colors, atomic edits, tenant scope, and ${rejected} invalid database writes rejected.`);
await db.close();

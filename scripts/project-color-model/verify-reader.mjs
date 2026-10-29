// Read-only effective website credential verification. Never logs tokens/data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const source=process.env.SONSHINE_BUILD_ENV_FILE;
assert.ok(source,'SONSHINE_BUILD_ENV_FILE must point to the existing private build environment.');
const env={...parseEnv(await readFile(source,'utf8')),...process.env};
const origin=env.DIRECTUS_URL?.replace(/\/+$/u,'');
const token=env.DIRECTUS_TOKEN || env.DIRECTUS_STATIC_TOKEN;
assert.ok(origin && token && env.DIRECTUS_CLIENT_SLUG==='sonshine-roofing','Expected SonShine reader environment required.');
async function request(path, query={}) {
  const url=new URL(`${origin}/${path}`);
  for(const [key,value] of Object.entries(query)) url.searchParams.set(key,typeof value==='string'?value:JSON.stringify(value));
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
  return {status:response.status,body:await response.json()};
}
const scope={_and:[{client:{slug:{_eq:env.DIRECTUS_CLIENT_SLUG}}},{status:{_eq:'published'}}]};
const colors=await request('items/roofing_roof_colors',{fields:'id,name,slug,client.slug,status,material_type.id,material_type.slug,material_type.client.slug,material_type.status',filter:scope,limit:'-1'});
assert.equal(colors.status,200,'Color relationship read failed.');
assert.equal(colors.body.data?.length,34,'Color inventory changed; review counts.');
for(const row of colors.body.data) {
  assert.equal(row.material_type?.client?.slug,env.DIRECTUS_CLIENT_SLUG,'Color parent tenant mismatch.');
  assert.equal(row.material_type?.status,'published','Color parent unpublished.');
  assert.ok(['shingle','metal','tile'].includes(row.material_type?.slug),'Unexpected material.');
}
const projects=await request('items/roofing_projects',{fields:'id,material_type.id,roof_color.id,roof_color.material_type.id',filter:scope,limit:'-1'});
assert.equal(projects.status,200,'Nested project color relationship read failed.');
assert.equal(projects.body.data?.length,54,'Project inventory changed; review counts.');
for(const row of projects.body.data) if(row.roof_color) assert.equal(row.roof_color.material_type?.id,row.material_type?.id,'Project/color material mismatch.');
assert.equal(projects.body.data.filter(row=>!row.roof_color).length,3,'Null color count changed.');
for(const [collection,field] of [['roofing_projects','job_id'],['roofing_projects','zip'],['roofing_roof_colors','material_publication_status']]) {
  const response=await request(`items/${collection}`,{fields:`id,${field}`,limit:'1'});
  assert.ok(response.status===403 || response.status===200 && response.body.data.every(row=>!(field in row)),`Unexpected reader access to ${field}.`);
}
console.log('PASS: website reader sees 34 parented colors and 54 compatible projects (3 null); job_id, zip and the internal publication key are excluded.');

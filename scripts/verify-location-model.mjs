import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setupLocationSchema, configureNeighborhoodDescription } from './setup-location-schema.mjs';
import { locationSchema, locationRelations, publicProjectFields, publicLocationFields } from './location-model/schema.mjs';
import { planPermissions, applyPermissionPlan, assertReaderProjection, rowScope, prepareRecoveryDirectory, readPermissions } from './location-model/permissions.mjs';

// Synthetic API state, separate from the live CMS and its clients.
const tables = new Map(Object.keys(locationSchema).filter(name => !['roofing_neighborhoods', 'sponsor_service_areas', 'roofing_service_area_neighbors', 'service_area_section_areas'].includes(name)).map(name => [name, []]));
tables.get('roofing_projects').push({ field: 'service_area', type: 'uuid', schema: { is_nullable: false }, meta: { required: true } });
tables.get('navigation_items').push({ field: 'link_type', type: 'string', meta: { options: { choices: [{ text: 'Page', value: 'page' }] } } });
const relations = [];
const writes = [];
let gatePassed = false;
const request = async (route, method = 'GET', body) => {
  if (method !== 'GET') { assert.ok(gatePassed, 'Schema wrote before effective permission gate.'); writes.push({ route, method }); }
  if (route === 'collections') {
    if (method === 'POST') { tables.set(body.collection, structuredClone(body.fields)); return body; }
    return [...tables.keys()].map(collection => ({ collection }));
  }
  if (route === 'relations') { if (method === 'POST') { relations.push(structuredClone(body)); return body; } return relations; }
  const [, collection, name] = route.split('/');
  if (method === 'POST') { tables.get(collection).push(structuredClone(body)); return body; }
  if (method === 'PATCH') { const existing = tables.get(collection).find(row => row.field === name); existing.meta = { ...existing.meta, ...body.meta }; return existing; }
  return tables.get(collection);
};
const dry = await setupLocationSchema(request);
assert.ok(dry.actions.length > 20);
assert.equal(writes.length, 0, 'Default mode must not mutate.');
await assert.rejects(setupLocationSchema(request, { apply: true }), /effective reader/u);
assert.equal(writes.length, 0);
await setupLocationSchema(request, { apply: true, verifyPrivateAccess: async () => { gatePassed = true; } });
assert.equal((await setupLocationSchema(request, { verifyOnly: true })).actions.length, 0);
const appliedCount = writes.length;
assert.equal((await setupLocationSchema(request, { apply: true, verifyPrivateAccess: async () => {} })).actions.length, 0);
assert.equal(writes.length, appliedCount, 'Schema rerun duplicated changes.');
assert.equal(relations.length, locationRelations.length);
assert.deepEqual(locationSchema.reviews.map(row => row.field), ['service_area']);
assert.ok(!publicLocationFields.reviews.some(field => field.startsWith('latest_feed_')));
const photo = locationSchema.roofing_neighborhoods.find(row => row.field === 'image');
assert.equal(photo.schema.is_nullable, true);
assert.ok(photo.meta.note.includes('photo'));
assert.ok(publicLocationFields.roofing_neighborhoods.includes('image'));
assert.ok(publicLocationFields.roofing_neighborhoods.includes('coverage_map'));
// Existing v1 collections receive only the additive photo field and relation.
tables.set('roofing_neighborhoods', tables.get('roofing_neighborhoods').filter(row => row.field !== 'image'));
relations.splice(relations.findIndex(row => row.collection === 'roofing_neighborhoods' && row.field === 'image'), 1);
assert.deepEqual((await setupLocationSchema(request)).actions, ['create field roofing_neighborhoods.image', 'create relation roofing_neighborhoods.image']);
await setupLocationSchema(request, { apply: true, verifyPrivateAccess: async () => {} });
assert.equal((await setupLocationSchema(request, { verifyOnly: true })).actions.length, 0);
tables.get('roofing_projects').find(row => row.field === 'service_area').schema.is_nullable = true;
await assert.rejects(setupLocationSchema(request, { verifyOnly: true }), /Primary project area/u);
tables.get('roofing_projects').find(row => row.field === 'service_area').schema.is_nullable = false;
const mapRelation = relations.find(row => row.collection === 'roofing_projects' && row.field === 'neighborhood');
mapRelation.schema.on_delete = 'SET NULL';
await assert.rejects(setupLocationSchema(request, { verifyOnly: true }), /Deletion drift/u);
mapRelation.schema.on_delete = 'RESTRICT';
assert.ok(!Object.keys(locationSchema).includes('location_landing_pages'));
assert.ok(!Object.keys(locationSchema).includes('website_pages'));
assert.ok(!publicProjectFields.some(name => ['job_id', 'zip'].includes(name)));

// Description-only mode must not create fields or change database constraints,
// existing editor options, or unrelated validation rules.
const description = locationSchema.roofing_neighborhoods.find(row => row.field === 'description');
const lengthRule = description.meta.validation._or.find(rule => rule.description?._regex).description._regex;
assert.equal(description.meta.options.softLength, 220);
assert.deepEqual(description.meta.validation._or[0], { description: { _null: true } });
for (const value of ['', 'x'.repeat(220), 'x'.repeat(219) + '\n']) assert.ok(new RegExp(lengthRule).test(value));
for (const value of ['x'.repeat(221), 'x'.repeat(220) + '\n', 'x'.repeat(220) + '\r\n']) assert.ok(!new RegExp(lengthRule).test(value));
const originalDescription = {
  field: 'description', type: 'text', schema: { is_nullable: true, max_length: null },
  meta: { interface: 'input-multiline', required: false, options: { trim: true }, note: 'Keep this editor guidance.',
    validation: { description: { _ncontains: '<script' } }, validation_message: 'Plain text only.' },
};
let descriptionState = structuredClone(originalDescription);
let descriptionWrites = 0;
let neighborhoodTenants = [{ client: { slug: 'sonshine-roofing' } }];
const descriptionRequest = async (route, method = 'GET', body) => {
  if (route.startsWith('items/')) {
    assert.equal(route, 'items/roofing_neighborhoods?fields=client.slug&limit=-1');
    assert.equal(method, 'GET'); return neighborhoodTenants;
  }
  assert.equal(route, 'fields/roofing_neighborhoods/description');
  if (method === 'PATCH') {
    descriptionWrites++;
    assert.deepEqual(Object.keys(body), ['meta']);
    descriptionState.meta = { ...descriptionState.meta, ...body.meta };
  } else assert.equal(method, 'GET');
  return structuredClone(descriptionState);
};
assert.equal((await configureNeighborhoodDescription(descriptionRequest)).changes.length, 4);
assert.equal(descriptionWrites, 0);
await assert.rejects(configureNeighborhoodDescription(descriptionRequest, { verifyOnly: true }), /not configured/u);
await configureNeighborhoodDescription(descriptionRequest, { apply: true });
assert.equal(descriptionWrites, 1);
assert.equal(descriptionState.meta.options.trim, true);
assert.deepEqual(descriptionState.meta.validation._and[0], originalDescription.meta.validation);
assert.equal(descriptionState.meta.required, false);
assert.equal(descriptionState.meta.interface, 'input-multiline');
assert.ok(descriptionState.meta.note.startsWith(originalDescription.meta.note));
assert.ok(descriptionState.meta.validation_message.startsWith(originalDescription.meta.validation_message));
assert.deepEqual(descriptionState.schema, originalDescription.schema);
assert.equal((await configureNeighborhoodDescription(descriptionRequest, { verifyOnly: true })).changes.length, 0);
assert.equal((await configureNeighborhoodDescription(descriptionRequest, { apply: true })).changes.length, 0);
assert.equal(descriptionWrites, 1, 'Description mode must be idempotent.');
descriptionState = structuredClone(originalDescription);
neighborhoodTenants.push({ client: { slug: 'another-client' } });
await assert.rejects(configureNeighborhoodDescription(descriptionRequest, { apply: true }), /SonShine-only/u);
assert.equal(descriptionWrites, 1, 'Never impose the collection-wide limit on another tenant.');

const availableFields = Object.fromEntries(Object.entries(publicLocationFields).map(([name, fields]) => [name, fields]));
const initial = [{ id: 'synthetic-permission-1', policy: 'synthetic-reader', collection: 'roofing_projects', action: 'read', fields: ['*'], permissions: null }];
// Live permission reads ignore page/filter parameters and return more than 100 rows.
// Read the complete response once, and validate identities before local filtering.
let permissionReads = 0;
const virtual = { system: true, policy: null, collection: 'directus_fields', action: 'read' };
const completePermissions = [...Array.from({ length: 197 }, (_, index) => ({ ...initial[0], id: `synthetic-permission-${index}` })), ...Array.from({ length: 20 }, () => ({ ...virtual }))];
assert.equal((await readPermissions(async route => { permissionReads++; assert.equal(route, 'permissions'); return completePermissions; })).length, 197);
assert.equal(permissionReads, 1, 'The complete permission endpoint must not be paginated.');
for (const invalid of [{ data: [] }, [null], [{}], [{ id: '' }], [{ id: 'same' }, { id: 'same' }], [{ id: 1 }, { id: '1' }],
  [{ ...virtual, system: false }], [{ ...virtual, policy: 'synthetic-reader' }], [{ ...virtual, policy: undefined }],
  [{ ...virtual, collection: 'roofing_projects' }], [{ ...virtual, action: 'unknown' }], [{ ...virtual, id: '' }]]) {
  await assert.rejects(readPermissions(async () => invalid), /permission|Permission/u);
}
const config = { clientId: 'synthetic-client', policyIds: ['synthetic-reader'], availableFields, policyScopeVerifiedExclusive: true };
const tighten = planPermissions(initial, config);
assert.equal(tighten.length, 1);
assert.ok(!tighten[0].data.fields.includes('*'));
assert.ok(!JSON.stringify(tighten[0].data.fields).includes('job_id'));
assert.equal(planPermissions([{ ...initial[0], ...tighten[0].data }], config).length, 0, 'Permission rerun must be empty.');
assert.equal(planPermissions([{ ...initial[0], fields: ['id', 'title'] }], config).length, 0, 'Tightening must preserve an existing narrow field grant.');
assert.deepEqual(planPermissions([{ ...initial[0], fields: ['id', 'title', 'job_id'] }], config)[0].data.fields, ['id', 'title']);
assert.throws(() => planPermissions([{ ...initial[0], fields: [] }], config), /scope is unavailable/u);
const strictInitial = [{ ...initial[0], permissions: { title: { _starts_with: 'Allowed' } } }];
assert.deepEqual(planPermissions(strictInitial, config)[0].data.permissions, strictInitial[0].permissions, 'Tightening preserves prior row scope.');
assert.deepEqual(planPermissions(strictInitial, { ...config, phase: 'extend' })[0].data.permissions._and[0], strictInitial[0].permissions, 'Extension keeps narrower prior rules.');
assert.throws(() => planPermissions(initial, { ...config, phase: 'extend', policyScopeVerifiedExclusive: false }), /exclusive/u);
assert.ok(!JSON.stringify(rowScope('service_area_sections', 'synthetic-client')).includes('status'));
assert.ok(JSON.stringify(rowScope('roofing_service_area_neighbors', 'synthetic-client')).includes('approved'));
const reviewScope = rowScope('reviews', 'synthetic-client');
assert.ok(JSON.stringify(reviewScope).includes('synthetic-client'));
assert.ok(JSON.stringify(reviewScope).includes('published'));
assert.ok(!JSON.stringify(reviewScope).includes('external_id'), 'Published static reviews do not require a Google resource identity.');
assertReaderProjection({ roofing_projects: { read: { access: 'partial', fields: publicProjectFields } } });
assertReaderProjection({}, { requireProjectAccess: false });
for (const fields of [['*'], ['id', 'job_id'], ['id', 'zip'], ['id', 'project.*']]) assert.throws(() => assertReaderProjection({ roofing_projects: { read: { access: 'partial', fields } } }), /Unsafe/u);
assert.throws(() => assertReaderProjection({}), /missing/u);

let record = structuredClone(initial[0]);
const recovery = [];
await applyPermissionPlan(async (route, method = 'GET', data) => {
  if (method === 'PATCH') record = { ...record, ...data };
  return structuredClone(record);
}, tighten, async (index, value) => recovery.push({ index, value }));
assert.equal(recovery.length, 2, 'Before and verified after images required.');
assert.equal(recovery[0].value.before.fields[0], '*');
assert.deepEqual(recovery[1].value.after.fields, publicProjectFields);
let conflictWrites = 0;
await assert.rejects(applyPermissionPlan(async (route, method = 'GET') => {
  if (method !== 'GET') conflictWrites++;
  return { ...initial[0], fields: ['id'] };
}, tighten, async () => {}), /changed since planning/u);
assert.equal(conflictWrites, 0, 'Preserve intervening policy edits.');
assert.ok(planPermissions(initial, { ...config, phase: 'extend' }).length > 1);
const create = planPermissions(initial, { ...config, phase: 'extend' }).find(row => row.id === null);
const unrelated = [
  virtual,
  { id: 'other-policy', ...create.data, policy: 'synthetic-other-policy' },
  { id: 'other-collection', ...create.data, collection: 'synthetic_other_collection' },
  { id: 'other-action', ...create.data, action: 'update' },
];
let created = null, createReads = 0, createWrites = 0;
const createRecovery = [];
await applyPermissionPlan(async (route, method = 'GET', data) => {
  if (method === 'POST') { assert.equal(route, 'permissions'); createWrites++; created = { ...data, id: 'synthetic-created-grant' }; return created; }
  if (route === 'permissions') { createReads++; return unrelated; }
  assert.equal(route, 'permissions/synthetic-created-grant'); return created;
}, [create], async (index, value) => createRecovery.push({ index, value }));
assert.equal(createReads, 1); assert.equal(createWrites, 1); assert.equal(createRecovery.length, 2);
for (const present of [[...unrelated, { id: 'appeared', ...create.data }], [...unrelated, unrelated[1]]]) {
  let writes = 0, receipts = 0;
  await assert.rejects(applyPermissionPlan(async (route, method = 'GET') => {
    if (method !== 'GET') writes++;
    assert.equal(route, 'permissions'); return present;
  }, [create], async () => { receipts++; }), /appeared after planning|Duplicate permission identity/u);
  assert.equal(writes, 0); assert.equal(receipts, 0);
}
const privateRoot = await mkdtemp(join(tmpdir(), 'location-recovery-paths-'));
try {
  const repository = join(privateRoot, 'repository');
  await mkdir(join(repository, '.git'), { recursive: true, mode: 0o700 });
  await mkdir(join(repository, 'private'), { mode: 0o700 });
  await symlink(join(repository, 'private'), join(privateRoot, 'alias'));
  await assert.rejects(prepareRecoveryDirectory(repository, repository), /outside Git/u);
  await assert.rejects(prepareRecoveryDirectory(join(repository, 'private'), repository), /outside Git/u);
  await assert.rejects(prepareRecoveryDirectory(join(privateRoot, 'alias', 'new'), repository), /outside Git/u);
  await assert.rejects(prepareRecoveryDirectory(join(repository, 'private'), privateRoot + '/alias'), /outside Git/u);
  const safe = await prepareRecoveryDirectory(join(privateRoot, 'recovery'), repository);
  assert.ok(safe.endsWith('/recovery'));
} finally { await rm(privateRoot, { recursive: true, force: true }); }
console.log('PASS: location schema dry-run/apply gate/rerun/drift, reader allowlist, tenant scopes, permission recovery and editorial conflict checks (synthetic).');

import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { locationSchema, locationRelations, MODEL_VERSION } from './location-model/schema.mjs';
import { assertReaderProjection } from './location-model/permissions.mjs';

function jsonDefaultsEqual(actual, desired) {
  try {
    const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
    return isDeepStrictEqual(parse(actual), parse(desired));
  } catch {
    return false;
  }
}

// Existing-field metadata is deliberately outside the broad setup routine.
// This mode changes only the neighborhood description's editor and API limit.
export async function configureNeighborhoodDescription(request, { apply = false, verifyOnly = false } = {}) {
  assert.ok(!(apply && verifyOnly), 'Choose apply or verification.');
  const route = 'fields/roofing_neighborhoods/description';
  const field = await request(route);
  assert.equal(field?.field, 'description', 'Missing neighborhood description field.');
  assert.equal(field.type, 'text', 'Neighborhood description must remain text.');
  const desired = locationSchema.roofing_neighborhoods.find(row => row.field === 'description').meta;
  const prior = field.meta ?? {};
  const hasLimit = isDeepStrictEqual(prior.validation, desired.validation)
    || prior.validation?._and?.some(rule => isDeepStrictEqual(rule, desired.validation));
  const append = (text, addition) => text?.includes(addition) ? text : [text, addition].filter(Boolean).join(' ');
  const meta = {
    options: { ...prior.options, ...desired.options },
    validation: hasLimit ? prior.validation : prior.validation ? { _and: [prior.validation, desired.validation] } : desired.validation,
    validation_message: append(prior.validation_message, desired.validation_message),
    note: append(prior.note || desired.note, desired.validation_message),
  };
  const changes = Object.keys(meta).filter(key => !isDeepStrictEqual(prior[key], meta[key]));
  assert.ok(!verifyOnly || changes.length === 0, 'Neighborhood description limit metadata is not configured.');
  if (changes.length && apply) {
    // The collection currently contains only SonShine records. Do not extend
    // this collection-wide rule to an unrelated tenant without review.
    const rows = await request('items/roofing_neighborhoods?fields=client.slug&limit=-1');
    assert.ok(Array.isArray(rows) && rows.length > 0 && rows.every(row => row.client?.slug === 'sonshine-roofing'),
      'Description limit requires a SonShine-only neighborhood collection.');
    await request(route, 'PATCH', { meta });
    const after = await request(route);
    for (const key of Object.keys(meta)) assert.deepEqual(after.meta?.[key], meta[key], `Description ${key} readback failed.`);
    assert.deepEqual(after.schema, field.schema, 'Description database schema changed.');
  }
  return { mode: apply ? 'apply' : verifyOnly ? 'verify-only' : 'dry-run', field: 'roofing_neighborhoods.description', changes };
}

export async function setupLocationSchema(request, { apply = false, verifyOnly = false, verifyPrivateAccess } = {}) {
  assert.ok(!(apply && verifyOnly), 'Choose apply or verification.');
  const collections = new Set((await request('collections')).map(row => row.collection));
  for (const name of ['roofing_service_areas', 'roofing_projects', 'reviews', 'sponsor_features', 'faqs', 'navigation_items', 'service_area_sections']) assert.ok(collections.has(name), `Missing base collection ${name}.`);
  // Permission tightening is a prerequisite, not an after-the-fact privacy fix.
  if (apply) { assert.equal(typeof verifyPrivateAccess, 'function', 'Apply requires live effective reader/public verification.'); await verifyPrivateAccess(); }
  const actions = [];
  for (const [collection, fields] of Object.entries(locationSchema)) {
    if (!collections.has(collection)) {
      assert.ok(!verifyOnly, `Missing collection ${collection}.`);
      actions.push(`create collection ${collection}`);
      if (apply) await request('collections', 'POST', { collection, schema: {}, meta: { hidden: collection !== 'roofing_neighborhoods', ...(collection === 'roofing_neighborhoods' ? { sort_field: 'sort', display_template: '{{name}}' } : {}) }, fields });
      continue;
    }
    const existing = new Map((await request(`fields/${collection}`)).map(row => [row.field, row]));
    if (collection === 'roofing_projects') {
      assert.equal(existing.get('service_area')?.schema?.is_nullable, false, 'Primary project area must stay required in SQL.');
      assert.equal(existing.get('service_area')?.meta?.required, true, 'Primary project area must stay required in Directus.');
    }
    for (const desired of fields) {
      const prior = existing.get(desired.field);
      if (prior) {
        assert.equal(prior.type, desired.type, `Type drift: ${collection}.${desired.field}.`);
        if (desired.schema?.is_nullable === false) assert.equal(prior.schema?.is_nullable, false, `Required field drift: ${collection}.${desired.field}.`);
        if (desired.schema?.default_value !== undefined) {
          const matches = desired.type === 'json'
            ? jsonDefaultsEqual(prior.schema?.default_value, desired.schema.default_value)
            : String(prior.schema?.default_value) === String(desired.schema.default_value);
          assert.ok(matches, `Default drift: ${collection}.${desired.field}.`);
        }
        continue;
      }
      assert.ok(!verifyOnly, `Missing field ${collection}.${desired.field}.`);
      actions.push(`create field ${collection}.${desired.field}`);
      if (apply) await request(`fields/${collection}`, 'POST', desired);
    }
  }
  const relations = await request('relations');
  for (const desired of locationRelations) {
    const prior = relations.find(row => row.collection === desired.collection && row.field === desired.field);
    if (prior) {
      assert.equal(prior.related_collection, desired.related_collection, `Relation drift: ${desired.collection}.${desired.field}.`);
      assert.equal(prior.schema?.on_delete, desired.schema.on_delete, `Deletion drift: ${desired.collection}.${desired.field}.`);
      for (const key of ['one_field', 'junction_field', 'sort_field']) if (desired.meta[key]) assert.equal(prior.meta?.[key], desired.meta[key], `Relation metadata drift: ${desired.collection}.${desired.field}.`);
      continue;
    }
    assert.ok(!verifyOnly, `Missing relation ${desired.collection}.${desired.field}.`);
    actions.push(`create relation ${desired.collection}.${desired.field}`);
    if (apply) await request('relations', 'POST', desired);
  }
  const linkType = (await request('fields/navigation_items')).find(row => row.field === 'link_type');
  const choices = linkType?.meta?.options?.choices;
  assert.ok(Array.isArray(choices), 'Missing navigation link choices.');
  if (!choices.some(choice => choice.value === 'service_area')) {
    assert.ok(!verifyOnly, 'Missing navigation service_area link type.');
    actions.push('add navigation service_area choice');
    if (apply) await request('fields/navigation_items/link_type', 'PATCH', { meta: { options: { ...linkType.meta.options, choices: [...choices, { text: 'Service area', value: 'service_area' }] } } });
  }
  return { version: MODEL_VERSION, mode: apply ? 'apply' : verifyOnly ? 'verify-only' : 'dry-run', actions,
    next: 'Apply reviewed invariant SQL, then extend scoped reader permissions. Private enrichment and the post-backfill constraint are separate release gates.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const modes = ['--apply', '--verify-only', '--dry-run'].filter(value => process.argv.includes(value));
  assert.ok(modes.length <= 1, 'Choose one mode.');
  const base = process.env.DIRECTUS_URL?.replace(/\/+$/u, '');
  const token = process.env.LOCATION_DIRECTUS_ADMIN_TOKEN;
  assert.ok(base && token, 'Configured URL and separately authorized LOCATION_DIRECTUS_ADMIN_TOKEN are required.');
  const request = async (route, method = 'GET', body) => {
    const response = await fetch(`${base}/${route}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const payload = await response.json();
    assert.ok(response.ok && !payload.errors, `${method} ${route.split('?')[0]} failed: HTTP ${response.status}.`);
    return payload.data;
  };
  const verifyPrivateAccess = async () => {
    const reader = process.env.LOCATION_WEBSITE_TOKEN;
    assert.ok(reader, 'LOCATION_WEBSITE_TOKEN required for effective-permission gate.');
    for (const [label, auth] of [['website reader', reader], ['anonymous', null]]) {
      const response = await fetch(`${base}/permissions/me`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });
      if (!auth && response.status === 403) {
        const projectResponse = await fetch(`${base}/items/roofing_projects?fields=id&limit=1`);
        assert.equal(projectResponse.status, 403, 'Anonymous project access exists but effective field permissions cannot be audited.');
        continue;
      }
      assert.ok(response.ok, `${label} permission read failed.`);
      assertReaderProjection((await response.json()).data, { requireProjectAccess: Boolean(auth) });
    }
  };
  const options = { apply: modes[0] === '--apply', verifyOnly: modes[0] === '--verify-only' };
  const result = process.argv.includes('--neighborhood-description')
    ? await configureNeighborhoodDescription(request, options)
    : await setupLocationSchema(request, { ...options, verifyPrivateAccess });
  console.log(JSON.stringify(result, null, 2));
}

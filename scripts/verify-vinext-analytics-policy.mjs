import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyticsPolicy } from '../workers/analytics-policy.mjs';

// Use the actual captured policy, including its separate script-src-elem.
const snapshot = JSON.parse(readFileSync('.generated/editorial.json', 'utf8'));
const policy = snapshot.buildSettings.contentSecurityPolicy;
const updated = analyticsPolicy(policy);
const parse = value => new Map(value.split(';').map(part => part.trim()).filter(Boolean)
  .map(part => { const [name, ...sources] = part.split(/\s+/); return [name, sources]; }));
const before = parse(policy), after = parse(updated);
for (const name of ['script-src', 'script-src-elem', 'connect-src']) {
  assert.ok(after.get(name)?.includes('https://analytics.ahrefs.com'), name);
  assert.deepEqual(after.get(name).filter(value => value !== 'https://analytics.ahrefs.com'),
    before.get(name).filter(value => value !== 'https://analytics.ahrefs.com'));
}
for (const [name, sources] of before) {
  if (!['script-src', 'script-src-elem', 'connect-src'].includes(name)) assert.deepEqual(after.get(name), sources);
}
assert.equal(analyticsPolicy(updated), updated, 'Repeated application must be idempotent');
assert.equal(analyticsPolicy(null), null, 'Do not invent a replacement policy');
console.log('Workers Ahrefs policy allows its script and collection origin while preserving every existing directive/source.');

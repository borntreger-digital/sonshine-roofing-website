import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PICOMATCH_EXCEPTION, validateAudit } from './audit-policy.mjs';
const approvedTime = Date.parse('2026-11-17T12:00:00Z');
const clean = () => ({ auditReportVersion: 2, vulnerabilities: {}, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } } });
test('accepts a consistent clean report with no exceptions', () => assert.equal(validateAudit(clean()).accepted, 0));
for (const severity of ['info', 'low', 'moderate', 'high', 'critical']) {
  test(`rejects ${severity} vulnerabilities, including the former exception`, () => {
    const report = clean();
    report.vulnerabilities.braces = { name: 'braces', severity, via: [{ url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm' }] };
    report.metadata.vulnerabilities[severity] = 1;
    report.metadata.vulnerabilities.total = 1;
    assert.throws(() => validateAudit(report, { now: approvedTime }), /Unaccepted dependency vulnerabilities/);
  });
}
for (const [name, mutate] of [
  ['an audit outage', report => { report.error = { message: 'service unavailable' }; }],
  ['an unsupported format', report => { report.auditReportVersion = 1; }],
  ['missing severity counts', report => { delete report.metadata.vulnerabilities.high; }],
  ['contradictory counts', report => { report.metadata.vulnerabilities.total = 1; }],
  ['an invalid vulnerability collection', report => { report.vulnerabilities = []; }],
]) test(`rejects ${name}`, () => { const report = clean(); mutate(report); assert.throws(() => validateAudit(report)); });
test('rejects absent audit reports', () => assert.throws(() => validateAudit(null)));

const known = () => ({
  ...clean(),
  vulnerabilities: {
    picomatch: { name: 'picomatch', severity: 'high', via: [{ name: 'picomatch', dependency: 'picomatch', severity: 'high', range: '<=4.0.7', url: PICOMATCH_EXCEPTION.advisory }] },
    micromatch: { name: 'micromatch', severity: 'high', via: ['picomatch'] },
    builder: { name: 'builder', severity: 'high', via: ['micromatch', 'picomatch'] },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 3, critical: 0, total: 3 } },
});
test('accepts only the approved advisory and exclusively dependent chains', () => {
  const result = validateAudit(known(), { now: approvedTime });
  assert.equal(result.accepted, 3);
  assert.equal(result.expiresAt, '2026-11-25T05:00:00Z');
  assert.equal(result.advisory, 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf');
});
test('expires at midnight after November 24 Eastern, even for unchanged findings', () => {
  const expires = Date.parse(PICOMATCH_EXCEPTION.expiresAt);
  assert.equal(validateAudit(known(), { now: expires - 1 }).accepted, 3);
  assert.throws(() => validateAudit(known(), { now: expires }), /expired/);
  assert.throws(() => validateAudit(known(), { now: expires + 86400000 }), /expired/);
  assert.throws(() => validateAudit(known(), { now: NaN }), /expired/);
  assert.equal(validateAudit(clean(), { now: expires }).accepted, 0);
});
for (const [name, mutate] of [
  ['another advisory on picomatch', r => r.vulnerabilities.picomatch.via.push({ url: 'https://github.com/advisories/GHSA-other' })],
  ['another advisory on a dependent', r => r.vulnerabilities.builder.via.push({ url: 'https://github.com/advisories/GHSA-other' })],
  ['a missing dependency', r => { r.vulnerabilities.builder.via = ['missing']; }],
  ['a cyclic chain', r => r.vulnerabilities.picomatch.via.push('builder')],
  ['an empty chain', r => { r.vulnerabilities.builder.via = []; }],
  ['a changed advisory range', r => { r.vulnerabilities.picomatch.via[0].range = '*'; }],
  ['a changed advisory package', r => { r.vulnerabilities.picomatch.via[0].dependency = 'other'; }],
  ['a changed advisory URL', r => { r.vulnerabilities.picomatch.via[0].url += '?other'; }],
  ['an advisory on a different root', r => { r.vulnerabilities.builder.via = r.vulnerabilities.picomatch.via; }],
  ['a malformed advisory', r => { r.vulnerabilities.picomatch.via = [null]; }],
  ['an inconsistent package name', r => { r.vulnerabilities.builder.name = 'other'; }],
  ['an unknown severity', r => { r.vulnerabilities.builder.severity = 'unknown'; }],
  ['a total used as a severity', r => { r.vulnerabilities.builder.severity = 'total'; }],
  ['a severity count mismatch', r => { r.metadata.vulnerabilities.high = 2; }],
  ['a total count mismatch', r => { r.metadata.vulnerabilities.total = 2; }],
  ['a string count', r => { r.metadata.vulnerabilities.high = '3'; }],
]) test(`temporary exception rejects ${name}`, () => {
  const report = known(); mutate(report);
  assert.throws(() => validateAudit(report, { now: approvedTime }));
});

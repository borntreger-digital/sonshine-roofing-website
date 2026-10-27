import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateAudit } from './audit-policy.mjs';
const clean = () => ({ auditReportVersion: 2, vulnerabilities: {}, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } } });
test('accepts a consistent clean report with no exceptions', () => assert.equal(validateAudit(clean()).accepted, 0));
for (const severity of ['info', 'low', 'moderate', 'high', 'critical']) {
  test(`rejects ${severity} vulnerabilities, including the former exception`, () => {
    const report = clean();
    report.vulnerabilities.braces = { name: 'braces', severity, via: [{ url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm' }] };
    report.metadata.vulnerabilities[severity] = 1;
    report.metadata.vulnerabilities.total = 1;
    assert.throws(() => validateAudit(report), /Unaccepted dependency vulnerabilities/);
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

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Owner-approved on November 17; valid through November 24 in America/New_York.
export const PICOMATCH_EXCEPTION = Object.freeze({
  advisory: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
  expiresAt: '2026-11-25T05:00:00Z',
});

export function validateAudit(audit, { now = Date.now() } = {}) {
  const fail = (message) => { throw new Error(message); };
  if (!audit || audit.error || audit.auditReportVersion !== 2 || !audit.vulnerabilities || Array.isArray(audit.vulnerabilities) || typeof audit.vulnerabilities !== 'object' || !audit.metadata?.vulnerabilities) fail('Invalid npm audit result');
  const names = Object.keys(audit.vulnerabilities);
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: names.length };
  for (const name of names) {
    const finding = audit.vulnerabilities[name];
    if (!finding || finding.name !== name || !Object.hasOwn(counts, finding.severity) || finding.severity === 'total' || !Array.isArray(finding.via) || !finding.via.length) fail(`Invalid vulnerability: ${name}`);
    counts[finding.severity]++;
  }
  if (Object.keys(counts).some((key) => audit.metadata.vulnerabilities[key] !== counts[key])) fail('Audit severity/count mismatch');
  if (!names.length) return { accepted: 0, message: 'No dependency vulnerabilities reported.' };
  if (!Number.isFinite(now) || now >= Date.parse(PICOMATCH_EXCEPTION.expiresAt)) fail('Picomatch audit exception expired; resolve findings before release');

  // Every path must end at this exact advisory. Never allowlist a dependent
  // package by name alone: a second advisory anywhere in its chain must fail.
  const visiting = new Set();
  const accepted = new Set();
  const accept = (name) => {
    if (accepted.has(name)) return;
    if (!Object.hasOwn(audit.vulnerabilities, name) || visiting.has(name)) fail(`Unaccepted dependency vulnerabilities: invalid chain at ${name}`);
    visiting.add(name);
    for (const via of audit.vulnerabilities[name].via) {
      if (typeof via === 'string') {
        accept(via);
      } else if (!via || name !== 'picomatch' || via.name !== 'picomatch' || via.dependency !== 'picomatch' || via.url !== PICOMATCH_EXCEPTION.advisory || via.range !== '<=4.0.7' || via.severity !== 'high') {
        fail(`Unaccepted dependency vulnerabilities: ${name}`);
      }
    }
    visiting.delete(name);
    accepted.add(name);
  };
  names.forEach(accept);
  return { accepted: accepted.size, advisory: PICOMATCH_EXCEPTION.advisory, expiresAt: PICOMATCH_EXCEPTION.expiresAt, message: 'Only the owner-approved temporary picomatch exception and its exclusive transitive findings were accepted.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000 });
    if (result.error || ![0, 1].includes(result.status)) throw new Error('npm audit failed to complete');
    const report = validateAudit(JSON.parse(result.stdout));
    const runtime = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', timeout: 120000 });
    if (runtime.error || ![0, 1].includes(runtime.status)) throw new Error('Runtime dependency audit failed to complete');
    const runtimeReport = validateAudit(JSON.parse(runtime.stdout));
    console.log(JSON.stringify({ full: report, runtime: runtimeReport }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

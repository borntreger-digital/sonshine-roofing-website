import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function validateAudit(audit) {
  const fail = (message) => { throw new Error(message); };
  if (!audit || audit.error || audit.auditReportVersion !== 2 || !audit.vulnerabilities || Array.isArray(audit.vulnerabilities) || typeof audit.vulnerabilities !== 'object' || !audit.metadata?.vulnerabilities) fail('Invalid npm audit result');
  const names = Object.keys(audit.vulnerabilities);
  if (names.length) fail(`Unaccepted dependency vulnerabilities: ${names.join(', ')}`);
  if (['info','low','moderate','high','critical','total'].some((key) => audit.metadata.vulnerabilities[key] !== 0)) fail('Audit severity/count mismatch');
  return { accepted: 0, message: 'No dependency vulnerabilities reported; no exceptions are accepted.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000 });
    if (result.error || ![0, 1].includes(result.status)) throw new Error('npm audit failed to complete');
    const report = validateAudit(JSON.parse(result.stdout));
    const runtime = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', timeout: 120000 });
    if (runtime.error || runtime.status !== 0) throw new Error('Runtime dependency audit is not clear');
    validateAudit(JSON.parse(runtime.stdout));
    console.log(JSON.stringify(report));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

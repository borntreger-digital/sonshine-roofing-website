import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { verifyDeploymentSnapshot } from '../lib/content/deployment-snapshot.mjs';

// Two synthetic builds in an independent source tree. No CMS requests or changes
// to the developer's frozen candidate; retain A to exercise rollback after B.
const source = process.cwd();
const root = await mkdtemp(join(tmpdir(), 'sonshine-vinext-releases-'));
const env = { ...process.env, DEPLOYMENT_FIXTURE: '1', NODE_ENV: 'production',
  NEXT_PUBLIC_ENV: 'production', NEXT_PUBLIC_BASE_URL: 'https://sonshineroofing.com',
  NEXT_PUBLIC_SITE_URL: 'https://sonshineroofing.com', NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_GTM_ID: 'GTM-SYNTHETIC', NEXT_PUBLIC_META_PIXEL_ID: '000000000000000',
};
for (const key of Object.keys(env)) if (/DIRECTUS|YOUTUBE_API_KEY|SECRET|N8N|TOKEN/.test(key)) delete env[key];
async function run(args, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env: { ...env, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const collect = chunk => { output = (output + chunk).slice(-12000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${args.join(' ')} failed (${code ?? signal}):\n${output}`)));
  });
}
try {
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of new Set(files)) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await cp(join(source, file), join(root, file));
  }
  await symlink(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  let firstDigest;
  for (const revision of ['A', 'B']) {
    for (const args of [
      ['--experimental-strip-types', 'scripts/create-deployment-fixture.mjs', revision],
      ['scripts/make-static-sitemap.mjs'], ['scripts/generate-llms-txt.mjs'],
      ['scripts/seal-content-snapshot.mjs'], ['node_modules/vite/bin/vite.js', 'build'],
    ]) await run(args);
    const digest = verifyDeploymentSnapshot(root).manifest.digest;
    if (revision === 'A') firstDigest = digest;
    else assert.notEqual(digest, firstDigest);
    await run(['scripts/verify-vinext-runtime.mjs'], { VINEXT_FIXTURE_REVISION: revision });
    if (revision === 'A') {
      for (const directory of ['.generated', '.cloudflare', 'dist']) await cp(join(root, directory), join(root, 'rollback', directory), { recursive: true });
      for (const file of ['public/llms.txt', 'public/__sitemaps/static-routes.json']) {
        await mkdir(dirname(join(root, 'rollback', file)), { recursive: true });
        await cp(join(root, file), join(root, 'rollback', file));
      }
    }
    console.log(`Synthetic Workers release ${revision} built and passed its runtime checks.`);
  }
  for (const directory of ['.generated', '.cloudflare', 'dist']) {
    await rm(join(root, directory), { recursive: true, force: true });
    await cp(join(root, 'rollback', directory), join(root, directory), { recursive: true });
  }
  for (const file of ['public/llms.txt', 'public/__sitemaps/static-routes.json']) await cp(join(root, 'rollback', file), join(root, file));
  await run(['scripts/verify-vinext-runtime.mjs'], { VINEXT_FIXTURE_REVISION: 'A' });
  assert.equal(verifyDeploymentSnapshot(root).manifest.digest, firstDigest);
  assert.ok((await readFile(join(root, '.cloudflare/output/v0/workers/default/bundle/index.js'))).length);
  console.log('Rollback to retained release A passed; the original candidate was untouched.');
} finally {
  await rm(root, { recursive: true, force: true });
}

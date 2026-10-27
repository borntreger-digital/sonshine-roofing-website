import { existsSync, readFileSync, globSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';

const publicKeys = [
  'NEXT_PUBLIC_ENV', 'NEXT_PUBLIC_BASE_URL', 'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'NEXT_PUBLIC_GTM_ID', 'NEXT_PUBLIC_META_PIXEL_ID',
  'NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY', 'NEXT_PUBLIC_ENABLE_GTM_PREVIEW',
  'NEXT_PUBLIC_ISOLATED_PREVIEW', 'NEXT_PUBLIC_PREVIEW_INTEGRATIONS', 'NEXT_PUBLIC_PREVIEW_ORIGIN',
];
const captureKeys = ['DIRECTUS_URL', 'DIRECTUS_CLIENT_SLUG', 'DIRECTUS_TOKEN', 'YOUTUBE_API_KEY'];
const filename = process.env.SONSHINE_BUILD_ENV_FILE || resolve('.env');
if (process.env.SONSHINE_BUILD_ENV_FILE && !existsSync(filename)) {
  throw new Error('SONSHINE_BUILD_ENV_FILE does not exist.');
}
const source = existsSync(filename) ? parseEnv(readFileSync(filename, 'utf8')) : {};
const env = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of [...publicKeys, ...captureKeys]) {
  if (!env[key] && source[key]) env[key] = source[key];
}
env.NEXT_PUBLIC_ENV ||= 'production';
const preview = env.NEXT_PUBLIC_ISOLATED_PREVIEW === '1';
const integrations = preview && env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS === '1';
if (preview) {
  env.NEXT_PUBLIC_ENV = 'preview';
  env.NEXT_PUBLIC_PREVIEW_ORIGIN = env.SONSHINE_PREVIEW_ORIGIN;
  if (!integrations) {
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    env.NEXT_PUBLIC_GTM_ID = '';
    env.NEXT_PUBLIC_META_PIXEL_ID = '';
    env.NEXT_PUBLIC_ENABLE_GTM_PREVIEW = 'false';
  } else {
    env.NEXT_PUBLIC_ENABLE_GTM_PREVIEW = 'true';
    if (env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.startsWith('1x')) throw new Error('Integration preview requires a real Turnstile widget.');
  }
}
for (const key of preview && !integrations ? [] : ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'NEXT_PUBLIC_GTM_ID', 'NEXT_PUBLIC_META_PIXEL_ID']) {
  if (!env[key]?.trim()) throw new Error(`Missing required public production setting: ${key}`);
}
env.NEXT_PUBLIC_BASE_URL ||= 'https://sonshineroofing.com';
env.NEXT_PUBLIC_SITE_URL ||= env.NEXT_PUBLIC_BASE_URL;
// Lead credentials are runtime inputs, never build inputs.
for (const key of ['N8N_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET', 'TURNSTILE_SECRET_KEY', 'REVALIDATE_SECRET']) delete env[key];
delete env.SONSHINE_BUILD_ENV_FILE;

async function run(args, childEnv) {
  await new Promise((done, fail) => {
    const child = spawn(process.execPath, args, { env: childEnv, stdio: 'inherit' });
    child.once('error', fail);
    child.once('exit', (code, signal) => code === 0 ? done() : fail(new Error(`${args[0]} exited with ${code ?? signal}`)));
  });
}

// Use the existing prebuild validations and fresh capture for every normal build.
await run([process.env.npm_execpath, 'run', 'prebuild'], env);
const buildEnv = { ...env };
for (const key of captureKeys) delete buildEnv[key];
await run(['node_modules/vite/bin/vite.js', 'build'], buildEnv);
// Both toolchains write .next/types/routes.d.ts, with different exports. Restore
// Next's complete declarations so its existing validator remains usable too.
await run(['node_modules/next/dist/bin/next', 'typegen'], buildEnv);
await run(['scripts/verify-vinext-artifact.mjs'], buildEnv);

// Check actual input values without logging or persisting them. Public widget
// keys are intentionally excluded; the complete output includes private bundles.
const privateKeys = ['DIRECTUS_TOKEN', 'YOUTUBE_API_KEY', 'N8N_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET', 'TURNSTILE_SECRET_KEY'];
const privateValues = privateKeys.flatMap(key => [process.env[key], source[key]])
  .filter(value => typeof value === 'string' && value.length >= 8);
const output = resolve('.cloudflare/output/v0');
for (const filename of globSync('**/*', { cwd: output })) {
  const path = resolve(output, filename);
  if (!statSync(path).isFile()) continue;
  const bytes = readFileSync(path);
  if (privateValues.some(value => bytes.includes(Buffer.from(value)))) {
    throw new Error('Private build input found in Workers output; do not deploy this artifact.');
  }
}
console.log('Verified private build inputs are absent from the Workers output.');

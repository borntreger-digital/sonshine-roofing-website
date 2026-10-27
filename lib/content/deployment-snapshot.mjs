import { readDeploymentText, deploymentFileExists } from './deployment-files.mjs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const SNAPSHOT_FILES = [
  'projects.json',
  'locations.json',
  'static-media.json',
  'editorial.json',
];
export const snapshotHash = (value) => createHash('sha256').update(value).digest('hex');
const fail = () => {
  throw new Error(
    'Deployment content bundle is missing, corrupt, or incompatible. Run a successful credentialed build.',
  );
};

/** Validate the complete bundle, including publication artifacts, before serving. */
export function verifyDeploymentSnapshot(root = process.cwd()) {
  try {
    const manifest = JSON.parse(
      readDeploymentText(join(root, '.generated/content-manifest.json')),
    );
    if (
      manifest.version !== 1 ||
      manifest.clientSlug !== 'sonshine-roofing' ||
      manifest.digest !== snapshotHash(JSON.stringify(manifest.files))
    )
      fail();
    // Scope every traced read to the sealed bundle. Joining an arbitrary manifest
    // key to the project root makes Turbopack include unrelated project files.
    const bundlePaths = new Map([
      ...SNAPSHOT_FILES.map((name) => [`.generated/${name}`, join(root, '.generated', name)]),
      ['public/__sitemaps/static-routes.json', join(root, 'public/__sitemaps/static-routes.json')],
      ['public/llms.txt', join(root, 'public/llms.txt')],
    ]);
    const expected = [...bundlePaths.keys()];
    if (JSON.stringify(Object.keys(manifest.files).sort()) !== JSON.stringify(expected.sort()))
      fail();
    for (const [file, digest] of Object.entries(manifest.files)) {
      const filename = bundlePaths.get(file);
      if (!filename) fail();
      if (digest === null && file === 'public/llms.txt') {
        if (deploymentFileExists(filename)) fail();
        continue;
      }
      if (typeof digest !== 'string' || snapshotHash(readDeploymentText(filename)) !== digest) fail();
    }
    const snapshots = Object.fromEntries(
      SNAPSHOT_FILES.map((name) => [
        name,
        JSON.parse(readDeploymentText(join(root, '.generated', name))),
      ]),
    );
    if (Object.values(snapshots).some((value) => value.clientSlug !== manifest.clientSlug)) fail();
    if (
      snapshots['projects.json'].version !== 2 ||
      snapshots['locations.json'].version !== 1 ||
      snapshots['static-media.json'].version !== 1 ||
      snapshots['editorial.json'].version !== 1
    )
      fail();
    const editorial = snapshots['editorial.json'];
    if (
      ![
        'posts',
        'topics',
        'persons',
        'glossary',
        'websitePages',
        'offers',
        'sponsors',
        'reviews',
        'redirects',
        'legacyMediaRedirects',
        'routeOwners',
      ].every((key) => Array.isArray(editorial[key])) ||
      !editorial.legalCopy?.privacyPolicyHtml ||
      !editorial.legalCopy?.termsOfUseHtml ||
      !editorial.reviewsCarousel ||
      !editorial.buildSettings?.contentSecurityPolicy ||
      !editorial.assetOrigin
    )
      fail();
    if (
      snapshots['locations.json'].projectSnapshotHash !==
      snapshotHash(JSON.stringify(snapshots['projects.json']))
    )
      fail();
    return { manifest, snapshots };
  } catch {
    return fail();
  }
}

let bundle;
export function deploymentBundle() {
  return (bundle ??= verifyDeploymentSnapshot());
}

import { readDeploymentText } from './deployment-files.mjs';
import { createHash } from 'node:crypto';
import type { LocationSnapshot } from './location-types';

export function readLocationSnapshot(filename: string, projectFilename: string): LocationSnapshot {
  let value: LocationSnapshot;
  let projects: string;
  try {
    value = JSON.parse(readDeploymentText(filename)) as LocationSnapshot;
    projects = readDeploymentText(projectFilename);
  } catch {
    throw new Error('Location snapshot is unavailable. Run the credentialed prebuild.');
  }
  const source = JSON.parse(projects) as { version: number; clientSlug: string };
  if (value.version !== 1 || value.contractVersion !== 'location-v3' || source.version !== 2 || value.clientSlug !== source.clientSlug
    || value.projectSnapshotHash !== createHash('sha256').update(JSON.stringify(source)).digest('hex')
    || !value.siteShell?.settings || !Array.isArray(value.siteShell.services)
    || value.featuredOffer === undefined
    || !['areas', 'pages', 'neighborhoods', 'neighbors', 'reviews', 'sponsors', 'faqs', 'navigation', 'coverage'].every(key => Array.isArray(value[key as keyof LocationSnapshot]))) {
    throw new Error('Location and project snapshots are incompatible. Regenerate both before deployment.');
  }
  if (process.env.DIRECTUS_CLIENT_SLUG && process.env.DIRECTUS_CLIENT_SLUG !== value.clientSlug) throw new Error('Location snapshot belongs to another client.');
  if (JSON.stringify(value).includes('"job_id":') || JSON.stringify(value).includes('"jobId":')) throw new Error('Location snapshot contains a prohibited private field.');
  return value;
}

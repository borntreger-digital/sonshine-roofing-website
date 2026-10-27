import 'server-only';
import { readDeploymentText } from './deployment-files.mjs';
import { join } from 'node:path';
import type { PublicImage } from './public-image';

let snapshot: Record<string, PublicImage> | undefined;
export function staticImage(key: string): PublicImage {
  if (!snapshot) {
    const data = JSON.parse(readDeploymentText(join(process.cwd(), '.generated/static-media.json')));
    if (data.version !== 1 || data.clientSlug !== 'sonshine-roofing' || !data.images) throw new Error('Missing or invalid deployment static media snapshot');
    snapshot = data.images;
  }
  const image = snapshot![key.replace(/^static:/u, '')];
  if (!image) throw new Error(`Unknown static image selection: ${key}`);
  return image;
}

export function staticImageUrl(key: string) { return staticImage(key).url; }

/** Pass only the selections needed by the receiving client surface. */
export function selectStaticImages(keys: readonly string[]): Record<string, PublicImage> {
  return Object.fromEntries([...new Set(keys)].map(key => [key.replace(/^static:/u, ''), staticImage(key)]));
}

import { readFileSync, existsSync } from 'node:fs';

// Node deployments read the sealed files from disk. The Workers build replaces
// this module with the same files embedded privately in its server bundle.
export function readDeploymentText(filename) {
  return readFileSync(filename, 'utf8');
}

export function deploymentFileExists(filename) {
  return existsSync(filename);
}

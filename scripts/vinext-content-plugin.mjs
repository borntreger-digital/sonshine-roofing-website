import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyDeploymentSnapshot } from '../lib/content/deployment-snapshot.mjs';

/** Package only the validated deployment files, never environment or CMS inputs. */
export function deploymentContentPlugin() {
  let root;
  return {
    name: 'sonshine-deployment-content',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    load(id) {
      if (id.split('?')[0] !== resolve(root, 'lib/content/deployment-files.mjs')) return;
      if (this.environment.name === 'client') {
        throw new Error('Private deployment content cannot enter a client bundle.');
      }
      const { manifest } = verifyDeploymentSnapshot(root);
      const names = ['.generated/content-manifest.json', ...Object.keys(manifest.files)];
      const files = Object.fromEntries(names
        .filter(name => manifest.files[name] !== null)
        .map(name => [name, readFileSync(resolve(root, name), 'utf8')]));
      for (const name of names) this.addWatchFile(resolve(root, name));
      return {
        code: `import { relative } from 'node:path';
const files = ${JSON.stringify(files)};
const key = filename => relative(process.cwd(), filename).replaceAll('\\\\', '/');
export function deploymentFileExists(filename) { return Object.hasOwn(files, key(filename)); }
export function readDeploymentText(filename) {
  const name = key(filename);
  if (!Object.hasOwn(files, name)) throw new Error('Missing packaged deployment file: ' + name);
  return files[name];
}`,
        map: null,
      };
    },
  };
}

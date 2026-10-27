import { defineConfig } from "vite";
import nextConfig from "./next.config.mjs";
import { deploymentContentPlugin } from "./scripts/vinext-content-plugin.mjs";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { staticAssetsAdapter } from "@vinext/cloudflare/cache/static-assets-adapter";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import { createHash } from "node:crypto";
import { patchCssModules } from "vite-css-modules";
import path from "node:path";
import { fileURLToPath } from 'node:url';
import { deploymentBundle } from './lib/content/deployment-snapshot.mjs';

export default defineConfig({
  resolve: { alias: [
    { find: /^next\/image$/, replacement: path.resolve(import.meta.dirname, 'workers/image.tsx') },
    // vinext resolves its public shim back through next/image in SSR. Resolve
    // the implementation by file to avoid recursively aliasing our wrapper.
    { find: /^sonshine:vinext-image$/, replacement: fileURLToPath(import.meta.resolve('vinext/shims/image')) },
  ] },
  define: { 'process.env.__SONSHINE_RELEASE_ID': JSON.stringify(deploymentBundle().manifest.digest) },
  plugins: [
    deploymentContentPlugin(),
    patchCssModules({ exportMode: "default" }),
    vinext({
      // vinext's types require a key on host conditions; Next's host conditions
      // omit it. Keep the shared config and verify host redirects at runtime.
      nextConfig: { ...nextConfig, output: undefined, images: { ...nextConfig.images, qualities: [75] } } as NonNullable<Parameters<typeof vinext>[0]>['nextConfig'],
      cache: { cdn: staticAssetsAdapter() },
      prerender: { routes: "*" },
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  build: { reportCompressedSize: false },
  css: {
    modules: {
      generateScopedName(name: string, filename: string) {
        const relativePath = path.relative(import.meta.dirname, filename.replace(/\?.*$/, "")).replaceAll("\\", "/");
        return `_${name}_${createHash("sha256").update(relativePath).digest("hex").slice(0, 7)}`;
      },
    },
  },
});

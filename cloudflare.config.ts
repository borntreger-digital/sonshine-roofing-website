import { bindings, defineConfig, defineWorker } from "cf/config";

// These are intentionally public values. Private CMS credentials are never
// copied into the Worker config; lead secrets are declared without values.
const publicKeys = [
  'NEXT_PUBLIC_ENV', 'NEXT_PUBLIC_BASE_URL', 'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'NEXT_PUBLIC_GTM_ID', 'NEXT_PUBLIC_META_PIXEL_ID',
  'NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY', 'NEXT_PUBLIC_ENABLE_GTM_PREVIEW',
  'NEXT_PUBLIC_ISOLATED_PREVIEW', 'NEXT_PUBLIC_PREVIEW_INTEGRATIONS', 'NEXT_PUBLIC_PREVIEW_ORIGIN',
] as const;
const publicBindings = Object.fromEntries(publicKeys
  .filter(key => process.env[key] !== undefined)
  .map(key => [key, bindings.text(process.env[key]!)]));

const preview = process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === '1';
const integrations = preview && process.env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS === '1';
const previewOrigin = process.env.SONSHINE_PREVIEW_ORIGIN || '';
if (preview && (!/^https:\/\/sonshine-roofing-vinext-proof\.[a-z0-9-]+\.workers\.dev$/.test(previewOrigin)
  || process.env.NEXT_PUBLIC_ENV !== 'preview')) {
  throw new Error('Isolated preview requires its exact workers.dev origin and NEXT_PUBLIC_ENV=preview.');
}

export default defineConfig({
  worker: defineWorker({
    name: preview ? "sonshine-roofing-vinext-proof" : "sonshine-roofing-website",
    // The production domains were attached at the authorized October 27 cutover.
    // Preview deployments must never claim them.
    ...(preview ? {} : { domains: [
      { hostname: 'sonshineroofing.com', production: true, previews: false },
      { hostname: 'www.sonshineroofing.com', production: true, previews: false },
    ] }),
    entrypoint: "./workers/entry.mjs",
    compatibilityDate: "2026-10-23",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...publicBindings,
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      ...(preview ? {
        SONSHINE_PREVIEW_DISCARD_LEADS: bindings.text(integrations ? '0' : '1'),
        ...(integrations ? {
          SONSHINE_PREVIEW_DELIVERY: bindings.text('sandbox'),
          N8N_WEBHOOK_URL: bindings.secret(),
          N8N_WEBHOOK_SECRET: bindings.secret(),
        } : {}),
        SONSHINE_PREVIEW_ORIGIN: bindings.text(previewOrigin),
        // Cloudflare's documented public test key, never a production secret.
        TURNSTILE_SECRET_KEY: integrations ? bindings.secret() : bindings.text('1x0000000000000000000000000000000AA'),
        ALLOWED_ORIGIN: bindings.text(previewOrigin),
      } : {
        N8N_WEBHOOK_URL: bindings.secret(),
        N8N_WEBHOOK_SECRET: bindings.secret(),
        TURNSTILE_SECRET_KEY: bindings.secret(),
        ALLOWED_ORIGIN: bindings.secret(),
      }),
    },
  }),
});

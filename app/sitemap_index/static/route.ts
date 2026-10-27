import { readDeploymentText } from '@/lib/content/deployment-files.mjs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { SITE_ORIGIN, sitemapEnabled, sitemapPreviewHeaders } from '@/lib/seo/site';

// The manifest is generated at build time to: public/__sitemaps/static-routes.json
// It belongs to the same sealed content bundle as every other sitemap.

type StaticManifest = { generatedAt?: string; routes: { loc: string; lastmod?: string }[] };

const SITEMAPS_ENABLED = sitemapEnabled();
const PREVIEW_HEADERS = sitemapPreviewHeaders();

// Render once using the deployment manifest.
export const dynamic = 'force-static';


export async function GET() {
  if (!SITEMAPS_ENABLED) return NextResponse.json({ ok: true, note: 'sitemap disabled' }, { status: 404 });

  const origin = SITE_ORIGIN;
  const manifest = JSON.parse(readDeploymentText(join(process.cwd(), 'public/__sitemaps/static-routes.json'))) as StaticManifest;

  const head = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?xml-stylesheet type="text/xsl" href="/__sitemaps/sitemap.xsl"?>`,
  ].join('');

  const body = [
    head,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...manifest.routes.map((r) => {
      const loc = `${origin}${r.loc}`;
      const lastmod = r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : '';
      return `<url><loc>${loc}</loc>${lastmod}</url>`;
    }),
    `</urlset>`,
  ].join('');

  return new NextResponse(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      ...PREVIEW_HEADERS,
    },
  });
}

export const revalidate = false;

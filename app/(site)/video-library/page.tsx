import { Suspense } from 'react';

import Section from '@/components/layout/Section';
import ResourcesAside from '@/components/global-nav/static-pages/ResourcesAside';
import VideoLibraryClient from '@/components/dynamic-content/video/VideoLibraryClient';
import type { VideoItem } from "@/lib/content/video-types";
import type { TermLite } from "@/lib/content/project-types";
import { listAllVideos, listVideoCategories, listVideoItemsPaged } from "@/lib/content/videos";
import type { Metadata } from 'next';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/seo/schema';
import { SITE_ORIGIN } from '@/lib/seo/site';
import Hero from '@/components/ui/Hero';
import { getWebsitePageMetadata } from '@/lib/content/directus-site';

export const revalidate = false;
export const dynamic = 'force-static';

const SEO_TITLE = 'Video Library | SonShine Roofing';
const SEO_DESCRIPTION = 'Highlights from our projects, commercials, and short video explainers.';
const CANONICAL = '/video-library';
const OG_IMAGE = '/og-default.png?v=20260818';
const PAGE_SIZE = 8;

export async function generateMetadata(): Promise<Metadata> {
  return getWebsitePageMetadata({
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    path: CANONICAL,
    image: { url: OG_IMAGE, width: 1200, height: 630 },
  });
}

function uniqueTermsFromVideos(
  items: VideoItem[],
  key: 'materialTypes' | 'serviceAreas',
): TermLite[] {
  const map = new Map<string, TermLite>();
  for (const v of items) {
    const arr = v[key];
    if (!arr) continue;
    for (const t of arr) {
      const slug = String(t.slug || '').trim();
      const name = String(t.name || '').trim();
      if (!slug || !name) continue;
      if (!map.has(slug)) map.set(slug, { slug, name });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default async function VideoLibraryPage() {
  const [initialResult, allVideos, categories] = await Promise.all([
    listVideoItemsPaged({ first: PAGE_SIZE, after: null }),
    listAllVideos(),
    listVideoCategories(),
  ]);

  const origin = SITE_ORIGIN;
  const collectionUrl = `${origin}${CANONICAL}`;

  const topList = allVideos.slice(0, 12);
  const itemListElement = topList.map((item, index) => {
    const slug = (item.slug || '').trim();
    const url = slug ? `${collectionUrl}?v=${encodeURIComponent(slug)}` : collectionUrl;
    const name = (item.title || '').trim();
    const imageUrl = item.thumbnailUrl;
    return {
      '@type': 'ListItem',
      position: index + 1,
      url,
      name,
      ...(imageUrl ? { image: imageUrl } : {}),
    } satisfies Record<string, unknown>;
  });

  const collectionLd = collectionPageSchema({
    name: 'Video Library',
    description: SEO_DESCRIPTION,
    url: CANONICAL,
    origin,
    itemList: { '@type': 'ItemList', itemListElement },
  });

  const breadcrumbsLd = breadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'Video Library', item: CANONICAL },
    ],
    { origin },
  );

  const materialOptions = uniqueTermsFromVideos(allVideos, 'materialTypes');
  const serviceOptions = uniqueTermsFromVideos(allVideos, 'serviceAreas');

  const initialFilters = {
    search: '',
    bucketSlugs: [] as string[],
    materialSlugs: [] as string[],
    serviceAreaSlugs: [] as string[],
  };

  return (
    <>
      <Hero
        title="Video Library"
        eyelash="See Us in Action"
        subtitle="Browse our latest short explainers, tutorials in the field, drone footage of completed roofs, and more."
      />

      <Section>
        <div className="container-edge py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] overflow-visible items-start">
            <div>
              <JsonLd data={collectionLd} />
              <JsonLd data={breadcrumbsLd} />
              <Suspense
                fallback={
                  <div className="rounded-xl border border-blue-100 bg-white/90 p-4 text-sm text-slate-600">
                    Loading videos...
                  </div>
                }
              >
                <VideoLibraryClient
                  collectionUrl={collectionUrl}
                  initialResult={initialResult}
                  playbackVideos={allVideos.map(({ id, slug, title, youtubeId, legacyIds }) => ({
                    id, slug, title, youtubeId, legacyIds,
                  }))}
                  bucketOptions={categories.map(({ slug, name }) => ({ slug, label: name }))}
                  materialOptions={materialOptions}
                  serviceOptions={serviceOptions}
                  pageSize={PAGE_SIZE}
                  initialFilters={initialFilters}
                />
              </Suspense>
            </div>

            <ResourcesAside activePath={CANONICAL} />
          </div>
        </div>
      </Section>
    </>
  );
}

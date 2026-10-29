// /app/project/page.tsx
import Section from "@/components/layout/Section";
import ResourcesAside from "@/components/global-nav/static-pages/ResourcesAside";
import { listProjectsPaged, listProjectFilterTerms } from "@/lib/content/projects";
import type { Metadata } from "next";
import { Suspense } from "react";
import ProjectArchiveClient from "@/components/dynamic-content/project/ProjectArchiveClient";
import { getWebsitePageMetadata } from "@/lib/content/directus-site";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbSchema, collectionPageSchema } from "@/lib/seo/schema";
import { SITE_ORIGIN } from "@/lib/seo/site";
import Hero from "@/components/ui/Hero";

export const revalidate = false;
export const dynamic = "force-static";

const PAGE_PATH = "/project";
const PAGE_TITLE = "Roofing Project Gallery | SonShine Roofing";
const PAGE_DESCRIPTION = "Browse photos and videos of our recent roof replacement projects in Sarasota and surrounding areas. Filter by location, material, and color to find real projects like yours.";
const PAGE_IMAGE = "https://directus.borntregerdigital.com/assets/48416474-93d0-5ed5-a69c-28712329ca36";
const PAGE_SIZE = 6;

export async function generateMetadata(): Promise<Metadata> {
  return getWebsitePageMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    image: { url: PAGE_IMAGE, width: 1200, height: 630 },
  });
}

export default async function ProjectArchivePage() {
  const [initialResult, filterTerms] = await Promise.all([
    listProjectsPaged({ first: PAGE_SIZE, after: null }),
    listProjectFilterTerms(),
  ]);

  const initialFilters = {
    search: "",
    materialTypeSlugs: [] as string[],
    roofColorSlugs: [] as string[],
    serviceAreaSlugs: [] as string[],
  };

  const origin = SITE_ORIGIN;

  const collectionLd = collectionPageSchema({
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    origin,
    primaryImage: PAGE_IMAGE,
    isPartOf: { "@type": "WebSite", name: "SonShine Roofing", url: origin },
  });

  const breadcrumbsLd = breadcrumbSchema(
    [
      { name: "Home", item: "/" },
      { name: "Project Gallery", item: PAGE_PATH },
    ],
    { origin },
  );

  return (
    <>
      <Hero
        title="Roofing Project Gallery"
        eyelash="See Our Past Work"
        subtitle="Explore our latest major roof replacements in Sarasota, Bradenton, Venice, North Port, and more. Filter by location, material (shingle, metal, tile), and roof color — or search by phrase to find a specific project."
        imageSrc="https://directus.borntregerdigital.com/assets/6c766aeb-e715-5d95-b35f-5eed21000766"
        
      />
      <Section>
        <div className="container-edge">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] overflow-visible items-start">
            <div>
              <JsonLd data={collectionLd} />
              <JsonLd data={breadcrumbsLd} />
              <Suspense
                fallback={
                  <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 text-sm text-slate-600">
                    Loading projects...
                  </div>
                }
              >
                <ProjectArchiveClient
                  initialResult={initialResult}
                  filterTerms={filterTerms}
                  pageSize={PAGE_SIZE}
                  initialFilters={initialFilters}
                />
              </Suspense>
            </div>
            <ResourcesAside activePath={PAGE_PATH} />
          </div>
        </div>
      </Section>
    </>
  );
}

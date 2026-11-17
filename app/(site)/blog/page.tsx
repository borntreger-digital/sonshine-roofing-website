import Section from "@/components/layout/Section";
import ResourcesAside from "@/components/global-nav/static-pages/ResourcesAside";
import BlogArchiveClient from "@/components/dynamic-content/blog/BlogArchiveClient";
import { listBlogCategories, listPostsPaged } from "@/lib/content/blog";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getWebsitePageMetadata } from "@/lib/content/directus-site";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbSchema, collectionPageSchema } from "@/lib/seo/schema";
import { SITE_ORIGIN } from "@/lib/seo/site";
import Hero from "@/components/ui/Hero";

export const revalidate = false;

const PAGE_PATH = "/blog";
const PAGE_TITLE = "Roofing Blog for Sarasota, Manatee & Charlotte Counties | SonShine Roofing";
const PAGE_DESCRIPTION = "Practical roofing tips, how‑tos, and local insights from our Sarasota team. Serving SW Florida since 1987.";
const PAGE_IMAGE = "/og-default.png?v=20260818";
const PAGE_SIZE = 6;

export async function generateMetadata(): Promise<Metadata> {
  return getWebsitePageMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    image: { url: PAGE_IMAGE, width: 1200, height: 630 },
  });
}

export const dynamic = "force-static";

export default async function BlogArchivePage() {
  const [initialResult, categories] = await Promise.all([
    listPostsPaged({ first: PAGE_SIZE, after: null }),
    listBlogCategories(100),
  ]);

  const filteredCategories = categories.filter((cat) => cat.slug.toLowerCase() !== "uncategorized");

  const initialFilters = {
    search: "",
    categorySlugs: [] as string[],
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
      { name: "Blog", item: PAGE_PATH },
    ],
    { origin },
  );

  return (
    <>
      <Hero
        title="SonShine Roofing Blog"
        eyelash="Latest Roofing Insights"
        subtitle="Enjoy these handcrafted articles and step-by-step guides from our team that discuss a wide variety of roofing topics (and a few extras, from our family to yours)."
      />

      <Section>
        <div className="container-edge py-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] overflow-visible items-start">
            <div className="min-w-0">
              <JsonLd data={collectionLd} />
              <JsonLd data={breadcrumbsLd} />

              <Suspense
                fallback={
                  <div className="rounded-xl border border-blue-100 bg-white/90 p-4 text-sm text-slate-600">
                    Loading posts...
                  </div>
                }
              >
                <BlogArchiveClient
                  initialResult={initialResult}
                  categories={filteredCategories}
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

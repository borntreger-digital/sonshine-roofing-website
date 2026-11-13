import EditorialDates from '@/components/ui/EditorialDates';
import Image from "next/image";
import FaqInlineList from "@/components/dynamic-content/faq/FaqInlineList";
import { listFaqs } from "@/lib/content/directus-faqs";
import SmartLink from "@/components/utils/SmartLink";
import Section from "@/components/layout/Section";
import { notFound } from "next/navigation";
import { getProjectBySlug, listProjectSlugs, listRelatedProjects } from "@/lib/content/projects";
import { projectServiceLabel } from "@/lib/content/project-data";
import ProjectInlineVideo from "@/components/dynamic-content/project/ProjectInlineVideo";
import YouMayAlsoLike from "@/components/engagement/YouMayAlsoLike";
import ShareWhatYouThink from "@/components/engagement/ShareWhatYouThink";
import ProjectGallery from "@/components/dynamic-content/project/ProjectGallery";
import { PROJECT_GALLERY_DEFAULT_HEIGHT, PROJECT_GALLERY_DEFAULT_WIDTH } from "@/components/dynamic-content/project/galleryConfig";
import ProjectTestimonial from "@/components/dynamic-content/project/ProjectTestimonial";

import type { Metadata } from "next";
import { buildArticleMetadata } from "@/lib/seo/meta";
import { JsonLd } from "@/lib/seo/json-ld";
import { projectReviewSchema, serviceSchema, videoObjectSchema } from "@/lib/seo/schema";
import { SITE_ORIGIN } from "@/lib/seo/site";
import { List } from "lucide-react";
import BackToProjectsButton from "@/components/dynamic-content/project/BackToProjectsButton";
import Hero from "@/components/ui/Hero";

type OgImageRecord = {
  url?: unknown;
  secureUrl?: unknown;
  width?: unknown;
  height?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

// Static paths
export async function generateStaticParams() {
  const slugs = await listProjectSlugs();
  return slugs.map((slug: string) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const seo = project.seo ?? {};
  const og = seo.openGraph ?? {};

  const title = (seo.title || og.title || project.title || "Project · SonShine Roofing").trim();
  const description = (seo.description || og.description || project.projectDescription || "").trim().slice(0, 160);

  const ogImageRecord = isRecord(og.image) ? (og.image as OgImageRecord) : null;
  const ogUrl: string =
    (ogImageRecord && typeof ogImageRecord.secureUrl === "string" && ogImageRecord.secureUrl) ||
    (ogImageRecord && typeof ogImageRecord.url === "string" && ogImageRecord.url) ||
    project.heroImage?.url ||
    "/og-default.png?v=20260818";
  const ogWidth: number =
    (ogImageRecord && typeof ogImageRecord.width === "number" && ogImageRecord.width) || 1200;
  const ogHeight: number =
    (ogImageRecord && typeof ogImageRecord.height === "number" && ogImageRecord.height) || 630;

  return buildArticleMetadata({
    title,
    description,
    openGraphTitle: og.title || undefined,
    openGraphDescription: og.description || undefined,
    keywords: project.focusKeywords,
    robots: project.noindex ? { index: false, follow: true } : undefined,
    path: `/project/${slug}`,
    image: { url: ogUrl, width: ogWidth, height: ogHeight },
    publishedTime: project.date ?? undefined,
    modifiedTime: project.modified ?? undefined,
  });
}

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block px-2 py-1 text-base font-semibold rounded-md bg-blue-100 text-slate-700">
    {children}
  </span>
);

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const projectPromise = getProjectBySlug(slug);
  const faqsPromise = listFaqs({
    pagePath: "/roof-replacement-sarasota-fl",
    limit: 8,
  }).catch(() => []);

  const project = await projectPromise;

  if (!project) notFound();

  const serviceAreaSlugs = (project.serviceAreas ?? [])
    .map((term) => term?.slug)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const [projectPool, faqs] = await Promise.all([
    listRelatedProjects({ serviceAreaSlugs, excludeSlug: project.slug }),
    faqsPromise,
  ]);
  const primaryServiceAreaName =
    project.serviceAreas && project.serviceAreas.length > 0
      ? project.serviceAreas[0]?.name ?? null
      : null;

  const video = project.video;
  const heroImageUrl = project.heroImage?.url ?? undefined;
  const heroImageAlt = project.heroImage?.altText || project.title;
  const serviceLabel = projectServiceLabel(project.projectDescription);
  const heroBadges = [
    ...(project.materialTypes ?? []).map((t) => ({ label: t.name })),
    ...(project.roofColors ?? []).map((t) => ({ label: t.name })),
    ...(project.serviceAreas ?? []).map((t) => ({ label: t.name })),
  ].filter((badge) => badge.label);
  const hasAnyBadges = heroBadges.length > 0;

  const origin = SITE_ORIGIN;
  const shareUrl = `${origin}/project/${slug}`;

  const ogImageSecondary = isRecord(project.seo?.openGraph?.image)
    ? (project.seo?.openGraph?.image as OgImageRecord)
    : null;
  const ogImgMaybe =
    (ogImageSecondary && typeof ogImageSecondary.secureUrl === "string" && ogImageSecondary.secureUrl) ||
    (ogImageSecondary && typeof ogImageSecondary.url === "string" && ogImageSecondary.url) ||
    heroImageUrl ||
    "/og-default.png?v=20260818";
  const ogImgAbs = ogImgMaybe.startsWith("http") ? ogImgMaybe : `${origin}${ogImgMaybe}`;

  const areaServed = (project.serviceAreas || []).map((t) => t.name);
  const materials = (project.materialTypes || []).map((t) => t.name);
  const colors = (project.roofColors || []).map((t) => t.name);

  const seenGalleryUrls = new Set<string>();
  const galleryImageObjects: Array<Record<string, unknown>> = [];
  const addImageObject = (
    url?: string | null,
    caption?: string | null,
    width?: number | null,
    height?: number | null,
    ref?: string
  ) => {
    if (!url) return;
    const absoluteUrl = url.startsWith("http") ? url : `${origin}${url}`;
    if (seenGalleryUrls.has(absoluteUrl)) return;
    const index = galleryImageObjects.length + 1;
    const object: Record<string, unknown> = {
      "@type": "ImageObject",
      "@id": `${shareUrl}#image-${ref ?? index}`,
      url: absoluteUrl,
      contentUrl: absoluteUrl,
    };
    if (caption && caption.trim().length > 0) object.caption = caption.trim();
    const widthValue = typeof width === "number" && Number.isFinite(width) ? width : PROJECT_GALLERY_DEFAULT_WIDTH;
    object.width = widthValue;
    if (typeof height === "number" && Number.isFinite(height)) object.height = height;
    galleryImageObjects.push(object);
    seenGalleryUrls.add(absoluteUrl);
  };

  addImageObject(
    ogImgAbs,
    heroImageAlt,
    project.heroImage?.width ?? PROJECT_GALLERY_DEFAULT_WIDTH,
    project.heroImage?.height ?? PROJECT_GALLERY_DEFAULT_HEIGHT,
    "primary"
  );

  project.projectImages.forEach((img, idx) => {
    addImageObject(
      img.url,
      img.altText || project.title,
      img.width ?? PROJECT_GALLERY_DEFAULT_WIDTH,
      img.height ?? PROJECT_GALLERY_DEFAULT_HEIGHT,
      `gallery-${idx + 1}`
    );
  });

  const videoSchemaInput = video
    ? {
      name: video.title,
      description: video.excerpt,
      canonicalUrl: `/project/${slug}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
      thumbnailUrls: [video.thumbnailUrl],
      uploadDate: video.uploadDate,
      origin,
    }
    : null;

  const videoSchema = videoSchemaInput ? videoObjectSchema(videoSchemaInput) : undefined;
  const videoSchemaNoContext = videoSchemaInput
    ? videoObjectSchema({ ...videoSchemaInput, withContext: false })
    : undefined;

  const projectSchema = serviceSchema({
    name: project.title,
    description: (project.seo?.description || project.projectDescription || "").slice(0, 160),
    url: shareUrl,
    image: galleryImageObjects.length > 0 ? galleryImageObjects : ogImgAbs,
    serviceType: serviceLabel,
    material: materials,
    about: colors,
    areaServed,
    origin,
    subjectOf: videoSchemaNoContext ? [videoSchemaNoContext] : undefined,
    provider: {
      "@type": "RoofingContractor",
      name: "SonShine Roofing",
      url: origin,
      logo: { "@type": "ImageObject", url: `${origin}/icon.png` },
    },
  });

  const reviewSchema =
    project.customerTestimonial
      ? projectReviewSchema({
        testimonial: project.customerTestimonial,
        projectName: project.title,
        projectUrl: shareUrl,
        projectImage: heroImageUrl,
        origin,
      })
      : null;

  return (
    <>
      <Hero
        title={project.title}
        metadata={project.date ? <EditorialDates published={project.date} modified={project.modified} className="text-sm text-slate-200" /> : null}
        subtitle=""
        imageSrc={heroImageUrl}
        justifyStart
        badges={heroBadges}
      >
      </Hero>
      <Section>
        {videoSchema ? <JsonLd id="project-video" data={videoSchema} /> : null}
        <JsonLd data={projectSchema} />
        {reviewSchema ? <JsonLd id="project-review" data={reviewSchema} /> : null}
        <div>
          <BackToProjectsButton />
        </div>

        {/* Two-column layout */}
        <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[4fr_2fr]">
          {/* Left column: Video facade (fallback to image) + badges */}
          <div>
            {video ? (
              <ProjectInlineVideo
                key={video.youtubeId}
                title={video.title}
                videoId={video.youtubeId}
                posterUrl={heroImageUrl || video.thumbnailUrl}
                posterAlt={heroImageUrl ? heroImageAlt : video.title}
              />
            ) : (
              heroImageUrl && (
                <Image
                  src={heroImageUrl}
                  alt={heroImageAlt}
                  width={1280}
                  height={720}
                  sizes="(max-width: 1280px) 100vw, 768px"
                  className="rounded-2xl bg-neutral-50"
                  priority
                  fetchPriority="high"
                  loading="eager"
                />
              )
            )}
            {hasAnyBadges && (
              <div className="flex flex-wrap gap-2 mt-4">
                {heroBadges.map((badge, index) => (
                  <Badge key={`hero-badge-${index}`}>{badge.label}</Badge>
                ))}
              </div>
            )}

            <div className="grid gap-8">
              <ShareWhatYouThink urlOverride={shareUrl} />

              {/* Customer Testimonial */}
              {project.customerTestimonial ? (
                <ProjectTestimonial testimonial={project.customerTestimonial} />
              ) : null}

              {/* Gallery */}
              <ProjectGallery images={project.projectImages} projectTitle={project.title} />
            </div>
          </div>

          {/* Right column: Project Details + Products */}
          <div className="sticky top-16 bg-amber-50/50 shadow-xs rounded-3xl border border-blue-200">
            {project.projectDescription && (
              <>
                <div className="rounded-t-3xl px-6 border-b border-blue-200 overflow-hidden bg-blue-50">
                  <h3 className="text-2xl mt-6 mb-4">
                    About This Project
                  </h3>

                </div>
                <div className="px-6">
                  <h4 className="mt-4 mb-2 text-xl text-slate-600">
                    Summary
                  </h4>
                  <p className="mb-6">{project.projectDescription}</p>
                </div>

              </>
            )}

            {project.productLinks?.length > 0 && (
              <>
                <div className="rounded-b-3xl px-6 border-t border-blue-200 overflow-hidden bg-blue-50">
                  <h4 className="mt-4 mb-2 text-xl text-slate-600">
                    <List className="text-(--brand-blue) mr-2 inline h-4 w-4" />
                    Products Used
                  </h4>
                  <ul className="pl-5 list-disc mb-6">
                    {project.productLinks.map((p, i) => (
                      <li key={i}>
                        {p.productLink ? (
                          <SmartLink
                            href={p.productLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-(--brand-blue) transition-colors hover:text-blue-800"
                            showExternalIcon
                          >
                            {p.productName}
                          </SmartLink>
                        ) : (
                          <span>{p.productName}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        <YouMayAlsoLike
          variant="project"
          projects={projectPool}
          serviceAreaSlug={serviceAreaSlugs}
          serviceAreaName={primaryServiceAreaName}
        />

        <FaqInlineList
          heading="Roof Replacement FAQs"
          pagePath="/roof-replacement-sarasota-fl"
          limit={8}
          initialItems={faqs}
          seeMoreHref="/faq"
        />
      </Section >
    </>
  );
}

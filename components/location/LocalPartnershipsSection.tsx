import Image from "next/image";
import { Facebook, Globe, Instagram } from "lucide-react";
import type { SponsorFeature } from "@/lib/content/sponsor-features";
import { sanitizeSponsorHtml } from "@/lib/content/directus-sponsor-html";
import { SECTION_HEADING, SECTION_SUBTITLE } from "@/components/location/sectionStyles";
import { renderHighlight } from "@/components/utils/renderHighlight";
import SmartLink from "../utils/SmartLink";

type PartnershipItem = {
  feature: SponsorFeature;
  areaNames?: readonly string[];
};

/** Shared by the homepage and the local/nearby groups on location pages. */
export function PartnershipGrid({ items }: { items: readonly PartnershipItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {items.map(({ feature, areaNames }, index) => (
        <article key={feature.id || feature.slug || index} className="flex h-full min-w-0 flex-col gap-4 p-6">
          <div className="mt-2 flex items-center gap-4">
            {feature.featuredImage?.url ? (
              <div className="relative h-16 w-16 shrink-0">
                <Image
                  src={feature.featuredImage.url}
                  alt={feature.featuredImage.altText || `${feature.title ?? "Sponsor"} logo`}
                  fill
                  className="rounded-xl border border-blue-200 bg-white object-contain"
                  sizes="64px"
                  loading="lazy"
                />
              </div>
            ) : null}
            <div className="min-w-0 space-y-1">
              <h3 className="text-xl md:text-2xl">{feature.title || `Sponsor ${index + 1}`}</h3>
              {areaNames?.length ? (
                <p className="text-sm text-slate-600">{Array.from(new Set(areaNames)).join(", ")}</p>
              ) : null}
            </div>
          </div>
          {feature.links && (feature.links.facebookUrl || feature.links.instagramUrl || feature.links.websiteUrl) ? (
            <ul className="flex flex-wrap gap-5 text-sm">
              {feature.links.facebookUrl ? (
                <li>
                  <SmartLink href={feature.links.facebookUrl}
                    className="flex items-center gap-2 font-medium text-brand-blue transition-colors hover:text-brand-blue/80"
                    target="_blank" rel="noreferrer">
                    <Facebook aria-hidden="true" className="h-4 w-4 text-[#1877F2]" />
                    Facebook
                  </SmartLink>
                </li>
              ) : null}
              {feature.links.instagramUrl ? (
                <li>
                  <SmartLink href={feature.links.instagramUrl}
                    className="flex items-center gap-2 font-medium text-brand-blue transition-colors hover:text-brand-blue/80"
                    target="_blank" rel="noreferrer">
                    <Instagram aria-hidden="true" className="h-4 w-4 text-[#E4405F]" />
                    Instagram
                  </SmartLink>
                </li>
              ) : null}
              {feature.links.websiteUrl ? (
                <li>
                  <SmartLink href={feature.links.websiteUrl}
                    className="flex items-center gap-2 font-medium text-brand-blue transition-colors hover:text-brand-blue/80"
                    target="_blank" rel="noreferrer">
                    <Globe aria-hidden="true" className="h-4 w-4" />
                    Website
                  </SmartLink>
                </li>
              ) : null}
            </ul>
          ) : null}
          {feature.contentHtml ? (
            <div className="space-y-3 text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeSponsorHtml(feature.contentHtml) }} />
          ) : null}
        </article>
      ))}
    </div>
  );
}

type LocalPartnershipsSectionProps = {
  features: SponsorFeature[];
  heading?: string;
  eyebrow?: string;
  className?: string;
  emptyMessage?: string;
};

export default function LocalPartnershipsSection({
  features,
  heading = "Community-driven Values",
  eyebrow = "As a pillar of the Sarasota roofing community, we believe it is our duty to give back to organizations whose values align with ours. As you'll see, we proudly support law enforcement, youth sports, and more.",
  className,
  emptyMessage = "No partnerships recorded yet.",
}: LocalPartnershipsSectionProps) {
  const sectionClassName = className ? `mx-2 mt-24 ${className}` : "mx-2 mt-24";
  const renderedHeading = renderHighlight(heading, "Community-driven");

  return (
    <section className={sectionClassName}>
      <div className="mx-auto flex max-w-3xl flex-col text-center">
        <h2 className={SECTION_HEADING}>{renderedHeading}</h2>
        <p className={SECTION_SUBTITLE}>{eyebrow}</p>
      </div>
      {features.length ? (
        <PartnershipGrid items={features.map((feature) => ({ feature }))} />
      ) : (
        <p className="text-sm text-slate-600">{emptyMessage}</p>
      )}
    </section>
  );
}

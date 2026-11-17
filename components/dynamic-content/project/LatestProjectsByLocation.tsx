import ProjectArchiveCard from "@/components/dynamic-content/project/ProjectArchiveCard";
import SmartLink from "@/components/utils/SmartLink";
import { ArrowRight } from "lucide-react";
import type { ProjectSummary } from "@/lib/content/project-types";
import { renderHighlight } from "@/components/utils/renderHighlight";
import { SECTION_HEADING, SECTION_SUBTITLE } from "@/components/location/sectionStyles";

type Props = {
  projects: ProjectSummary[];
  locationName?: string | null;
  heading?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
};

const baseWrapperClass = "px-4 max-w-[1600px] mx-auto";
const lessFatCta = "btn btn-ghost btn-sm md:btn-md w-auto";

export default function LatestProjectsByLocation({
  projects,
  locationName,
  heading,
  description,
  ctaHref = "/project",
  ctaLabel = `See Full Project Gallery`,
  className,
}: Props) {
  if (!Array.isArray(projects) || projects.length === 0) return null;

  const resolvedHeading =
    heading ?? (locationName ? `Latest Roof Replacement Projects in ${locationName}` : "Latest Roof Replacement Projects");

  const resolvedDescription =
    description ??
    (locationName
      ? `Browse our latest shingle, metal, and tile roof replacements in ${locationName}, FL and get an idea of what your new roof could look like.`
      : "Browse our latest shingle, metal, and tile roof replacement projects and get an idea of what your new roof could look like.");

  const wrapperClass = [baseWrapperClass, className].filter(Boolean).join(" ");
  const renderedHeading = renderHighlight(resolvedHeading, locationName);

  return (
    <section className={wrapperClass} aria-labelledby="projects-by-location-heading">
      <div className="text-center">
        <h2 id="projects-by-location-heading" className={SECTION_HEADING}>
          {renderedHeading}
        </h2>
        <p className={SECTION_SUBTITLE}>{resolvedDescription}</p>
      </div>

      <div className="text-right">
        <SmartLink
          href={ctaHref}
          className={lessFatCta}
          title={ctaLabel}
          data-icon-affordance="right"
          proseGuard
        >
          {ctaLabel}
          <ArrowRight className="inline w-4 h-4 ml-2 icon-affordance" />
        </SmartLink>
      </div>

      <div className="mt-4 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
        {projects.map((project, index) => (
          <div
            key={project.slug}
            className="h-full motion-safe:animate-lp-fade-in"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <ProjectArchiveCard
              project={project}
              imageSizes="(min-width: 1600px) 772px, (min-width: 640px) calc((100vw - 56px) / 2), calc(100vw - 32px)"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

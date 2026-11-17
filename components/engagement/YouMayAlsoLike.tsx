import BlogArchiveCard from "@/components/dynamic-content/blog/BlogArchiveCard";
import ProjectArchiveCard from "@/components/dynamic-content/project/ProjectArchiveCard";
import { CONTENT_PREVIEW_LIMIT } from "@/lib/content/preview-selection";
import { CONTENT_PREVIEW_GRID_CLASS, CONTENT_PREVIEW_IMAGE_SIZES, PROJECT_PREVIEW_GRID_CLASS } from "@/components/dynamic-content/card-utils";
import type { PostCard } from "@/lib/content/content-types";
import type { ProjectSummary } from "@/lib/content/project-types";
import { ArrowRight, Sparkles } from "lucide-react";
import SmartLink from "@/components/utils/SmartLink";

const lessFatCta = "btn btn-ghost btn-sm md:btn-md w-auto";

type BaseProps = {
  /** Number of cards to show (default 6) */
  limit?: number;
  /** Optional wrapper className */
  className?: string;
  /** Optional custom heading to override defaults */
  heading?: string;
};

type BlogVariantProps = BaseProps & {
  variant?: "blog";
  /** Already ranked, deduplicated recommendations from the content adapter. */
  posts: PostCard[];
};

type ProjectVariantProps = BaseProps & {
  variant: "project";
  /** Already ranked, deduplicated recommendations from the content adapter. */
  projects: ProjectSummary[];
  /** Service-area context for the default heading. */
  serviceAreaSlug?: string | string[] | null;
  /** Friendly service-area label for default heading copy. */
  serviceAreaName?: string | null;
};

type Props = BlogVariantProps | ProjectVariantProps;

const formatServiceArea = (value: string | null | undefined) => {
  if (!value) return "";
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const buildProjectHeading = (heading: string | undefined, fallbackName?: string | null, slug?: string | string[] | null) => {
  if (heading && heading.trim()) return heading;
  const preferred = fallbackName?.trim();
  if (preferred) return `Explore More Roofing Projects Near ${preferred}`;

  const firstSlug = Array.isArray(slug) ? slug[0] : slug;
  const formatted = formatServiceArea(firstSlug);
  return formatted ? `Explore More Roofing Projects in ${formatted}` : "Explore More Roofing Projects";
};

export default function YouMayAlsoLike(props: Props) {
  const { className } = props;
  const limit = Math.max(0, props.limit ?? CONTENT_PREVIEW_LIMIT);
  const baseClassName = ["not-prose px-2", className].filter(Boolean).join(" ");
  if (props.variant === "project") {
    const projectItems = props.projects.slice(0, limit);

    if (!projectItems.length) return null;

    const finalHeading = buildProjectHeading(props.heading, props.serviceAreaName, props.serviceAreaSlug);

    return (
      <section className={baseClassName} aria-labelledby="ymal-heading">
        <div className="flex flex-col md:justify-between mt-16 mb-4">
          <h2 id="ymal-heading" className="text-3xl md:text-4xl">
            <Sparkles className="inline h-7 w-7 md:h-10 md:w-10 text-(--brand-blue) mr-3" />
            {finalHeading}
          </h2>
          <div className="text-right">
            <SmartLink
              href="/project"
              className={lessFatCta}
              title="See Full Project Gallery"
              data-icon-affordance="right"
              proseGuard
            >
              See Full Project Gallery
              <ArrowRight className="icon-affordance h-4 w-4 inline ml-2" />
            </SmartLink>
          </div>
        </div>

        <div className={PROJECT_PREVIEW_GRID_CLASS}>
          {projectItems.map((item, index) => (
            <ProjectArchiveCard
              key={item.slug}
              project={item}
              variant="related"
              imageSizes={CONTENT_PREVIEW_IMAGE_SIZES}
              className="h-full motion-safe:animate-lp-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            />
          ))}
        </div>
      </section>
    );
  }

  const blogItems = props.posts.slice(0, limit);

  if (!blogItems.length) return null;

  const finalHeading = props.heading ?? "Learn More";

  return (
    <section className={baseClassName} aria-labelledby="ymal-heading">
      <div className="grid mt-36 mb-4">
        <h2 id="ymal-heading" className="text-3xl md:text-4xl">
          <Sparkles className="inline h-7 w-7 md:h-10 md:w-10 text-(--brand-blue) mr-3" />
          {finalHeading}
        </h2>
        <div className="text-right">
          <SmartLink
            href="/blog"
            className={lessFatCta}
            title="See Full Blog"
            data-icon-affordance="right"
            proseGuard
          >
            See Full Blog
            <ArrowRight className="icon-affordance h-4 w-4 inline ml-2" />
          </SmartLink>
        </div>
      </div>

      <div className={CONTENT_PREVIEW_GRID_CLASS}>
        {blogItems.map((item, index) => (
          <BlogArchiveCard
            key={item.slug}
            post={item}
            imageSizes={CONTENT_PREVIEW_IMAGE_SIZES}
            className="h-full motion-safe:animate-lp-fade-in"
            style={{ animationDelay: `${index * 60}ms` }}
          />
        ))}
      </div>
    </section>
  );
}

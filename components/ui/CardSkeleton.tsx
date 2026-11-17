import * as React from "react";
import type { BlogCardVariant } from "@/components/dynamic-content/blog/BlogArchiveCard";
import blogStyles from "@/components/dynamic-content/blog/BlogArchiveCard.module.css";
import videoStyles from "@/components/dynamic-content/video/VideoArchiveCard.module.css";
import type { ProjectCardVariant } from "@/components/dynamic-content/project/ProjectArchiveCard";
import projectStyles from "@/components/dynamic-content/project/ProjectArchiveCard.module.css";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";

export type CardSkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Which card layout to mirror. Defaults to the blog card. */
  variant?: "blog" | "project" | "video";
  /** Blog placement to mirror when variant is blog. */
  blogVariant?: BlogCardVariant;
  /** Project placement to mirror when variant is project. */
  projectVariant?: ProjectCardVariant;
  /** Show an image block that matches the card media slot. */
  withImage?: boolean;
  /** Tailwind aspect class for the image block (e.g., "aspect-4/3"). */
  imageAspectClass?: string;
  /** How many body lines to render under the title. */
  bodyLines?: number;
  /** Show the meta row (e.g., blog date) when the layout includes one. */
  showMeta?: boolean;
};

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(function CardSkeleton(
  {
    className,
    variant = "blog",
    projectVariant = "standard",
    blogVariant = "standard",
    withImage = true,
    imageAspectClass,
    bodyLines = 2,
    showMeta = true,
    ...props
  },
  ref
) {
  const lines = Math.max(0, bodyLines | 0);
  const renderBodyLines = (wrapperClassName?: string) => {
    if (lines === 0) return null;
    return (
      <div className={cn("space-y-2", wrapperClassName)}>
        {Array.from({ length: lines }).map((_, i) => {
          const widthClass =
            i === lines - 1
              ? "w-2/3"
              : i % 3 === 0
              ? "w-full"
              : i % 3 === 1
              ? "w-5/6"
              : "w-4/5";
          return <Skeleton key={`line-${i}`} className={cn("h-4", widthClass)} />;
        })}
      </div>
    );
  };

  if (variant === "project") {
    const hasDescription = lines > 0 && (projectVariant === "standard" || projectVariant === "archive");
    return (
      <div ref={ref} className={cn("not-prose", projectStyles.shell, className)} aria-hidden="true" {...props}>
        <div className={cn(
          projectStyles.card,
          projectStyles[projectVariant],
          projectVariant === "compact" ? "rounded-lg" : "rounded-xl",
          hasDescription ? projectStyles.hasProse : projectStyles.noDescription,
        )}>
          {withImage && (
            <div className={cn(projectStyles.photo, imageAspectClass)}>
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            </div>
          )}
          <div className={projectStyles.heading}>
            <Skeleton className="h-7 w-3/4" />
            {showMeta && <Skeleton className="mt-2 h-4 w-1/2" />}
          </div>
          <div className={projectStyles.facts}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`project-fact-${i}`} className={projectStyles.fact}>
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
          {hasDescription && <div className={projectStyles.description}>{renderBodyLines()}</div>}
          <div className={projectStyles.footer}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  const styles = variant === "video" ? videoStyles : blogStyles;
  const hasDescription = lines > 0 && (variant === "video" || blogVariant !== "compact");
  const facts = showMeta ? (
    <div className={styles.facts}>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={`fact-${i}`} className={styles.fact}>
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  ) : null;
  const media = withImage ? (
    <div className={cn(variant === "video" ? videoStyles.media : blogStyles.photo, imageAspectClass)}>
      <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      {variant === "video" && <span className={videoStyles.play}><Skeleton className="h-5 w-5" /></span>}
    </div>
  ) : null;

  return (
    <div ref={ref} className={cn("not-prose", styles.shell, className)} aria-hidden="true" {...props}>
      <div className={cn(
        styles.card,
        variant === "video" ? videoStyles.standard : blogStyles[blogVariant],
        variant === "blog" && blogVariant === "compact" ? "rounded-lg" : "rounded-xl",
        variant === "blog" && !hasDescription && blogStyles.noSummary,
        variant === "blog" && !showMeta && blogStyles.noFacts,
      )}>
        {media}
        {variant === "video" ? (
          <div className={videoStyles.body}>
            <Skeleton className="h-7 w-3/4" />
            {facts}
            {hasDescription && <div className={videoStyles.description}>{renderBodyLines()}</div>}
            <div className={videoStyles.project}><Skeleton className="h-4 w-40" /></div>
          </div>
        ) : (
          <>
            <div className={blogStyles.heading}><Skeleton className="h-7 w-3/4" /></div>
            {facts}
            {hasDescription && <div className={blogStyles.description}>{renderBodyLines()}</div>}
            <div className={blogStyles.footer}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default CardSkeleton;

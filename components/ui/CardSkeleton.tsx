import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BLOG_PREVIEW_CARD_MIN_HEIGHT_CLASS,
  CONTENT_PREVIEW_MEDIA_CLASS,
} from "@/components/dynamic-content/card-utils";
import type { ProjectCardVariant } from "@/components/dynamic-content/project/ProjectArchiveCard";
import projectStyles from "@/components/dynamic-content/project/ProjectArchiveCard.module.css";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";

export type CardSkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Which card layout to mirror. Defaults to the blog card. */
  variant?: "blog" | "project" | "video";
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

const DEFAULT_CHIP_COUNT = 3;

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(function CardSkeleton(
  {
    className,
    variant = "blog",
    projectVariant = "standard",
    withImage = true,
    imageAspectClass,
    bodyLines = 2,
    showMeta = true,
    ...props
  },
  ref
) {
  const lines = Math.max(0, bodyLines | 0);
  const resolvedAspect =
    imageAspectClass ?? "aspect-video";

  const cardClassName = cn(
    variant === "video"
      ? "vid-card overflow-hidden"
      : "flex h-full flex-col overflow-hidden",
    variant === "blog" && BLOG_PREVIEW_CARD_MIN_HEIGHT_CLASS,
    className
  );
  const headerClassName = variant === "video" ? undefined : "px-5 pb-5 pt-5 sm:px-6 sm:pt-6";
  const contentClassName = "flex flex-1 flex-col px-5 pb-4 pt-5 sm:px-6 sm:pb-6";
  const footerClassName =
    "mt-auto flex items-center justify-between border-t border-slate-100/60 bg-slate-50/40 px-5 py-4 text-[#0045d7] sm:px-6";

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

  const renderChipRow = (
    count: number,
    containerClassName?: string
  ) => {
    return (
      <div className={cn("flex gap-2", containerClassName)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={`chip-${i}`} className="h-6 w-16 rounded-md" />
        ))}
      </div>
    );
  };

  const renderBlogTopics = () => (
    <div className="relative -mx-5 mt-3 min-h-11 sm:-mx-6">
      <div className="flex flex-nowrap gap-2 overflow-x-auto px-5 pb-2 scrollbar-none sm:px-6">
        {renderChipRow(DEFAULT_CHIP_COUNT)}
      </div>
      <div className="pointer-events-none absolute inset-y-1 left-0 w-6 bg-linear-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-1 right-0 w-6 bg-linear-to-l from-white to-transparent" />
    </div>
  );

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

  const header = (
    <CardHeader className={headerClassName}>
      <CardTitle
        className={cn(
          variant === "video" ? "font-medium" : "font-semibold",
          variant === "blog" && "min-h-12",
        )}
      >
        <Skeleton className="h-6 w-3/4" />
      </CardTitle>
    </CardHeader>
  );

  const media = withImage && (
    <div className={cn(CONTENT_PREVIEW_MEDIA_CLASS, resolvedAspect)}>
      <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      {variant === "video" && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid place-items-center rounded-xl bg-white/90 p-4 shadow-md">
            <span className="h-4 w-4 rounded-sm bg-slate-300" />
          </span>
        </span>
      )}
    </div>
  );

  return (
    <Card ref={ref} className={cardClassName} {...props}>
      {header}
      {media}

      <CardContent className={contentClassName}>
        {variant === "blog" && (
          <>
            {showMeta && (
              <div className="flex min-h-5 items-center text-sm text-slate-600">
                <Skeleton className="h-4 w-24" />
              </div>
            )}

            <div className="mt-3 min-h-18">
              {renderBodyLines(showMeta ? undefined : "mt-2")}
            </div>
            {renderBlogTopics()}
          </>
        )}

        {variant === "video" && (
          <>
            {renderBodyLines()}
            {renderChipRow(DEFAULT_CHIP_COUNT, "mt-3")}
            <div className="mt-3">
              <Skeleton className="h-4 w-40" />
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className={footerClassName}>
        <div className="inline-flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-4 rounded-sm" />
        </div>
      </CardFooter>
    </Card>
  );
});

export default CardSkeleton;

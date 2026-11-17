import * as React from "react";
import CardSkeleton, { type CardSkeletonProps } from "@/components/ui/CardSkeleton";
import Grid from "@/components/layout/Grid";

type Mode = "overlay" | "skeleton";

type GridLoadingStateProps = Omit<React.ComponentProps<typeof Grid>, "children"> & {
  count?: number;
  withImage?: CardSkeletonProps["withImage"];
  imageAspectClass?: CardSkeletonProps["imageAspectClass"];
  bodyLines?: CardSkeletonProps["bodyLines"];
  showMeta?: CardSkeletonProps["showMeta"];
  variant?: "blog" | "video" | "project";
  projectVariant?: CardSkeletonProps["projectVariant"];
  mode?: Mode;
  message?: string;
};

/**
 * GridLoadingState
 * ----------------
 * Shared loading presentation for resource grids. Supports two modes:
 * - "skeleton": renders card placeholders (backwards compatible).
 * - "overlay": renders a centered status message for use atop existing grids.
 */
export default function GridLoadingState({
  count = 6,
  className,
  withImage = true,
  imageAspectClass,
  bodyLines = 2,
  showMeta = true,
  variant,
  projectVariant,
  mode = "skeleton",
  message = "Loading…",
  ...gridProps
}: GridLoadingStateProps) {
  const resolvedAspect = React.useMemo(() => {
    if (imageAspectClass) return imageAspectClass;
    switch (variant) {
      case "project":
        return undefined;
      case "blog":
      case "video":
      default:
        return "aspect-video";
    }
  }, [imageAspectClass, variant]);

  const items = React.useMemo(() => Array.from({ length: Math.max(0, count | 0) }), [count]);

  if (mode === "overlay") {
    return (
      <div
        role="status"
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/70 backdrop-blur-xs"
      >
        <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-(--brand-blue)" aria-hidden />
        <span className="text-sm font-medium text-slate-700">{message}</span>
      </div>
    );
  }

  return (
    <Grid className={className} {...gridProps}>
      {items.map((_, i) => (
        <CardSkeleton
          key={i}
          variant={variant}
          projectVariant={projectVariant}
          withImage={withImage}
          imageAspectClass={resolvedAspect}
          bodyLines={bodyLines}
          showMeta={showMeta}
        />
      ))}
    </Grid>
  );
}

import type { CSSProperties } from "react";

export const titleClampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const lineClampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const BLOG_PREVIEW_CARD_MIN_HEIGHT_CLASS = "blog-preview-card-min-h";
export const PROJECT_PREVIEW_CARD_MIN_HEIGHT_CLASS = "project-preview-card-min-h";

export const CONTENT_PREVIEW_GRID_CLASS = "grid min-w-0 auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";
export const CONTENT_PREVIEW_MEDIA_CLASS = "relative w-full shrink-0 overflow-hidden bg-slate-100";
export const CONTENT_PREVIEW_IMAGE_SIZES = "(min-width: 1280px) 400px, (min-width: 1024px) calc((100vw - 80px) / 3), (min-width: 768px) calc((100vw - 56px) / 2), calc(100vw - 32px)";

export const truncateText = (text?: string | null, max = 220): string | undefined => {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  let output = trimmed;
  if (trimmed.length > max) {
    output = trimmed.slice(0, max).replace(/\s+\S*$/, "");
  }
  if (!output.endsWith("…")) output = `${output}…`;
  return output;
};

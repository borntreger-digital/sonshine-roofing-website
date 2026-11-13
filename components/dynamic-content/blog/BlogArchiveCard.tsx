import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/utils/SmartLink";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { PostCard } from "@/lib/content/content-types";
import { stripHtml } from "@/lib/content/html-text";
import {
  BLOG_PREVIEW_CARD_MIN_HEIGHT_CLASS,
  lineClampStyle,
  titleClampStyle,
  truncateText,
} from "@/components/dynamic-content/card-utils";
import { buildBlogPostHref, ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Props = {
  post: PostCard;
  style?: CSSProperties;
  className?: string;
  imageSizes?: string;
};

const pillClass =
  "inline-flex min-w-0 max-w-full items-center rounded-md font-semibold tracking-tight bg-blue-100 px-2.5 py-1 text-[0.75rem] sm:text-xs text-slate-700 sm:px-3 sm:py-1 sm:text-sm";
const pillLabelClass = "block max-w-full truncate";

export default function BlogArchiveCard({ post, style, className, imageSizes = "(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" }: Props) {
  const href = buildBlogPostHref(post.slug) ?? ROUTES.blog;
  const date = post.date ? new Date(post.date) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : "";
  const summarySource = post.contentPlain || stripHtml(post.excerpt || "");
  const summary = truncateText(summarySource, 260);
  const categories = post.categories ?? [];

  return (
    <div className={cn("min-w-0 h-full", className)} style={style}>
      <SmartLink
        href={href}
        className="group block h-full min-w-0 rounded-3xl focus-visible:outline-hidden"
        title={post.title}
        data-icon-affordance="right"
      >
        <Card
          interactive
          className={cn(
            "flex h-full min-w-0 flex-col overflow-hidden",
            BLOG_PREVIEW_CARD_MIN_HEIGHT_CLASS,
          )}
        >
          <CardHeader className="px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
            <CardTitle className="min-h-12 font-bold leading-tight" style={titleClampStyle}>
              {post.title}
            </CardTitle>
          </CardHeader>

          <div
            className="relative w-full overflow-hidden bg-slate-100"
            style={{ aspectRatio: "16 / 9" }}
          >
            {post.featuredImage?.url ? (
              <Image
                fill
                src={post.featuredImage.url}
                alt={post.featuredImage.altText ?? post.title}
                sizes={imageSizes}
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-linear-to-r from-[#0045d7] to-[#00e3fe]" />
            )}
          </div>

          <CardContent className="flex flex-1 flex-col px-5 pb-4 pt-5 sm:px-6 sm:pb-6">
            <div className="flex min-h-5 items-center text-sm text-slate-600">
              {dateLabel ? <span>{dateLabel}</span> : null}
            </div>

            <div className="mt-3 min-h-18">
              {summary ? (
                <p className="text-sm leading-6 text-slate-600" style={lineClampStyle}>
                  {summary}
                </p>
              ) : null}
            </div>

            <div className="relative mt-3 min-h-11 -mx-5 sm:-mx-6">
              <div className="flex flex-nowrap gap-2 overflow-x-auto px-5 pb-2 scrollbar-none sm:px-6">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className={pillClass}
                  >
                    <span className={pillLabelClass}>{cat}</span>
                  </span>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-1 left-0 w-6 bg-linear-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-y-1 right-0 w-6 bg-linear-to-l from-white to-transparent" />
            </div>
          </CardContent>

          <CardFooter className="mt-auto flex justify-end border-t border-blue-200 bg-blue-50 px-5 py-4 font-semibold text-slate-700 sm:px-6">
            <span className="inline-flex items-center gap-2 text-base font-semibold tracking-wide">
              Read full article
              <ArrowRight className="w-4 h-4 inline ml-2 icon-affordance" />
            </span>
          </CardFooter>
        </Card>
      </SmartLink>
    </div>
  );
}

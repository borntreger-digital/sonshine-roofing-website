import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/utils/SmartLink";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectSummary } from "@/lib/content/project-types";
import {
  CONTENT_PREVIEW_MEDIA_CLASS,
  lineClampStyle,
  PROJECT_PREVIEW_CARD_MIN_HEIGHT_CLASS,
  titleClampStyle,
  truncateText,
} from "@/components/dynamic-content/card-utils";
import { buildProjectHref, buildProjectHrefFromUri, ROUTES } from "@/lib/routes";
import ProjectReviewSnippet from "@/components/dynamic-content/project/ProjectReviewSnippet";
import { ProjectFacts, ProjectNeighborhood } from "./ProjectMetadata";
import { cn } from "@/lib/utils";

type Props = {
  project: ProjectSummary;
  style?: CSSProperties;
  className?: string;
  imageSizes?: string;
};

export default function ProjectArchiveCard({ project, style, className, imageSizes = "(min-width: 1024px) 50vw, 100vw" }: Props) {
  const href =
    buildProjectHref(project.slug) ??
    buildProjectHrefFromUri(project.uri) ??
    project.uri ??
    ROUTES.project;
  const summary = truncateText(project.projectDescription ?? "", 260);
  const hasReview = typeof project.reviewSnippet === "string" && project.reviewSnippet.trim().length > 0;

  return (
    <div className={cn("h-full min-w-0", className)} style={style}>
      <SmartLink
        href={href}
        className="block h-full min-w-0 rounded-3xl bg-amber-50/50 group focus-visible:outline-hidden"
        data-icon-affordance="right"
      >
        <Card
          interactive
          className={cn(
            "proj-card flex h-full min-w-0 flex-col",
            PROJECT_PREVIEW_CARD_MIN_HEIGHT_CLASS,
          )}
        >
          <div
            className={CONTENT_PREVIEW_MEDIA_CLASS}
            style={{ aspectRatio: "16 / 10" }}
          >
            {project.heroImage?.url ? (
              <Image
                fill
                src={project.heroImage.url}
                alt={project.heroImage.altText ?? project.title}
                sizes={imageSizes}
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-linear-to-r from-[#0045d7] to-[#00e3fe]" />
            )}
          </div>

          <CardHeader className="px-5 pt-5 pb-5 sm:px-6 sm:pt-6">
            <CardTitle className="min-h-15 text-2xl font-bold leading-tight" style={titleClampStyle}>
              {project.title}
            </CardTitle>
            <div className="min-h-10">
              <ProjectNeighborhood project={project} />
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col px-5 pt-5 pb-4 sm:px-6 sm:pb-6">
            <div className="min-h-21">
              {summary ? (
                <p className="text-slate-600 leading-7" style={lineClampStyle}>
                  {summary}
                </p>
              ) : null}
            </div>

            <div className="mt-5 min-h-32">
              {hasReview ? (
                <ProjectReviewSnippet
                  review={project.reviewSnippet}
                  author={project.reviewAuthorName}
                  className="mt-0"
                />
              ) : null}
            </div>

            <ProjectFacts project={project} className="mt-5" />
          </CardContent>

          <CardFooter className="mt-auto flex justify-end border-t border-blue-200 bg-blue-50 px-5 py-4 font-semibold text-slate-700 sm:px-6">
            <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-wide">
              View project
              <ArrowRight className="w-4 h-4 inline ml-2 icon-affordance" />
            </span>
          </CardFooter>
        </Card>
      </SmartLink>
    </div>
  );
}

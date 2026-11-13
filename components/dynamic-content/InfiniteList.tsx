"use client";

import Image from "next/image";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { PageResult, ResourceKind, ResourceQuery } from "@/lib/ui/pagination";
import type { PostCard } from "@/lib/content/content-types";
import type { VideoItem } from "@/lib/content/video-types";
import type { ProjectSummary } from "@/lib/content/project-types";
import { fetchPage, setCachedPages } from "@/lib/content/resource-fetch";
import { useIntersection } from "@/lib/ui/useIntersection";
import GridLoadingState from "@/components/layout/GridLoadingState";
import Grid from "@/components/layout/Grid";
import BlogArchiveCard from "@/components/dynamic-content/blog/BlogArchiveCard";
import ProjectArchiveCard from "@/components/dynamic-content/project/ProjectArchiveCard";

import SmartLink from "@/components/utils/SmartLink";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { lineClampStyle, truncateText } from "@/components/dynamic-content/card-utils";
import { buildProjectHref } from "@/lib/routes";

const smallPillClass =
    "inline-flex min-w-0 max-w-full items-center rounded-xl font-semibold tracking-tight bg-blue-100 px-2.5 py-1 text-[0.75rem] sm:text-xs text-slate-800 sm:px-3 sm:py-1 sm:text-sm";
const pillLabelClass = "block max-w-full truncate";

type Props<T> = {
    kind: ResourceKind;
    initial: PageResult<T>;
    filters: Record<string, unknown>;
    pageSize?: number;
    gridClass?: string;
    gridLayoutClassName?: string;
    renderItem?: (item: T, i: number) => ReactNode;
    skeletonCount?: number;
    onVideoOpen?: (item: T) => void;
    onVisibleCountChange?: (count: number) => void;
    onTotalChange?: (total: number) => void;
};

type RenderFn<T> = (item: T, index: number) => ReactNode;

const Frame: React.FC<{
    src?: string;
    alt?: string;
    ratio?: `${number} / ${number}`;
    className?: string;
    sizes?: string;
    priority?: boolean;
}> = ({ src, alt = "", ratio = "16 / 9", className, sizes, priority }) => {
    const style: CSSProperties = { aspectRatio: ratio };
    if (!src) return <div className={className} style={style} />;
    const wrapperClass = ["relative overflow-hidden bg-blue-100", className]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={wrapperClass} style={style}>
            <Image
                fill
                src={src}
                alt={alt}
                sizes={sizes}
                priority={priority}
                className="object-cover"
            />
        </div>
    );
};

const renderBlogItem = (post: PostCard): ReactNode => <BlogArchiveCard post={post} />;

const renderVideoItem = (
    video: VideoItem,
    index: number,
    onVideoOpen?: (item: VideoItem) => void
): ReactNode => {
    const safeKey = video.id ?? video.slug ?? video.youtubeId ?? index;
    const safeSlug = String(safeKey);
    const categories = video.categories ?? [];
    const catNames = categories.map((category) => category.name).filter(Boolean).join(", ");
    const bucketSlugs = categories
        .map((category) => category.slug ?? category.name ?? "")
        .filter((value) => value.length > 0)
        .join(",");
    const materialSlugs = (video.materialTypes ?? [])
        .map((term) => term.slug ?? "")
        .filter(Boolean)
        .join(",");
    const serviceSlugs = (video.serviceAreas ?? [])
        .map((term) => term.slug ?? "")
        .filter(Boolean)
        .join(",");
    const description = truncateText(String(video.excerpt ?? ""), 220);

    const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onVideoOpen?.(video);
    };

    return (
        <div className="vid-item block" data-video-slug={safeSlug}>
            <Card
                className="vid-card overflow-hidden"
                data-title={video.title}
                data-cats={catNames}
                data-bucket={bucketSlugs}
                data-mt={materialSlugs}
                data-sa={serviceSlugs}
            >
                <CardHeader>
                    <CardTitle className="text-xl font-bold">{video.title}</CardTitle>
                </CardHeader>

                <button
                    type="button"
                    aria-label={`Play ${video.title || "video"}`}
                    onClick={handleOpen}
                    data-video-slug={safeSlug}
                    className="group/video-play relative block w-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-blue)"
                >
                    <div
                        className="relative w-full overflow-hidden bg-blue-200"
                    >
                        <Frame
                            src={video.thumbnailUrl}
                            alt={video.title}
                            ratio="16 / 9"
                            className="object-cover w-full transition-transform duration-300 motion-reduce:transition-none motion-safe:group-hover/video-play:scale-[1.06]"
                            sizes="(min-width: 1024px) 50vw, 100vw"
                        />
                    </div>
                    <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover/video-play:bg-black/15">
                        <span className="grid place-items-center rounded-xl bg-white/90 p-4 shadow-md">
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 fill-slate-900">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                    </span>
                </button>

                <CardContent className="px-5 pb-4 pt-5 sm:px-6 sm:pb-6">
                    {description && (
                        <p className="text-sm text-slate-600" style={lineClampStyle}>
                            {description}
                        </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <span
                                key={`${safeKey}-${category.slug ?? category.name}`}
                                className={smallPillClass}
                            >
                                <span className={pillLabelClass}>{category.name}</span>
                            </span>
                        ))}
                    </div>

                    {video.projectSlug ? (
                        <div className="mt-3">
                            <SmartLink
                                href={buildProjectHref(video.projectSlug)!}
                                className="text-sm font-medium text-[#0045d7] hover:underline"
                            >
                                See full project details
                            </SmartLink>
                        </div>
                    ) : null}
                </CardContent>
                <CardFooter className="flex justify-end border-t border-blue-200 bg-blue-50 font-semibold px-5 py-4 text-slate-700 sm:px-6">
                    <button
                        type="button"
                        onClick={handleOpen}
                        data-video-slug={safeSlug}
                        className="items-center gap-2 text-base font-semibold tracking-wide"
                        data-icon-affordance="right"
                    >
                        Watch video
                        <ArrowRight className="inline ml-2 icon-affordance h-4 w-4" aria-hidden="true" />
                    </button>
                </CardFooter>
            </Card>

            <template className="vid-body-src" suppressHydrationWarning>
                {String(video.excerpt ?? "")}
            </template>
        </div>
    );
};

const renderProjectItem = (project: ProjectSummary): ReactNode => <ProjectArchiveCard project={project} />;

export default function InfiniteList<T>(props: Props<T>) {
    // Query/result identity owns pagination state and cancels the old request on unmount.
    const key = JSON.stringify([props.kind, props.pageSize, props.filters, props.initial]);
    return <InfiniteListQuery key={key} {...props} />;
}

function InfiniteListQuery<T>({
    kind,
    initial,
    filters,
    pageSize = 24,
    gridClass = "",
    gridLayoutClassName,
    renderItem,
    skeletonCount,
    onVideoOpen,
    onVisibleCountChange,
    onTotalChange,
}: Props<T>) {
    const baseQuery: ResourceQuery = useMemo(() => ({ first: pageSize, filters }), [pageSize, filters]);
    const initialPages = useMemo(() => [initial], [initial]);
    const effectiveGridClassName = useMemo(
        () => ["auto-rows-fr", gridClass].filter(Boolean).join(" "),
        [gridClass]
    );

    const [pages, setPages] = useState<PageResult<T>[]>(initialPages);
    const [loading, setLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setCachedPages(kind, baseQuery, initialPages);
        return () => abortRef.current?.abort();
    }, [kind, baseQuery, initialPages]);

    const items = pages.flatMap((page) => page.items);
    useEffect(() => {
        if (typeof onVisibleCountChange === "function") {
            onVisibleCountChange(items.length);
        }
    }, [items.length, onVisibleCountChange]);

    const derivedTotal = useMemo(() => {
        for (let i = pages.length - 1; i >= 0; i -= 1) {
            const candidate = pages[i]?.total;
            if (typeof candidate === "number") return candidate;
        }
        return null;
    }, [pages]);

    useEffect(() => {
        if (typeof onTotalChange === "function" && typeof derivedTotal === "number") {
            onTotalChange(derivedTotal);
        }
    }, [derivedTotal, onTotalChange]);

    const lastPage = pages[pages.length - 1];
    const hasMore = !!lastPage?.pageInfo?.hasNextPage;
    const after = lastPage?.pageInfo?.endCursor ?? null;

    const [rootMargin, setRootMargin] = useState("600px");
    useEffect(() => {
        const choose = () =>
            typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
                ? "800px"
                : "400px";
        const apply = () => setRootMargin(choose());
        apply();
        window.addEventListener("resize", apply);
        return () => window.removeEventListener("resize", apply);
    }, []);

    const { ref: sentinelRef, intersecting } = useIntersection<HTMLDivElement>({ root: null, rootMargin });
    const firedRef = useRef(false);
    useEffect(() => {
        if (!intersecting) {
            firedRef.current = false;
        }
    }, [intersecting]);
    const skeletonCountEff = typeof skeletonCount === "number" ? skeletonCount : Math.min(pageSize, 12);

    useEffect(() => {
        if (!intersecting || !hasMore || loading || firedRef.current) return;

        firedRef.current = true;
        setLoading(true);
        const ac = new AbortController();
        abortRef.current = ac;

        fetchPage<T>(kind, { ...baseQuery, after }, ac.signal)
            .then((next) => {
                if (ac.signal.aborted) return;
                const nextPages = [...pages, next];
                setPages(nextPages);
                setCachedPages(kind, baseQuery, nextPages);
            })
            .catch((error: unknown) => {
                if (error instanceof Error && error.name !== "AbortError") {
                    console.warn("[InfiniteList] fetch error:", error);
                }
            })
            .finally(() => {
                if (abortRef.current === ac) abortRef.current = null;
                setLoading(false);
            });
    }, [intersecting, hasMore, loading, kind, after, baseQuery, pages]);

    const effectiveRender: RenderFn<T> = (item, index) => {
        if (renderItem) return renderItem(item, index);
        switch (kind) {
            case "blog":
                return renderBlogItem(item as unknown as PostCard);
            case "video":
                return renderVideoItem(
                        item as unknown as VideoItem,
                        index,
                        onVideoOpen as ((video: VideoItem) => void) | undefined
                    );
            case "project":
                return renderProjectItem(item as unknown as ProjectSummary);
            default:
                return null;
        }
    };

    const resolveItemKey = (item: T, index: number): string => {
        if (kind === "blog") {
            const post = item as Partial<PostCard>;
            return (typeof post.slug === "string" && post.slug) || `blog-${index}`;
        }
        if (kind === "video") {
            const video = item as Partial<VideoItem>;
            return (
                (video.id && String(video.id)) ||
                (video.slug ?? video.youtubeId) ||
                `video-${index}`
            );
        }
        if (kind === "project") {
            const project = item as Partial<ProjectSummary>;
            return project.slug ?? project.uri ?? `project-${index}`;
        }
        const fallback = item as { slug?: unknown; id?: unknown };
        if (typeof fallback.slug === "string") return fallback.slug;
        if (typeof fallback.id === "string" || typeof fallback.id === "number") {
            return String(fallback.id);
        }
        return `${kind}-item-${index}`;
    };

    const loaderVariant = kind === "blog" ? "blog" : kind === "video" ? "video" : "project";

    return (
        <>
            <Grid 
                className={effectiveGridClassName} 
                layoutClassName={gridLayoutClassName}
                data-loading={loading ? "true" : "false"}
            >
                {items.map((item, index) => {
                    const uniqueKey = resolveItemKey(item, index);
                    return (
                        <Fragment key={uniqueKey}>
                            {effectiveRender(item, index)}
                        </Fragment>
                    );
                })}
            </Grid>

            {loading && (
                <GridLoadingState
                    variant={loaderVariant}
                    count={skeletonCountEff}
                    className={effectiveGridClassName}
                    layoutClassName={gridLayoutClassName}
                />
            )}

            <div ref={sentinelRef} aria-hidden="true" />

            {!hasMore && items.length > 0 ? (
                <div className="mt-6 text-center text-sm text-slate-500">You’ve reached the end.</div>
            ) : null}
        </>
    );
}

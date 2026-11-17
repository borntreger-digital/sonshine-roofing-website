"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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

import VideoArchiveCard from "@/components/dynamic-content/video/VideoArchiveCard";
import { BLOG_ARCHIVE_GRID_LAYOUT_CLASS, PROJECT_ARCHIVE_GRID_LAYOUT_CLASS } from "@/components/dynamic-content/card-utils";

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

const renderBlogItem = (post: PostCard): ReactNode => <BlogArchiveCard post={post} variant="archive" />;

const renderVideoItem = (
    video: VideoItem,
    index: number,
    onVideoOpen?: (item: VideoItem) => void
): ReactNode => <VideoArchiveCard video={video} index={index} onVideoOpen={onVideoOpen} />;

const renderProjectItem = (project: ProjectSummary): ReactNode => <ProjectArchiveCard project={project} variant="archive" />;

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
        () => ["items-stretch", gridClass].filter(Boolean).join(" "),
        [gridClass]
    );
    const effectiveGridLayoutClassName = gridLayoutClassName ?? (
        kind === "project" ? PROJECT_ARCHIVE_GRID_LAYOUT_CLASS :
        kind === "blog" ? BLOG_ARCHIVE_GRID_LAYOUT_CLASS : undefined
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
                layoutClassName={effectiveGridLayoutClassName}
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
                    blogVariant={kind === "blog" ? "archive" : undefined}
                    projectVariant={kind === "project" ? "archive" : undefined}
                    count={skeletonCountEff}
                    className={effectiveGridClassName}
                    layoutClassName={effectiveGridLayoutClassName}
                />
            )}

            <div ref={sentinelRef} aria-hidden="true" />

            {!hasMore && items.length > 0 ? (
                <div className="mt-6 text-center text-sm text-slate-500">You’ve reached the end.</div>
            ) : null}
        </>
    );
}

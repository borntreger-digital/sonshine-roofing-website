import type { ReactNode } from "react";
import LatestPostsFilterClient from "./LatestPostsFilter.client";
import BlogArchiveCard from "@/components/dynamic-content/blog/BlogArchiveCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PostCard } from "@/lib/content/content-types";
import { CONTENT_PREVIEW_LIMIT } from "@/lib/content/preview-selection";
import { CONTENT_PREVIEW_IMAGE_SIZES } from "@/components/dynamic-content/card-utils";
import {
  POST_TAB_CONFIG,
  type CategoryKey,
} from "@/components/dynamic-content/latest-filters/latest-tab-config";
import {
  groupPostsByCategory,
  orderTabs,
} from "@/components/dynamic-content/latest-filters/latest-tab-utils";

type Props = {
  posts: PostCard[];
  initial?: number;
  showHeader?: boolean;
};

type TabPayload = {
  key: CategoryKey;
  totalCount: number;
  slugs: string[];
};

type CardLookup = Record<string, ReactNode>;

const sectionDescription =
  
"Whether you are looking for a full roof replacement or just considering options, explore our in-depth roofing blog to learn more about material choices, hurricane preparation, energy efficiency, and more.";

function buildCardLookup(posts: PostCard[]): CardLookup {
  return posts.reduce((acc, post) => {
    if (!post?.slug) return acc;
    acc[post.slug] = (
      <BlogArchiveCard
        key={post.slug}
        post={post}
        variant="standard"
        imageSizes={CONTENT_PREVIEW_IMAGE_SIZES}
      />
    );
    return acc;
  }, {} as CardLookup);
}

function buildTabs(groups: Record<CategoryKey, PostCard[]>, initial: number): TabPayload[] {
  const order = orderTabs(POST_TAB_CONFIG);
  return order.map((key) => {
    const items = groups[key] ?? [];
    const trimmed = items.slice(0, Math.max(0, initial));
    return {
      key,
      totalCount: items.length,
      slugs: trimmed.map((post) => post.slug).filter(Boolean),
    };
  });
}

function buildEmptyState(): ReactNode {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="font-medium">No matching posts</CardTitle>
      </CardHeader>
      <div className="w-full h-48 bg-slate-100" />
      <CardContent>
        <p className="text-sm text-slate-600">Try another filter.</p>
      </CardContent>
    </Card>
  );
}

export default function LatestPostsFilter({ posts, initial = CONTENT_PREVIEW_LIMIT, showHeader = true }: Props) {
  const groups = groupPostsByCategory(posts ?? []);
  const tabs = buildTabs(groups, initial);
  const cardLookup = buildCardLookup(posts ?? []);
  const emptyState = buildEmptyState();

  const initialKey =
    tabs.find((tab) => tab.slugs.length > 0)?.key ?? orderTabs(POST_TAB_CONFIG)[0];

  return (
    <LatestPostsFilterClient
      showHeader={showHeader}
      description={sectionDescription}
      ctaHref="/blog"
      ctaLabel="See Blog Archive"
      tabs={tabs}
      initialKey={initialKey}
      cardLookup={cardLookup}
      emptyState={emptyState}
    />
  );
}

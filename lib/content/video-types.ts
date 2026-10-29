import type { FacetGroup, TermLite } from './project-types';
import type { PageResult } from '../ui/pagination';

/** Managed category slugs also use the existing `bk` filter parameter. */
export type VideoBucketKey = string;
export type VideoCategory = TermLite & { sort: number };

export type VideoItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  youtubeUrl: string;
  youtubeId: string;
  thumbnailUrl: string;
  source: 'video_entry' | 'project';
  /** Website publication date; this is the archive chronology. */
  date: string;
  modified: string | null;
  /** Verified YouTube upload date, never inferred from the website date. */
  uploadDate: string | null;
  categories: TermLite[];
  legacyIds: string[];
  materialTypes: TermLite[];
  serviceAreas: TermLite[];
  /** Present only when the related project is published in this deployment. */
  projectSlug?: string;
  projectUri?: string;
  projectNoindex?: boolean;
};

export type VideoFiltersInput = {
  buckets?: VideoBucketKey[];
  categorySlugs?: string[];
  materialTypeSlugs?: string[];
  serviceAreaSlugs?: string[];
  q?: string;
};

export type VideoSnapshot = {
  version: 3;
  clientSlug: string;
  videos: VideoItem[];
  categories: VideoCategory[];
};

export type VideoSearchResult = PageResult<VideoItem> & { facets: FacetGroup[] };

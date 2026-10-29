import type { ReviewPlatform } from "../reviews/platforms";
import type { PageInfo } from "../ui/pagination";
import type { VideoItem } from './video-types';

export type ProjectImage = { url: string; altText: string; width?: number | null; height?: number | null };
export type TermLite = { name: string; slug: string };

export type RoofColorTerm = TermLite & { materialTypeSlug: string };

export type ProductLink = { productName: string; productLink: string | null };

export type ProjectTestimonial = {
  customerName?: string;
  customerReview: string;
  reviewUrl?: string;
  reviewDate?: string;
  reviewPlatform: ReviewPlatform;
};

export type ProjectSummary = {
  id?: string;
  neighborhood?: { id: string; name: string; slug: string } | null;
  slug: string;
  uri: string;
  title: string;
  year: number | null;
  /** Optional ISO publish date (used for recency sorting) */
  date?: string | null;
  heroImage: ProjectImage | null;
  /** Project summary copy from Directus description */
  projectDescription?: string | null;
  /** Optional homeowner review snippet + attribution */
  reviewSnippet?: string | null;
  reviewAuthorName?: string | null;
  /** Optional taxonomy terms to enable client-side filtering */
  materialTypes?: TermLite[];
  /** Additional taxonomies for client-side filtering */
  roofColors?: RoofColorTerm[];
  serviceAreas?: TermLite[];
};

export type ProjectFull = ProjectSummary & {
  id: string;
  serviceAreaId: string;
  neighborhood: { id: string; name: string; slug: string } | null;
  scopeKey: string;
  noindex: boolean;
  focusKeywords: string[];
  /** Full ISO date (publish date) */
  date?: string | null;
  /** ISO last-modified date */
  modified?: string | null;
  projectDescription: string | null;
  productLinks: ProductLink[];
  projectImages: ProjectImage[];
  materialTypes: TermLite[];
  roofColors: RoofColorTerm[];
  serviceAreas: TermLite[];
  /** Hydrated from the same deployed video inventory; draft videos are null. */
  video: VideoItem | null;
  customerTestimonial?: ProjectTestimonial | null;
  /** Normalized Directus SEO block for OG/Twitter + JSON-LD mapping */
  seo?: {
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    openGraph?: {
      title?: string | null;
      description?: string | null;
      type?: string | null;
      image?: {
        url?: string | null;
        secureUrl?: string | null;
        width?: number | null;
        height?: number | null;
        type?: string | null;
      } | null;
    } | null;
  };
};

export type ProjectsArchiveFilters = {
  search?: string | null;
  materialTypeSlugs?: string[];
  roofColorSlugs?: string[];
  serviceAreaSlugs?: string[];
};
export type FacetGroup = { taxonomy: string; buckets: Array<TermLite & { count: number }> };
export type ProjectSearchResult = {
  items: ProjectSummary[];
  pageInfo: PageInfo;
  total: number;
  facets: FacetGroup[];
  meta: { overallTotal: number; fullTotal: number };
};
export type ProjectSnapshot = {
  version: 3;
  clientSlug: string;
  projects: ProjectFull[];
  terms: { materials: TermLite[]; roofColors: RoofColorTerm[]; serviceAreas: TermLite[] };
};

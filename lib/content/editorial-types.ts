import type { Post, ContentImage } from './content-types';
import type { PersonSeo } from './person-seo';
export type NormalizedBlogPost = Post & {
  featured?: boolean;
};

export type BlogSitemapEntry = {
  uri: string;
  modified: string | null;
};

export type BlogImageSitemapEntry = BlogSitemapEntry & {
  featuredImage: ContentImage | null;
};
export type PersonImage = {
  url: string;
  altText: string;
  width: number | null;
  height: number | null;
  focalPoint?: { x: number; y: number } | null;
};

export type Person = {
  slug: string;
  title: string;
  firstName: string;
  howHelps: { text: string }[];
  contentHtml: string;
  contentPlain: string;
  featuredImage: PersonImage | null;
  positionTitle: string | null;
  showOnTeam: boolean;
  noindex: boolean;
  primaryFocusKeyword: string | null;
  focusKeywords: string[];
  modifiedAt: string | null;
  seo: PersonSeo;
};

export type PersonNavItem = Pick<Person, 'slug' | 'title' | 'positionTitle' | 'featuredImage'>;

export type PersonSitemapEntry = {
  uri: string;
  modified: string | null;
  featuredImage: PersonImage | null;
};
export type GlossarySummary = {
  slug: string;
  title: string;
  excerpt: string;
};

export type GlossaryImage = {
  url: string;
  altText: string;
  width: number | null;
  height: number | null;
};

export type GlossaryTerm = {
  slug: string;
  title: string;
  contentHtml: string;
  contentPlain: string;
  noindex: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  primaryFocusKeyword: string | null;
  focusKeywords: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageOverride: GlossaryImage | null;
  modified: string | null;
};

export type GlossarySitemapEntry = {
  uri: string;
  modified: string | null;
};
export type SponsorLinks = {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
};

export type SponsorFeature = {
  id: string;
  slug: string;
  title: string | null;
  contentHtml: string | null;
  links: SponsorLinks | null;
  featuredImage: ContentImage | null;
};

export type DirectusSponsorFeature = SponsorFeature & {
  serviceAreaSlugs: string[];
};
export type SpecialOfferImage = {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type SpecialOffer = {
  slug: string;
  title: string;
  eyebrow: string;
  introduction: string;
  description: string;
  descriptionHtml: string;
  featuredImage: SpecialOfferImage | null;
  offerCode: string | null;
  discount: string | null;
  expirationDate: string | null;
  legalDisclaimer: string | null;
  featured: boolean;
  noindex: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  primaryFocusKeyword: string | null;
  focusKeywords: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageOverride: SpecialOfferImage | null;
  dateUpdated: string | null;
};
export type ReviewsCarouselSettings = {
  limit: number;
  gbpProfileLink: string;
};
export type LegalCopy = {
  privacyPolicyHtml: string;
  termsOfUseHtml: string;
};

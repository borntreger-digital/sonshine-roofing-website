import { staticImage } from '@/lib/content/static-media';
import SmartLink from '@/components/utils/SmartLink';
import { ArrowUpRight } from 'lucide-react';
import type { Review } from './types';
import ReviewsCarouselView from './ReviewsCarouselView';
import { reviewDate, safeReviewUrl } from './review-presentation';
import {
  DEFAULT_GOOGLE_BUSINESS_PROFILE_URL,
  getGoogleReviews,
  getReviewsCarouselSettings,
} from '@/lib/content/directus-reviews';

const DEFAULT_CONTAINER_CLASS = 'max-w-[1600px] mx-auto overflow-hidden';

type ReviewsCarouselProps = {
  reviews?: Review[];
  gbpUrl?: string | null;
  className?: string;
  showBusinessProfileLink?: boolean;
  showDisclaimer?: boolean;
  limit?: number;
};

const sanitizeLimit = (value?: number): number =>
  Number.isFinite(value) && value !== undefined && value > 0 ? Math.floor(value) : 20;

/** Sitewide Google feed wrapper. Location pages use the fetch-free view directly. */
export default async function ReviewsCarousel({
  reviews: injectedReviews,
  gbpUrl: injectedGbpUrl,
  className = DEFAULT_CONTAINER_CLASS,
  showBusinessProfileLink = true,
  showDisclaimer = true,
  limit,
}: ReviewsCarouselProps = {}) {
  const settings = await getReviewsCarouselSettings().catch((error) => {
    console.error('[ReviewsCarousel] Failed to load Directus carousel settings:', error);
    return null;
  });
  const safeLimit = sanitizeLimit(limit ?? settings?.limit);
  const resolvedGbpUrl = safeReviewUrl(
    injectedGbpUrl ?? settings?.gbpProfileLink ?? DEFAULT_GOOGLE_BUSINESS_PROFILE_URL,
  );
  if (!resolvedGbpUrl) return null;

  // An explicitly supplied empty list is intentional, never a request for other reviews.
  const sourceReviews = injectedReviews ?? await getGoogleReviews().catch((error) => {
    console.error('[ReviewsCarousel] Failed to load Directus reviews:', error);
    return [];
  });
  const filtered = sourceReviews
    .filter(review => (review.rating ?? 5) === 5)
    .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
    .slice(0, safeLimit);
  if (!filtered.length) return null;

  return (
    <div className={className}>
      <ReviewsCarouselView reviews={filtered.map((review, index) => ({
        id: `google-${index}-${review.author_name}-${review.time ?? 'undated'}`,
        authorName: review.author_name,
        text: review.text,
        rating: review.rating ?? 5,
        ...reviewDate(review.time, review.relative_time_description),
        sourceUrl: safeReviewUrl(review.author_url) ?? resolvedGbpUrl,
        sourceLabel: 'View on Google',
        sourceLogo: staticImage('google-logo'),
      }))} />
      <div className="mx-auto mb-4 flex max-w-6xl flex-wrap justify-center gap-y-4 text-center">
        {showDisclaimer ? (
          <p className="mx-2 text-sm text-slate-500">
            All reviews shown above are automatically pulled from Google using the official API.
          </p>
        ) : null}
        {showBusinessProfileLink ? (
          <p className="text-base font-semibold text-slate-700">
            <SmartLink href={resolvedGbpUrl} target="_blank" rel="noopener noreferrer nofollow"
              aria-label="See All Google Reviews" data-icon-affordance="up-right"
              className="transition-colors hover:text-(--brand-blue)">
              See All Google Reviews
              <ArrowUpRight className="icon-affordance ml-2 inline h-3 w-3" />
            </SmartLink>
          </p>
        ) : null}
      </div>
    </div>
  );
}

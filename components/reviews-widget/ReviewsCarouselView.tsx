import { useId } from 'react';
import SmartLink from '@/components/utils/SmartLink';
import ReviewAttribution from './ReviewAttribution';
import ReviewsSliderLazy from './ReviewsSliderLazy';
import type { CarouselReview } from './types';

/** Shared, fetch-free view. Empty input stays empty and caller order is preserved. */
export default function ReviewsCarouselView({ reviews }: { reviews: CarouselReview[] }) {
  const id = useId();
  if (!reviews.length) return null;
  const fallbackId = `reviews-fallback-${id.replace(/[^A-Za-z0-9_-]/g, '')}`;
  return (
    <div className="relative w-full text-left not-prose" data-reviews-carousel>
      <div id={fallbackId} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-reviews-fallback>
        {reviews.map(review => (
          <article key={review.id} className="flex h-full flex-col rounded-xl border border-slate-200 bg-white/80 p-6 text-left shadow-xs">
            <ReviewAttribution review={review} />
            <blockquote className="mt-4 flex-1 whitespace-pre-line text-base leading-7 text-slate-700">{review.text}</blockquote>
            {review.sourceUrl ? (
              <SmartLink href={review.sourceUrl} target="_blank" rel="noopener noreferrer nofollow"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline underline-offset-4">
                {review.sourceLabel}
              </SmartLink>
            ) : null}
          </article>
        ))}
      </div>
      <ReviewsSliderLazy reviews={reviews} fallbackId={fallbackId} />
    </div>
  );
}

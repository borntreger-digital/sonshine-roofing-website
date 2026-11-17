import { BadgeCheck, CalendarDays } from 'lucide-react';
import { getGoogleReviews, getReviewsCarouselSettings } from '@/lib/content/directus-reviews';
import type { SiteSettings } from '@/lib/content/directus-site';
import { safeReviewUrl, reviewDate } from '@/components/reviews-widget/review-presentation';
import ReviewStarRow from '@/components/reviews-widget/ReviewStarRow';
import SmartLink from '@/components/utils/SmartLink';

export default async function SpecialOfferTrust({ settings }: { settings: SiteSettings | null }) {
  const [reviews, carousel] = await Promise.all([getGoogleReviews(), getReviewsCarouselSettings()]);
  const review = reviews
    .filter((item) => item.rating === 5 && item.text.trim() && item.author_name.trim())
    .sort((a, b) => (b.time ?? 0) - (a.time ?? 0) || a.author_name.localeCompare(b.author_name))[0];
  const sourceUrl = safeReviewUrl(review?.author_url) ?? safeReviewUrl(carousel.gbpProfileLink);
  const date = reviewDate(review?.time);
  const foundingYear = settings?.foundingDate?.match(/^\d{4}/)?.[0];

  return (
    <aside aria-label="Why homeowners choose SonShine" className="space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-700">
        {settings?.licenseNumber && settings.licenseUrl ? (
          <SmartLink
            href={settings.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            <BadgeCheck className="h-5 w-5 text-(--brand-blue)" aria-hidden="true" />
            Florida licensed · {settings.licenseNumber}
          </SmartLink>
        ) : null}
        {foundingYear ? (
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-(--brand-blue)" aria-hidden="true" />
            Serving homeowners since {foundingYear}
          </span>
        ) : null}
      </div>
      {review && sourceUrl ? (
        <figure className="rounded-xl border border-blue-100 bg-white/80 p-5">
          <ReviewStarRow rating={review.rating ?? 5} />
          <blockquote className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {review.text}
          </blockquote>
          <figcaption className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="font-semibold">{review.author_name}</span>
            {date.dateTime ? <time dateTime={date.dateTime}>{date.dateLabel}</time> : null}
            <SmartLink
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-(--brand-blue) underline underline-offset-2"
            >
              View on Google
            </SmartLink>
          </figcaption>
        </figure>
      ) : null}
    </aside>
  );
}

// IMPORTS
import StaticImage from '@/components/media/StaticImage';
import { ArrowUpRight, BadgeCheck } from 'lucide-react';
import SmartLink from '@/components/utils/SmartLink';
import { renderHighlight } from '@/components/utils/renderHighlight';
import { GOOGLE_REVIEW_SUMMARY } from '@/lib/reviews-summary';
import {
  DEFAULT_GOOGLE_BUSINESS_PROFILE_URL,
  getReviewsCarouselSettings,
} from '@/lib/content/directus-reviews';

// LINKS
const YELP_PROFILE_URL = 'https://www.yelp.com/biz/sonshine-roofing-sarasota';
const ANGI_PROFILE_URL =
  'https://www.angi.com/companylist/us/fl/sarasota/sonshine-roofing-reviews-7970755.htm';
const FACEBOOK_PROFILE_URL = 'https://www.facebook.com/sonshineroofing';
const NEXTDOOR_PROFILE_URL =
  'https://nextdoor.com/page/sonshine-roofing-sarasota-fl?utm_campaign=1763612646168&share_action_id=ec8cdd35-bc00-464d-a93a-da23de117ddc';

// LOGO SRC
const GOOGLE_LOGO_SRC = 'static:google-logo';
const YELP_LOGO_SRC =
  'static:yelp-logo-icon';
const ANGI_LOGO_SRC = 'static:angi-logo-icon';
const FACEBOOK_LOGO_SRC =
  'static:facebook-logo';
const NEXTDOOR_LOGO_SRC =
  'static:nextdoor-house-icon';

type HeroTrustBarProps = {
  heading?: string;
  highlightText?: string;
  gbpUrl?: string | null;
};

// REVIEW LINK STYLES
const REVIEW_SMARTLINK_CONTAINER_STYLES =
  'h-full w-full group inline-flex w-full mx-auto items-start gap-4 rounded-3xl border border-blue-100 bg-white/80 px-4 py-4 text-left shadow-lg transition hover:border-(--brand-cyan) hover:shadow-xl focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-cyan)';
const REVIEW_SMARTLINK_ARROWUPRIGHT_STYLES =
  'icon-affordance text-(--brand-blue) absolute h-4 w-4 top-0 right-0';
const REVIEW_LINK_TITLE_BAR = 'mb-2 flex flex-col px-2 justify-start';
const LOGO_STYLES =
  'h-8 w-8 rounded-md border border-blue-100 bg-white object-contain p-1 shadow-xs';
const TITLE_BASE = 'mx-2 text-lg font-semibold text-slate-900';
const TITLE_ACCENT = 'text-(--brand-orange)';
const TITLE_ACCENT_GOOGLE = 'text-blue-600';
const TITLE_ACCENT_NEXTDOOR = 'text-emerald-600';
const TITLE_ACCENT_FACEBOOK = 'text-blue-600';
const TITLE_ACCENT_YELP = 'text-red-500';
const TITLE_ACCENT_ANGI = 'text-red-500';
const REVIEW_FEATURE = 'italic text-sm text-slate-700 transition group-hover:text-slate-600';
const TITLE_AND_LOGO = 'flex flex-row justify-start';
const REVIEW_COUNT = 'text-xs text-slate-500 mb-2';

// BADGES STYLES
const BADGE_TITLE_STYLES = 'text-xl text-slate-800';
const BADGE_SUBTITLE_STYLES = 'text-slate-600 text-base mb-4';
const BADGE_CARD_STYLES =
  'flex-col items-center gap-2 rounded-2xl border border border-blue-100 bg-[#fb9216]/5 p-6 text-center shadow-inner transition hover:-translate-y-1 hover:border-(--brand-blue)/40 hover:shadow-lg';
const BADGE_IMAGE_WRAPPER = 'relative flex h-32 w-full items-center justify-center';
const BADGE_IMAGE_CLASS = 'h-full w-auto max-w-[300px] object-contain drop-shadow-xs';
const BADGE_IMAGE_SIZES =
  '(min-width: 1280px) 200px, (min-width: 1024px) 180px, (min-width: 768px) 33vw, 50vw';

// HEADINGS
const DEFAULT_HEADING = 'You Want a Top-Rated Roofer? You Found It.';
const DEFAULT_HEADING_HIGHLIGHT = 'Top-Rated Roofer';

const hexToRgba = (hex: string, alpha: number) => {
  const normalizedHex = hex.replace('#', '');
  const value =
    normalizedHex.length === 3
      ? normalizedHex
          .split('')
          .map((char) => char + char)
          .join('')
      : normalizedHex;
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const REVIEW_LINKS = [
  {
    id: 'google',
    href: DEFAULT_GOOGLE_BUSINESS_PROFILE_URL,
    ariaLabel: `View our ${GOOGLE_REVIEW_SUMMARY.rating}-star Google Business Profile reviews (opens in a new tab)`,
    statValue: String(GOOGLE_REVIEW_SUMMARY.reviewCount),
    statDescriptor: 'Reviews',
    logo: { src: GOOGLE_LOGO_SRC, alt: 'Google logo' },
    title: 'Google',
    rating: String(GOOGLE_REVIEW_SUMMARY.rating),
    showStar: true,
    accentClass: TITLE_ACCENT_GOOGLE,
    accentHex: '#2563eb',
    quote:
      '\u201CIt’s one thing for me to give a good review as a customer which I am. But I talked to a roofer in our neighborhood and he gave SonShine Roofing a compliment. He saw the job done on the under layment and said it was very well done. The layment was tucked under the eves. I figured that was a better testament to job well done. Because it was from someone in the industry.\u201D -Adam B.',
  },
  {
    id: 'yelp',
    href: YELP_PROFILE_URL,
    ariaLabel: 'View our 4.2-star Yelp Profile reviews (opens in a new tab)',
    statValue: '22+',
    statDescriptor: 'Reviews',
    logo: { src: YELP_LOGO_SRC, alt: 'Yelp logo' },
    title: 'Yelp',
    rating: '4.2',
    showStar: true,
    accentClass: TITLE_ACCENT_YELP,
    accentHex: '#ef4444',
    quote:
      '\u201CAfter replacing my roof due to the impact of Hurricane Ian, SonShine Roofing recently followed up to make sure there were no issues from Hurricane Idalia. I thought their follow up and customer service was excellent!! Thank you SonShine Roofing!\u201D –Keri C.',
  },
  {
    id: 'nextdoor',
    href: NEXTDOOR_PROFILE_URL,
    ariaLabel: 'View our Nextdoor Profile reviews (opens in a new tab)',
    statValue: '106+',
    statDescriptor: 'Faves',
    logo: { src: NEXTDOOR_LOGO_SRC, alt: 'Nextdoor logo' },
    title: 'Nextdoor',
    rating: '100%',
    showStar: false,
    accentClass: TITLE_ACCENT_NEXTDOOR,
    accentHex: '#059669',
    quote:
      '\u201CThe best!  Very reasonable  prices, professional, quick response and the  MOST important HONEST. –Amy A.\u201D',
  },
  {
    id: 'angi',
    href: ANGI_PROFILE_URL,
    ariaLabel: 'View our 4.6-star Angi Profile reviews (opens in a new tab)',
    statValue: '39+',
    statDescriptor: 'Reviews',
    logo: { src: ANGI_LOGO_SRC, alt: 'Angi logo' },
    title: 'Angi',
    rating: '4.6',
    showStar: true,
    accentClass: TITLE_ACCENT_ANGI,
    accentHex: '#ef4444',
    quote:
      '\u201CIt went very well. We met- the representative was on time, completed his work quickly and he took the time to clearly discuss his findings. He was helpful in offering us realistic options for roof replacement.\u201D –A.S.',
  },
  {
    id: 'facebook',
    href: FACEBOOK_PROFILE_URL,
    ariaLabel: 'View our 94% Recommended Facebook Profile reviews (opens in a new tab)',
    statValue: '24+',
    statDescriptor: 'Reviews',
    logo: { src: FACEBOOK_LOGO_SRC, alt: 'Facebook logo' },
    title: 'Facebook',
    rating: '94%',
    showStar: false,
    accentClass: TITLE_ACCENT_FACEBOOK,
    accentHex: '#2563eb',
    quote:
      '\u201CSonShine did an awesome job on my roof. Their system for getting everything done was very refined, no downtime whatsoever once the replacement had started. I can’t recommend them enough. The quality and craftsmanship is VERY apparent post install.\u201D –Christopher Johnson',
  },
] as const;

// BADGE ARRAY
const BADGES = [
  {
    id: 'badge-1',
    label: 'GAF Master Elite Cerified',
    subtitle: 'Industry-leading warranties and premium roofing materials you can rely on.',
    href: 'https://www.gaf.com/en-us/roofing-contractors/residential/sonshine-roofing-inc-1104247',
    src: 'static:gaf-master-elite-contractor-seal',
    alt: 'GAF Master Elite Contractor Seal',
  },
  {
    id: 'badge-4',
    label: 'My Safe FL Home Certified',
    subtitle:
      'Prepare for hurricane season and save thousands in insurance costs and wind mitigation services.',
    href: 'https://mysafeflhome.com',
    src: 'static:my-safe-fl-home-logo',
    alt: 'My Safe FL Home Certified Roofing Contractor in Florida',
  },
  {
    id: 'badge-3',
    label: 'A+ Rating with the BBB',
    subtitle: 'Stability and a longstanding reputation in the community.',
    href: 'https://www.bbb.org/us/fl/sarasota/profile/roofing-contractors/sonshine-roofing-inc-0653-6096353/#sealclick',
    src: 'static:bbb-a-plus-accredited-business-seal',
    alt: 'A+ Rated Roofing Contractor with the Better Business Bureau',
  },
  {
    id: 'badge-2',
    label: 'Best Roofers in Sarasota Award (2025)',
    subtitle:
      'Forbes affiliate Expertise.com has recognized our best-in-class customer service and workmanship.',
    href: 'https://www.expertise.com/fl/sarasota/roofing',
    src: 'https://res.cloudinary.com/expertise-com/image/upload/v1767650446/remote_media/assets/awards/fl_sarasota_roofing_2026.svg',
    alt: 'Expertise.com Best Roofers in Sarasota Award (2025)',
  },
] as const;

export default async function HeroTrustBar({
  heading = DEFAULT_HEADING,
  highlightText = DEFAULT_HEADING_HIGHLIGHT,
  gbpUrl,
}: HeroTrustBarProps = {}) {
  const settings = gbpUrl
    ? null
    : await getReviewsCarouselSettings().catch((error) => {
        console.error('[HeroTrustBar] Failed to load the Directus GBP link:', error);
        return null;
      });
  const resolvedGbpUrl = gbpUrl ?? settings?.gbpProfileLink ?? DEFAULT_GOOGLE_BUSINESS_PROFILE_URL;
  const reviewLinks = REVIEW_LINKS.map((review) =>
    review.id === 'google' ? { ...review, href: resolvedGbpUrl } : review,
  );
  const renderedHeading = renderHighlight(heading, highlightText);

  return (
    <section aria-label="Trust indicators and recognitions" className="py-12">
      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-6 px-4">
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 md:p-6 lg:p-8 shadow-xl">
          <div className="flex flex-col gap-4 lg:grid md:grid md:grid-cols-2 lg:grid-cols-3 lg:items-center lg:justify-between">
            <div className="max-w-3xl text-center lg:text-left">
              <p className="text-xs md:text-base font-semibold uppercase tracking-wider text-slate-500">
                39+ YEARS OF ROOFING EXCELLENCE
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900 md:text-3xl">
                {renderedHeading}
              </h2>
              <p className="my-3 text-slate-600 md:text-lg">
                Our reputation speaks for itself
                <BadgeCheck className="h-5 w-5 text-emerald-700 inline ml-2" />
              </p>
            </div>
            {reviewLinks.map((review) => (
              <SmartLink
                key={review.id}
                href={review.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={review.ariaLabel}
                className={REVIEW_SMARTLINK_CONTAINER_STYLES}
                data-icon-affordance="up-right"
                style={{ backgroundColor: hexToRgba(review.accentHex, 0.1) }}
              >
                <div className="relative">
                  <ArrowUpRight className={REVIEW_SMARTLINK_ARROWUPRIGHT_STYLES} />
                  <div className={REVIEW_LINK_TITLE_BAR}>
                    <p className={REVIEW_COUNT}>
                      <span className="text-(--brand-blue)">{review.statValue} </span>
                      {review.statDescriptor}
                    </p>
                    <div className={TITLE_AND_LOGO}>
                      <StaticImage
                        src={review.logo.src}
                        alt="" decorative
                        width={48}
                        height={48}
                        className={LOGO_STYLES}
                      />
                      <h3 className={TITLE_BASE}>
                        {review.title} –{' '}
                        <span className={review.accentClass}>{review.rating} </span>
                        {review.showStar && <span className={TITLE_ACCENT}>★</span>}
                      </h3>
                    </div>
                  </div>
                  <p className={REVIEW_FEATURE}>{review.quote}</p>
                </div>
              </SmartLink>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="text-center md:text-4xl text-2xl">
              Expert <span className="text-(--brand-blue)">Residential Roofing Contractor</span>
            </h2>
            <p className="text-center text-slate-600 mt-1 mb-8">
              We never use subcontractors&mdash;period. Our expert in-house roofing crews use the
              utmost care and proven techniques when working on your home.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BADGES.map((badge) => (
                <SmartLink
                  key={badge.id}
                  href={badge.href}
                  title={badge.alt}
                  className={BADGE_CARD_STYLES}
                >
                  <h3 className={BADGE_TITLE_STYLES}>{badge.label}</h3>
                  <p className={BADGE_SUBTITLE_STYLES}>{badge.subtitle}</p>
                  {badge.src ? (
                    <div className={BADGE_IMAGE_WRAPPER}>
                      <StaticImage
                        src={badge.src}
                        alt={badge.src.startsWith('static:') ? undefined : badge.alt}
                        width={220}
                        height={80}
                        sizes={BADGE_IMAGE_SIZES}
                        className={BADGE_IMAGE_CLASS}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Artwork coming soon</p>
                  )}
                </SmartLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

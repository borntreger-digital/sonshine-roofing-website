import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ArrowDown, BadgePercent, CalendarClock, Smartphone } from 'lucide-react';

import Section from '@/components/layout/Section';
import SpecialOfferForm from '@/components/lead-capture/special-offer/SpecialOfferForm';
import SpecialOfferTrust from '@/components/lead-capture/special-offer/SpecialOfferTrust';
import Hero from '@/components/ui/Hero';
import SmartLink from '@/components/utils/SmartLink';
import {
  getSpecialOfferBySlug,
  listSpecialOfferSlugs,
} from '@/lib/content/directus-special-offers';
import isExpired from '@/lib/lead-capture/isExpired';
import { formatSpecialOfferExpiration } from '@/lib/lead-capture/specialOfferDates';
import { buildBasicMetadata } from '@/lib/seo/meta';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, offerSchema } from '@/lib/seo/schema';
import { SITE_ORIGIN } from '@/lib/seo/site';
import {
  isSpecialOfferIndexable,
  type SpecialOfferIndexingState,
} from '@/lib/seo/special-offer-indexing';
import { getSiteSettings } from '@/lib/content/directus-site';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const fetchCache = 'force-cache';
export const revalidate = false;

export async function generateStaticParams() {
  const slugs = await listSpecialOfferSlugs();
  return slugs.map((slug) => ({ slug }));
}

function buildRobotsMeta(offer: SpecialOfferIndexingState) {
  return {
    index: isSpecialOfferIndexable(offer),
    follow: true,
  } as const;
}

function collapseText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [offer, settings] = await Promise.all([
    getSpecialOfferBySlug(slug).catch(() => null),
    getSiteSettings(),
  ]);

  if (!offer) {
    const metadata = buildBasicMetadata({
      title: 'Special Offer · SonShine Roofing',
      description: 'This special offer is not available right now.',
      path: `/special-offers/${slug}`,
    });
    metadata.robots = buildRobotsMeta({ noindex: true });
    return metadata;
  }

  const description =
    offer.metaDescription ??
    (collapseText(offer.description).slice(0, 160) ||
      'Claim this special offer from SonShine Roofing.');
  const image = offer.ogImageOverride ?? offer.featuredImage ?? settings?.defaultOgImage;
  const metadata = buildBasicMetadata({
    title: offer.metaTitle ?? `${offer.title} · SonShine Roofing`,
    description,
    openGraphTitle: offer.ogTitle ?? offer.metaTitle ?? undefined,
    openGraphDescription: offer.ogDescription ?? offer.metaDescription ?? undefined,
    path: `/special-offers/${offer.slug}`,
    keywords: offer.focusKeywords,
    image: {
      url: image?.url || '/og-default.png?v=20260818',
      width: image?.width || 1200,
      height: image?.height || 630,
    },
  });
  metadata.robots = buildRobotsMeta(offer);
  return metadata;
}

export default async function SpecialOfferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [offer, settings] = await Promise.all([getSpecialOfferBySlug(slug), getSiteSettings()]);

  if (!offer) {
    notFound();
  }

  const expired = isExpired(offer.expirationDate);
  const expirationLabel = formatSpecialOfferExpiration(offer.expirationDate);
  const description = collapseText(offer.description);
  const expirationBadge = expirationLabel
    ? `${expired ? 'Expired on' : 'Valid through'} ${expirationLabel}`
    : null;

  const origin = SITE_ORIGIN;
  const pagePath = `/special-offers/${offer.slug}`;

  const breadcrumbsLd = breadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'Special Offers', item: '/special-offers' },
      { name: offer.title, item: pagePath },
    ],
    { origin },
  );

  const offerSchemaData = offerSchema({
    name: offer.title,
    description: description.slice(0, 160),
    url: pagePath,
    origin,
    validThrough: offer.expirationDate || undefined,
    availability: expired ? 'https://schema.org/Discontinued' : 'https://schema.org/InStock',
    seller: {
      '@type': 'Organization',
      name: 'SonShine Roofing',
      url: origin,
    },
  });

  return (
    <>
      <JsonLd data={breadcrumbsLd} />
      <JsonLd data={offerSchemaData} />

      <Hero
        title={offer.title}
        eyebrow={offer.eyebrow}
        subtitle={offer.introduction}
        metadata={
          offer.discount ? (
            <p className="max-w-3xl text-2xl font-semibold leading-snug text-(--brand-cyan) sm:text-3xl">
              {offer.discount}
            </p>
          ) : null
        }
        imageSrc={offer.featuredImage?.url || undefined}
        badges={[...(expirationBadge ? [{ icon: CalendarClock, label: expirationBadge }] : [])]}
      >
        <div className="flex justify-center flex-wrap gap-3">
          {!expired && offer.offerCode ? (
            <SmartLink
              href="#claim-offer"
              className="btn btn-brand-orange btn-lg rounded-lg px-4 py-3"
              aria-label="Redeem Offer"
              data-icon-affordance="down"
              proseGuard
            >
              <BadgePercent className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Redeem Offer
              <ArrowDown className="icon-affordance ml-2 inline h-4 w-4" aria-hidden="true" />
            </SmartLink>
          ) : null}
          <SmartLink
            href={settings?.phoneHref ?? '#claim-offer'}
            className="btn-outline phone-affordance btn-lg rounded-lg px-3 py-2 text-white hover:bg-transparent"
            aria-label="Call SonShine Roofing"
            proseGuard
          >
            <Smartphone className="phone-affordance-icon mr-2 inline h-4 w-4" aria-hidden="true" />
            Call {settings?.phone ?? 'our office'}
          </SmartLink>
        </div>
      </Hero>

      <Section className="pb-20">
        <div className="mx-auto max-w-3xl space-y-8 px-2">
          <article className="prose prose-slate max-w-none rounded-xl border border-blue-100 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="mt-0">Offer Details</h2>
            <div dangerouslySetInnerHTML={{ __html: offer.descriptionHtml }} />
            {offer.legalDisclaimer ? (
              <div className="not-prose mt-6 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-600">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Offer terms</h3>
                <p>{offer.legalDisclaimer}</p>
              </div>
            ) : null}
          </article>

          <SpecialOfferTrust settings={settings} />

          <section id="claim-offer" className="scroll-mt-24" aria-label="Request your coupon">
            {!expired && offer.offerCode ? (
              <Suspense
                fallback={
                  <div className="rounded-xl border border-blue-100 bg-white p-6 text-sm text-slate-600">
                    Loading coupon form...
                  </div>
                }
              >
                <SpecialOfferForm
                  key={offer.slug}
                  offerCode={offer.offerCode}
                  offerSlug={offer.slug}
                  offerTitle={offer.title}
                  offerDiscount={offer.discount ?? null}
                  offerExpiration={offer.expirationDate ?? null}
                />
              </Suspense>
            ) : (
              <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-xs">
                <h2 className="text-xl font-semibold text-slate-900">
                  {expired ? 'This offer has expired' : 'This offer is unavailable'}
                </h2>
                <p className="mt-2 text-slate-600">
                  Call our team to ask about current roofing offers.
                </p>
                <SmartLink
                  href={settings?.phoneHref ?? '/contact-us'}
                  className="btn btn-brand-blue btn-md mt-4 inline-flex justify-center"
                >
                  Call {settings?.phone ?? 'our office'}
                </SmartLink>
              </div>
            )}
          </section>
        </div>
      </Section>
    </>
  );
}

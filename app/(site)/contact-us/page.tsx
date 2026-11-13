import { Suspense } from 'react';
import Section from '@/components/layout/Section';
import SimpleLeadForm from '@/components/lead-capture/lead-form/SimpleLeadForm';
import SmartLink from '@/components/utils/SmartLink';
import { Smartphone, ShieldCheck, BadgeCheck, Star, HandCoins } from 'lucide-react';
import StaticImage from '@/components/media/StaticImage';
import type { Metadata } from 'next';
import LiteMap from '@/components/utils/LiteMap';
import OpenOrClosed from '@/components/utils/OpenOrClosed';
import ResourcesQuickLinks from '@/components/global-nav/static-pages/ResourcesQuickLinks';
import { getSiteSettings, getWebsitePageMetadata } from '@/lib/content/directus-site';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { getServicePageConfig } from '@/lib/seo/service-pages';
import { SITE_ORIGIN } from '@/lib/seo/site';
import Hero from '@/components/ui/Hero';
import CopyButton from '@/components/utils/CopyButton';
import { getPersonProfileImage } from '@/lib/content/persons';

const SERVICE_PATH = '/contact-us';
const SERVICE_CONFIG = getServicePageConfig(SERVICE_PATH);

export async function generateMetadata(): Promise<Metadata> {
  const config = SERVICE_CONFIG;

  if (!config) {
    return getWebsitePageMetadata({
      title: 'Contact SonShine Roofing',
      description: 'Get in touch with SonShine Roofing.',
      path: SERVICE_PATH,
    });
  }

  return getWebsitePageMetadata({
    title: config.title,
    description: config.description,
    path: SERVICE_PATH,
    image: config.image,
  });
}

const contactInfoPillBase =
  'btn btn-lg rounded-xl btn-brand-blue not-prose px-3 py-2 justify-start phone-affordance w-fit';
const contactInfoIconStyles = 'h-5 w-5 inline mr-2 text-blue-50 h-6 w-6 phone-affordance-icon';

export default async function Page() {
  const [taraImage, settings] = await Promise.all([
    getPersonProfileImage('tara'),
    getSiteSettings(),
  ]);
  const phoneHref = settings?.phoneHref ?? '#book-an-appointment';
  const phoneDisplay = settings?.phone ?? 'Call our office';
  const addressQuery = settings
    ? `${settings.address.street}, ${settings.address.city}, ${settings.address.region} ${settings.address.postalCode}`
    : '';
  const origin = SITE_ORIGIN;
  const config = SERVICE_CONFIG;
  const breadcrumbsConfig = config?.breadcrumbs ?? [
    { name: 'Home', path: '/' },
    { name: 'Contact', path: SERVICE_PATH },
  ];

  const webPageLd = webPageSchema({
    name: config?.title ?? 'Contact SonShine Roofing',
    description: config?.description,
    url: SERVICE_PATH,
    origin,
    primaryImage: config?.image?.url ?? '/og-default.png?v=20260818',
    isPartOf: { '@type': 'WebSite', name: 'SonShine Roofing', url: origin },
  });

  const breadcrumbsLd = breadcrumbSchema(
    breadcrumbsConfig.map((crumb) => ({ name: crumb.name, item: crumb.path })),
    { origin },
  );

  return (
    <>
      <Hero
        title="Contact Us"
        eyelash="Whatever you need, we've got you covered"
        imageSrc="static:gray-roof-home-aerial"
        subtitle="Whether you want to schedule an appointment with one our expert Roofing Specialists or if you just have a few questions, we’re here to help! Give us a call or complete the form below to contact our office."
        badges={[
          { icon: ShieldCheck, label: 'Licensed & Insured' },
          { icon: Star, label: '4.8 on Google' },
          { icon: HandCoins, label: 'Flexible Financing' },
          { icon: BadgeCheck, label: '25-year Warranty' },
        ]}
      ></Hero>
      <Section>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] overflow-visible items-start">
          {/* Main content */}
          <div className="max-w-full min-w-0">
            <JsonLd data={webPageLd} />
            <JsonLd data={breadcrumbsLd} />

            <div className="flex gap-6 mb-6 lg:hidden">
              {/* “You'll talk to…” human tile */}
              <div className="not-prose rounded-3xl w-full border border-blue-200 bg-white p-6 shadow-xs max-w-full">
                <div className="flex-col gap-6">
                  <div className="mb-4">
                    <OpenOrClosed
                      holidayClosures={['2026-11-26', '2026-11-27', '2026-01-02']}
                      recurringClosures={['12-24', '12-25', '12-26', '07-04', '01-01']}
                    />
                  </div>
                  <StaticImage
                    src={taraImage.url}
                    alt={taraImage.altText}
                    width={75}
                    height={107.25}
                    className="mb-2 block h-[107.25px] w-auto rounded-xl object-cover"
                  />

                  <div className="mt-4">
                    <h2 className="text-2xl font-semibold text-slate-800">
                      You&apos;ll likely talk to <span className="text-(--brand-blue)">Tara</span>
                    </h2>
                    <p className="text-base text-slate-600 mb-2">Fast, friendly & reliable.</p>
                  </div>

                  <div>
                    <div className="flex flex-row items-center gap-2">
                      <SmartLink
                        href={phoneHref}
                        className={contactInfoPillBase}
                        title="Call SonShine Roofing"
                        proseGuard
                      >
                        <Smartphone className={contactInfoIconStyles} aria-hidden="true" />
                        <p className="font-semibold">{phoneDisplay}</p>
                      </SmartLink>
                      <CopyButton copyContent={phoneDisplay} ariaLabel="Copy phone number" />
                    </div>
                    <p className="mt-2 lg:hidden text-xs md:text-sm text-slate-500">Tap to call</p>
                  </div>
                </div>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="mx-auto w-full rounded-3xl border border-blue-100 bg-white p-6 shadow-xs">
                  <div className="h-6 w-32 animate-pulse rounded-md bg-slate-200" />
                  <div className="mt-4 space-y-3">
                    <div className="h-4 animate-pulse rounded-md bg-slate-200" />
                    <div className="h-4 animate-pulse rounded-md bg-slate-200" />
                    <div className="h-4 animate-pulse rounded-md bg-slate-200" />
                  </div>
                </div>
              }
            >
              <SimpleLeadForm
                selectableProjectTypes={['repair', 'retail', 'maintenance', 'something-else']}
              />
            </Suspense>
          </div>
          <div className="lg:sticky top-16 self-start">
            <div className="hidden lg:flex gap-6 w-full mb-6">
              {/* “You'll talk to…” human tile */}
              <div className="not-prose rounded-3xl border border-blue-200 bg-white p-6 shadow-xs max-w-full">
                <div className="flex-col gap-6">
                  <div className="mb-4">
                    <OpenOrClosed
                      holidayClosures={['2026-11-26', '2026-11-27']}
                      recurringClosures={['12-24', '12-25', '12-26', '07-04']}
                    />
                  </div>
                  <StaticImage
                    src={taraImage.url}
                    alt={taraImage.altText}
                    width={75}
                    height={107.25}
                    className="mb-2 block h-[107.25px] w-auto rounded-xl object-cover"
                  />

                  <div className="mt-4">
                    <h2 className="text-2xl font-semibold text-slate-800">
                      You&apos;ll likely talk to <span className="text-(--brand-blue)">Tara</span>
                    </h2>
                    <p className="text-base text-slate-600 mb-2">Fast, friendly & reliable.</p>
                  </div>

                  <div>
                    <div className="flex flex-row items-center gap-2">
                      <SmartLink
                        href={phoneHref}
                        className={contactInfoPillBase}
                        title="Call SonShine Roofing"
                        proseGuard
                      >
                        <Smartphone className={contactInfoIconStyles} aria-hidden="true" />
                        <p className="font-semibold">{phoneDisplay}</p>
                      </SmartLink>
                      <CopyButton copyContent={phoneDisplay} ariaLabel="Copy phone number" />
                    </div>
                    <p className="lg:hidden text-xs md:text-sm text-slate-500">Tap to call</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <ResourcesQuickLinks />
            </div>
          </div>
        </div>
        <div className="mt-6">
          {settings ? (
            <LiteMap
              addressQuery={addressQuery}
              brandName={settings.brandName}
              googleBusinessProfile={settings.socials.googleBusinessProfile}
            />
          ) : null}
        </div>
      </Section>
    </>
  );
}

export const revalidate = false;

export const dynamic = 'force-static';

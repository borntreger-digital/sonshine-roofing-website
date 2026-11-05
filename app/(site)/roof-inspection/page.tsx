import Section from '@/components/layout/Section';
import StaticImage from '@/components/media/StaticImage';
import SmartLink from '@/components/utils/SmartLink';
import { listRelatedPosts } from '@/lib/content/blog';
import { listFaqs } from '@/lib/content/directus-faqs';
import FaqInlineList from '@/components/dynamic-content/faq/FaqInlineList';
import YouMayAlsoLike from '@/components/engagement/YouMayAlsoLike';
import TipTopRoofCheckup from '@/components/marketing/service-pages/TipTopRoofCheckup';
import type { Metadata } from 'next';
import ServicesAside from '@/components/global-nav/static-pages/ServicesAside';
import { getServiceMetadata, getSiteSettings } from '@/lib/content/directus-site';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { getServicePageConfig } from '@/lib/seo/service-pages';
import { SITE_ORIGIN } from '@/lib/seo/site';
import Hero from '@/components/ui/Hero';
import {
  HandCoins,
  HardHat,
  HelpCircle,
  MapPin,
  Smartphone,
  Zap,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { Suspense } from 'react';
import EvenSimplerLeadForm from '@/components/lead-capture/lead-form/EvenSimplerLeadForm';
import { getPersonProfileImage } from '@/lib/content/persons';

const SERVICE_PATH = '/roof-inspection';
const SERVICE_CONFIG = getServicePageConfig(SERVICE_PATH);

export async function generateMetadata(): Promise<Metadata> {
  const config = SERVICE_CONFIG;

  if (!config) {
    return getServiceMetadata({
      slug: SERVICE_PATH.slice(1),
      title: 'Residential Roof Inspection | SonShine Roofing',
      description:
        'Roof inspections with ZERO hassle | Fast, Friendly, Professional | Call Us Today!',
      path: SERVICE_PATH,
    });
  }

  return getServiceMetadata({
    slug: SERVICE_PATH.slice(1),
    title: config.title,
    description: config.description,
    path: SERVICE_PATH,
    image: config.image,
  });
}

export default async function Page() {
  const [pool, faqs, nathanImage, settings] = await Promise.all([
    listRelatedPosts({ categorySlugs: ['roof-inspection'] }),
    listFaqs({ serviceSlug: 'roof-inspection', limit: 8 }).catch(() => []),
    getPersonProfileImage('nathan-borntreger'),
    getSiteSettings(),
  ]);

  const origin = SITE_ORIGIN;
  const config = SERVICE_CONFIG;
  const breadcrumbsConfig = config?.breadcrumbs ?? [
    { name: 'Home', path: '/' },
    { name: 'Roof Inspection', path: SERVICE_PATH },
  ];

  const webPageLd = webPageSchema({
    name: config?.title ?? 'Roof Inspection',
    description: config?.description,
    url: SERVICE_PATH,
    origin,
    primaryImage: config?.image?.url ?? '/og-default.png?v=20260818',
    isPartOf: { '@type': 'WebSite', name: 'SonShine Roofing', url: origin },
  });

  const breadcrumbsLd = breadcrumbSchema(
    breadcrumbsConfig.map((crumb) => ({
      name: crumb.name,
      item: crumb.path,
    })),
    { origin },
  );

  return (
    <>
      <Hero
        title="Roof Inspection"
        eyelash="Residential Roof Inspection Services in Sarasota, FL and Surrounding Areas"
        subtitle="Our 18-point Tip Top Roof Check-up goes beyond your typical roof inspection because, just like you, we live right here in Sarasota. We understand the challenges homeowners face when dealing with insurance claims, hurricane season, and that dreaded AC bill. Whether you need to find hidden damage, gather documentation for real estate / insurance purposes, or just want some peace of mind next hurricane season, give us a call and we'll get you on the schedule."
        badges={[
          { icon: MapPin, label: 'Local & Trusted' },
          { icon: HandCoins, label: 'Affordable' },
          { icon: HardHat, label: 'Expert Opinion' },
          { icon: Zap, label: 'Hurricane Preparation' },
        ]}
        imageSrc="static:workers-on-tile-roof"
      >
        <div className="bg-slate-600 h-px my-8" />
        <div className="flex-col gap-y-6 max-w-5xl text-center mx-auto">
          <h2 className="text-4xl sm:text-5xl font-semibold my-4 text-white">
            Book a <span className="text-(--brand-cyan)">Tip Top Roof Check-up</span> Today
          </h2>
          <div>
            <p className="text-slate-300 mt-2 text-xl sm:text-3xl">
              Just <span className="text-slate-500 line-through">$249</span>
              <span className="text-(--brand-cyan)"> $209.00</span>
            </p>
          </div>
          <div className="flex flex-row flex-wrap mx-auto mt-8 justify-center gap-4">
            <SmartLink
              className="text-white phone-affordance hover:bg-slate-600 flex-row flex-nowrap gap-x-1 not-prose py-4 btn btn-lg sm:btn-xl btn-outline h-[60px]"
              href={settings?.phoneHref ?? '#book-an-appointment'}
            >
              <Smartphone className="phone-affordance-icon h-4 w-4 sm:h-5 sm:w-5 inline mr-2" />
              {settings?.phone ?? 'our office'}
            </SmartLink>
            <div>
              <SmartLink
                className="flex-row not-prose py-4 btn btn-lg sm:btn-xl btn-brand-blue"
                href="#book-an-appointment"
                data-icon-affordance="down"
              >
                Book now
                <ArrowDown className="icon-affordance h-4 w-4 sm:h-5 sm:w-5 inline ml-2" />
              </SmartLink>
            </div>
          </div>
        </div>
      </Hero>
      <Section>
        <div className="grid gap-4 px-2 lg:grid-cols-[minmax(0,1fr)_320px] overflow-visible items-start">
          <div id="article-root" className="prose min-w-0 max-lg:max-w-none">
            {/* JSON-LD: WebPage + BreadcrumbList */}
            <JsonLd data={webPageLd} />
            <JsonLd data={breadcrumbsLd} />

            <TipTopRoofCheckup origin={origin} />

            <div className="bg-slate-200 h-px my-8" />

            <Suspense fallback={null}>
              <EvenSimplerLeadForm
                projectType="maintenance"
                page="/roof-inspection"
                title="Book a Roof Inspection Today"
                titleHighlight="Roof Inspection"
              />
            </Suspense>

            <div className="mt-16 not-prose flex flex-row justify-between">
              <h3 className="mb-3 text-xl text-slate-700 md:text-2xl">
                <HelpCircle
                  className="text-(--brand-blue) h-5 w-5 inline mr-2"
                  aria-hidden="true"
                />
                Why Do I Need a Roof Inspection?
              </h3>
            </div>
            <div className="text-lg prose max-lg:max-w-none">
              <p>
                A roof can protect your home for 20 years, but only if someone is paying attention.
                <br />
                <br />
                Small leaks and worn flashing rarely announce themselves. They work quietly. By the
                time water stains appear inside, decking may already be rotting, insulation
                compromised, and framing weakened.
                <br />
                <br />A professional inspection catches these issues early (when they’re{' '}
                <strong>inexpensive to fix</strong>). The National Roofing Contractors Association{' '}
                <SmartLink href="https://www.nrca.net">(nrca.net)</SmartLink> recommends two
                inspections per year to prevent premature roof failure.
              </p>
              <figure className="not-prose mt-4">
                <div className="relative aspect-4/3 overflow-hidden rounded-lg">
                  <StaticImage
                    src={nathanImage.url}
                    alt={nathanImage.altText}
                    fill
                    className="object-cover mb-2"
                    sizes="(max-width: 768px) 100vw, 800px"
                    loading="lazy"
                  />
                </div>
                <figcaption className="mt-2 text-sm text-slate-600">
                  <strong>Nathan Borntreger</strong> — Owner of SonShine Roofing • Insured • LIC: #
                  {settings?.licenseNumber ?? 'Licensed Florida contractor'} |{' '}
                  <SmartLink className="text-(--brand-blue)" href="/person/nathan-borntreger">
                    See full bio
                  </SmartLink>
                </figcaption>
              </figure>
              {/* Inline callout (#6) */}
              <div
                className="shadow-xs my-4 rounded-xl border border-[#fb9216]/5 bg-amber-50/50 p-4"
                role="note"
                aria-label="Important"
              >
                <p className="m-0 italic text-slate-700">
                  &quot;Your roof could be leaking right now and you wouldn’t know it. Some leaks go
                  years before they show up inside the house.&quot;
                </p>
                <div className="text-right">-Nathan Borntreger</div>
              </div>
              <p>
                You can spot obvious damage from the ground. But a trained roofer can safely walk
                the roof, identify hidden entry points, and prioritize repairs before they become
                major problems.
                <br></br>
                <br></br>
                That’s why we built the{' '}
                <SmartLink href="/roof-maintenance">Roof Care Club</SmartLink> — a simple,
                consistent maintenance plan designed to maximize the value of your homeowner&rsquo;s
                insurance claims, extend the life of your roof, and protect your home year after
                year.
              </p>
            </div>
            <div className="bg-slate-200 h-px my-8" />
            <div className="text-center text-lg sm:text-2xl font-semibold my-4">
              Book Your <span className="text-(--brand-blue)">Roof Inspection</span> Today
            </div>
            <div>
              <SmartLink
                className="flex-row gap-1 not-prose w-full py-4 btn btn-md btn-brand-blue"
                href="#book-an-appointment"
                data-icon-affordance="up"
              >
                Book now
                <ArrowUp className="icon-affordance h-4 w-4 inline ml-2" />
              </SmartLink>
            </div>
            <div
              className="my-6 rounded-xl border border-[#fb9216]/5 bg-amber-50/50 p-4 shadow-xs"
              role="note"
              aria-label="Advisory"
            >
              <strong className="uppercase text-[1rem] font-display block text-slate-800 mb-1">
                <HandCoins className="text-(--brand-blue) h-4 w-4 mr-2 inline" />
                Want it free instead?
              </strong>
              <div className="m-0 text-slate-700">
                <span className="text-slate-600">
                  Give us a call and mention you would like to join the{' '}
                  <SmartLink href="/roof-maintenance">Roof Care Club.</SmartLink>
                </span>
                <SmartLink
                  className="phone-affordance mt-4 w-full not-prose"
                  href={settings?.phoneHref ?? '#book-an-appointment'}
                >
                  <div className="btn btn-md btn-outline w-full">
                    <Smartphone className="phone-affordance-icon inline h-4 w-4 mr-2" />
                    {settings?.phone ?? 'our office'}
                  </div>
                </SmartLink>
              </div>
            </div>
            <div className="bg-slate-200 h-px my-8" />
          </div>

          <ServicesAside activePath={SERVICE_PATH} />
        </div>

        <div data-toc-exclude>
          <YouMayAlsoLike
            posts={pool}
            heading="Learn More About Roof Inspection Services"
          />
        </div>

        {/* FAQs (dynamic) */}
        <FaqInlineList
          heading="Roof Inspection FAQs"
          pagePath="/roof-inspection"
          limit={8}
          initialItems={faqs}
          seeMoreHref="/faq"
        />
      </Section>
    </>
  );
}

export const revalidate = false;

export const dynamic = 'force-static';

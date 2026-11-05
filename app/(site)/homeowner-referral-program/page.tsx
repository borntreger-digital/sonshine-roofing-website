import { Suspense } from 'react';
import Section from '@/components/layout/Section';
import ServicesAside from '@/components/global-nav/static-pages/ServicesAside';
import SmartLink from '@/components/utils/SmartLink';
import Hero from '@/components/ui/Hero';
import ReferralForm from '@/components/lead-capture/referral/ReferralForm';
import { listFaqs } from '@/lib/content/directus-faqs';
import { getSiteSettings, getWebsitePageMetadata } from '@/lib/content/directus-site';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { getServicePageConfig } from '@/lib/seo/service-pages';
import { SITE_ORIGIN } from '@/lib/seo/site';
import type { Metadata } from 'next';
import { ArrowLeftRight, CheckCircle2, Contact, Home, Smartphone, XCircle } from 'lucide-react';
import FaqInlineList from '@/components/dynamic-content/faq/FaqInlineList';

const SERVICE_PATH = '/homeowner-referral-program';
const SERVICE_CONFIG = getServicePageConfig(SERVICE_PATH);

const TERMS_PATH = '/homeowner-referral-program/terms-and-conditions';

const CARD_BASE = 'rounded-3xl border bg-white p-6 shadow-xs';
const PANEL_BASE = 'rounded-3xl border bg-white shadow-xs';
const CARD_TITLE = 'mt-4 text-lg font-semibold text-slate-900';
const CARD_TEXT = 'mt-2 text-sm leading-6 text-slate-600';
const HERO_ACTION = 'btn btn-lg';

type StepCard = {
  step: string;
  title: string;
  text: string;
};

const PROCESS_STEPS: StepCard[] = [
  {
    step: 'Step 1',
    title: 'Fill out the referral form',
    text: "Send us the referred homeowner's contact details so SonShine can match the referral to you.",
  },
  {
    step: 'Step 2',
    title: 'We make the sale',
    text: 'Our team follows up with the homeowner and confirms whether the project qualifies as a full roof replacement.',
  },
  {
    step: 'Step 3',
    title: 'We mail you a check',
    text: 'Once the qualifying roof replacement sale is made, SonShine mails your $250 reward check.',
  },
];

const QUALIFIES = [
  'Full roof replacements',
  'Within service area',
  'Job is approved and sales contract is signed',
];

const DOES_NOT_QUALIFY = [
  'Repairs, maintenance, or inspections',
  'Outside of service area',
  'Self-referrals',
];

const SERVICE_AREAS = ['Sarasota County', 'Manatee County', 'Charlotte County'];

export async function generateMetadata(): Promise<Metadata> {
  const config = SERVICE_CONFIG;

  if (!config) {
    return getWebsitePageMetadata({
      title: 'Homeowner Referral Program | SonShine Roofing',
      description:
        'Learn who can refer SonShine Roofing, what projects qualify, and how to earn $250 per qualified full roof replacement referral.',
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

export default async function HomeownerReferralProgramPage() {
  const [faqs, settings] = await Promise.all([
    listFaqs({ pagePath: '/homeowner-referral-program', limit: 8 }).catch(() => []),
    getSiteSettings(),
  ]);

  const origin = SITE_ORIGIN;
  const config = SERVICE_CONFIG;

  const breadcrumbsConfig = config?.breadcrumbs ?? [
    { name: 'Home', path: '/' },
    { name: 'Homeowner Referral Program', path: SERVICE_PATH },
  ];

  const webPageLd = webPageSchema({
    name: config?.title ?? 'Homeowner Referral Program',
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
        title="Homeowner Referral Program"
        eyelash="SonShine Roofing Referral Program"
        subtitle="Are you a current or former SonShine customer or Roof Care Club member who knows a homeowner who needs a full roof replacement? Submit their details to SonShine Roofing and earn $250 for each qualified referral."
        badges={[
          { icon: Contact, label: '$250 per qualified referral' },
          { icon: CheckCircle2, label: 'Referrer submits the referral' },
          { icon: Home, label: 'Full roof replacement jobs only' },
          { icon: ArrowLeftRight, label: 'Paid via check in the mail' },
        ]}
        justifyStart
        imageSrc="static:smiling-man-holding-cash"
      >
        <div className="flex flex-wrap gap-3">
          <SmartLink
            href="#referral-form"
            className={`${HERO_ACTION} btn-brand-blue`}
            aria-label="Submit a referral"
            proseGuard
          >
            Submit a Referral
          </SmartLink>
          <SmartLink
            href={settings?.phoneHref ?? '#refer-a-homeowner'}
            className={`${HERO_ACTION} btn-secondary phone-affordance`}
            aria-label="Call SonShine Roofing about the homeowner referral program"
            proseGuard
          >
            <Smartphone className="h-4 w-4 mr-2 phone-affordance-icon" aria-hidden="true" />
            {settings?.phone ?? 'Call our office'}
          </SmartLink>
          <SmartLink
            href={TERMS_PATH}
            className="inline-flex items-center text-sm font-semibold text-blue-100 underline-offset-4 hover:text-white hover:underline"
            aria-label="Read the referral program terms and conditions"
            proseGuard
          >
            Read full terms and conditions
          </SmartLink>
        </div>
      </Hero>

      <Section>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] overflow-visible items-start px-2">
          <div id="article-root" className="prose min-w-0 max-lg:max-w-none">
            <JsonLd data={webPageLd} />
            <JsonLd data={breadcrumbsLd} />

            <h2 className="mt-4 text-3xl">
              Refer a Homeowner <span className="text-(--brand-blue)">with Confidence</span>
            </h2>
            <p>
              If you know a friend, family member, neighbor, or fellow homeowner who needs a full
              roof replacement in our Southwest Florida service area,{' '}
              <strong>
                you may be eligible for a <span className="text-(--brand-blue)">$250</span> referral
                reward.
              </strong>
            </p>
            <h2>How to Submit a Referral</h2>
            <p>
              Fill out the referral form with the homeowner&apos;s details. SonShine will use your
              contact information as the referrer and the homeowner information to follow up about
              the roof replacement project.
            </p>

            <div className="not-prose my-6 grid gap-4 md:grid-cols-3">
              {PROCESS_STEPS.map(({ step, title, text }) => (
                <div key={step} className={`${CARD_BASE} border-blue-200`}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--brand-blue) text-sm font-bold text-white">
                      {step.replace('Step ', '')}
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {step}
                    </p>
                  </div>
                  <p className={CARD_TITLE}>{title}</p>
                  <p className={CARD_TEXT}>{text}</p>
                </div>
              ))}
            </div>

            <section id="referral-form" className="not-prose my-8 scroll-mt-24">
              <Suspense
                fallback={
                  <div className="mx-auto w-full rounded-3xl border border-blue-100 bg-white p-6 shadow-xs">
                    <div className="h-6 w-32 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-4 space-y-3">
                      <div className="h-4 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-4 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-4 animate-pulse rounded-full bg-slate-200" />
                    </div>
                  </div>
                }
              >
                <ReferralForm />
              </Suspense>
            </section>

            <h2>What Counts as an Eligible Referral?</h2>
            <p>
              SonShine limits rewards to <strong>full roof replacement jobs</strong> that meet the
              program requirements below:
            </p>
            <div className="not-prose my-6 grid gap-4 lg:grid-cols-2">
              <div className={`${CARD_BASE} bg-emerald-100/20 border-emerald-200`}>
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <p className="text-xl font-semibold text-emerald-600">Eligible</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                  </div>
                </div>
                <ul className="mt-5 space-y-3 leading-6 text-slate-600">
                  {QUALIFIES.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`${CARD_BASE} bg-red-100/50 border-red-200`}>
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <p className="text-xl font-semibold text-red-600">Not Eligible</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center text-red-600">
                    <XCircle className="h-8 w-8" aria-hidden="true" />
                  </div>
                </div>
                <ul className="mt-5 space-y-3 leading-6 text-slate-700">
                  {DOES_NOT_QUALIFY.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <XCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={`${PANEL_BASE} not-prose my-6 border-blue-200 bg-blue-100/70 p-6`}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-lg font-semibold text-slate-700">Service Area</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    The homeowner should be the legal owner of a property in one of the following
                    counties:
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {SERVICE_AREAS.map((county) => (
                      <span
                        key={county}
                        className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        {county}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ServicesAside activePath={SERVICE_PATH} />
        </div>
        <FaqInlineList
          heading="Referral Program FAQs"
          pagePath="/homeowner-referral-program"
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

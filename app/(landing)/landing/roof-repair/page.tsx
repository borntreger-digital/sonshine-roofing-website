import type { Metadata } from 'next';
import { Suspense } from 'react';
import EvenSimplerLeadForm from '@/components/lead-capture/lead-form/EvenSimplerLeadForm';
import {
  LandingCta,
  LandingFaq,
  LandingFormSection,
  LandingHero,
  LandingReviews,
  LandingSection,
  LandingTrust,
} from '@/components/landing/LandingSections';
import StaticImage from '@/components/media/StaticImage';
import { getWebsitePageMetadata } from '@/lib/content/directus-site';
import { staticImageUrl } from '@/lib/content/static-media';
import { REPAIR_LANDING_REVIEWS } from '@/lib/landing/reviews';

const PAGE_PATH = '/landing/roof-repair';
const CTA_LABEL = 'Request My Free Repair Estimate';

const REPAIR_CONCERNS = [
  {
    imageKey: 'stained-roof-decking-and-framing',
    title: 'Leaks and water stains',
    description: 'Find out where water is entering and why.',
  },
  {
    imageKey: 'broken-red-roof-tiles',
    title: 'Missing or damaged roofing',
    description: 'Patch the affected area and mitigate further wind-related damage.',
  },
  {
    imageKey: 'damaged-roof-vent-flashing',
    title: 'Flashing and roof penetrations',
    description: 'Seal and reinforce vulnerable areas around vents, skylights, and roof joints.',
  },
];

const REPAIR_QUESTIONS = [
  {
    question: 'Is the roof repair estimate really free?',
    answer:
      'Yes. SonShine Roofing provides free roof repair estimates. Tell us about the problem and we will contact you to arrange an assessment.',
  },
  {
    question: 'Will I need a whole new roof?',
    answer:
      'A leak does not automatically mean you need a replacement. We assess the problem and the condition of your roof, then explain whether a targeted repair makes sense. If a repair will not adequately address the damage, we will explain why and discuss your options.',
  },
  {
    question: 'How much will my repair cost?',
    answer:
      'The cost depends on the source and extent of the damage, your roofing material and access to the affected area. An assessment lets us recommend the work and provide an estimate for your roof.',
  },
  {
    question: 'How soon will I hear from you?',
    answer:
      'We will respond within 30 minutes during business hours. Requests received after hours will receive a response the next business day. We will discuss assessment and repair scheduling when we contact you.',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return getWebsitePageMetadata({
    title: 'Free Roof Repair Estimate | SonShine Roofing',
    description:
      'Get a free residential roof repair estimate from SonShine Roofing. Help with leaks, damaged roofing and flashing in Sarasota, Manatee and Charlotte counties.',
    path: PAGE_PATH,
    image: { url: staticImageUrl('skylight-shingle-repair') },
    robots: { index: false, follow: true },
  });
}

export default function RoofRepairLandingPage() {
  return (
    <>
      <LandingHero
        eyebrow="Residential roof repair"
        title="Start with a clear, free estimate."
        highlightText="free estimate"
        description="We will thoroughly assess your roof, explain your options, and help you decide next steps."
        imageKey="skylight-shingle-repair"
        ctaLabel={CTA_LABEL}
      />
      <LandingTrust />

      <LandingFormSection>
        <Suspense fallback={null}>
          <EvenSimplerLeadForm
            projectType="repair"
            page={PAGE_PATH}
            title="Request Your Free Roof Repair Estimate"
            titleHighlight="Free Roof Repair Estimate"
            description="Tell us about your roof. We will respond within 30 minutes during business hours, or the next business day after hours, to arrange your assessment."
            submitLabel={CTA_LABEL}
          />
        </Suspense>
      </LandingFormSection>

      <LandingSection
        eyebrow="Let's Fix The Root Cause"
        title="Issue with your roof? Let us help."
      >
        <p className="max-w-3xl text-lg leading-8 text-slate-700">
          We assess the affected area, explain what we find, and recommend the next step. 
          When a repair is appropriate, we handle the details so you can rest easy.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          {REPAIR_CONCERNS.map(({ imageKey, title, description }) => (
            <article
              key={title}
              className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xs"
            >
              <div className="relative aspect-4/3 bg-slate-100">
                {imageKey ? (
                  <StaticImage
                    crop
                    src={`static:${imageKey}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                    loading="lazy"
                  />
                ) : (
                  // Reserved for a fascia/roof-edge photo; existing assets do not show this issue.
                  <div className="absolute inset-0" aria-hidden="true" />
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-base leading-7 text-slate-600">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </LandingSection>

      <LandingReviews
        reviews={REPAIR_LANDING_REVIEWS}
        title="Reviews from real SonShine customers."
        highlightText="real SonShine customers"
        subtitle="Hear how homeowners describe their roof repair experience."
      />

      <LandingSection eyebrow="What happens next" title="From your first call to a repair decision.">
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            {
              title: 'Tell us what is happening',
              description:
                'Send your request with the property address and any details you have about the problem.',
            },
            {
              title: 'Arrange an assessment',
              description:
                'We will contact you to discuss the issue, confirm service coverage and arrange a time to assess your roof.',
            },
            {
              title: 'Review your repair options',
              description:
                'We explain the findings and recommended work. Review your free estimate and decide how you want to proceed.',
            },
          ].map(({ title, description }, index) => (
            <li key={title} className="rounded-3xl border border-blue-100 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-(--brand-blue)">
                  {index + 1}
                </span>
                <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
              </div>
              <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
            </li>
          ))}
        </ol>
      </LandingSection>

      <LandingSection 
        eyebrow="Frequently Asked Questions"
        title="Need help? We've got you covered."
      >
        <LandingFaq items={REPAIR_QUESTIONS} />
      </LandingSection>

      <LandingCta
        title="Get a clear next step for your roof."
        highlightText="clear next step"
        description="Start with a free repair estimate and a conversation about the problem."
        ctaLabel={CTA_LABEL}
      />
    </>
  );
}

export const revalidate = false;
export const dynamic = 'force-static';

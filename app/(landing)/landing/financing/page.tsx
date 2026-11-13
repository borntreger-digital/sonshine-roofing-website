import type { Metadata } from 'next';

export const revalidate = false;
export const dynamic = 'force-static';
import { Suspense } from 'react';
import {
  LandingCta,
  LandingFaq,
  LandingFormSection,
  LandingHero,
  LandingReviews,
  LandingSection,
  LandingTrust,
} from '@/components/landing/LandingSections';
import FinancingProviders from '@/components/landing/financing/FinancingProviders';
import EvenSimplerLeadForm from '@/components/lead-capture/lead-form/EvenSimplerLeadForm';
import StaticImage from '@/components/media/StaticImage';
import SmartLink from '@/components/utils/SmartLink';
import { getWebsitePageMetadata } from '@/lib/content/directus-site';
import { REPLACEMENT_LANDING_REVIEWS } from '@/lib/landing/reviews';

const LANDING_PATH = '/landing/financing';
const CTA_LABEL = 'Request My Estimate & Financing Options';

export async function generateMetadata(): Promise<Metadata> {
  return getWebsitePageMetadata({
    title: 'Roof Financing & Free Estimate | SonShine Roofing',
    description:
      'Request a free roof replacement estimate and discuss Ygrene and Service Finance options with SonShine Roofing. Financing is subject to provider approval.',
    path: LANDING_PATH,
    robots: { index: false, follow: true },
  });
}

const steps = [
  {
    title: 'Assess your roof',
    text: 'Send your request using the form above or give us a call. We’ll contact you within 30 minutes during business hours, or the next business day after hours, to arrange your free replacement estimate.',
  },
  {
    title: 'Review your options',
    text: 'Review the project scope and estimate with our team. We’ll explain how financing works and help you decide how to move forward.',
  },
  {
    title: 'Get approved',
    text: "Complete the provider’s application and review its full terms. We can take care of this for you if needed. Approvals are usually same-day.",
  },
];

export default function FinancingLandingPage() {
  return (
    <>
      <LandingHero
        eyebrow="Roof Replacement Financing"
        title="Prefer monthly payments for your next roof? Let us help."
        highlightText="monthly payments"
        description="Our team will help you understand your options. We'll discuss credit-based and lien-based financing through our preferred partners so you can decide the option that makes the most sense for you."
        imageKey="financing-options-couple-wide"
        ctaLabel={CTA_LABEL}
      />
      <LandingTrust />

      <LandingFormSection>
        <Suspense
          fallback={
            <p className="rounded-2xl border border-blue-100 bg-white p-6 text-slate-700">
              Loading your estimate request form…
            </p>
          }
        >
          <EvenSimplerLeadForm
            projectType="retail"
            page={LANDING_PATH}
            title="Request Your Free Replacement Estimate & Financing Options"
            titleHighlight="Free Replacement Estimate"
            description="Tell us about your roof and the best way to reach you. We'll schedule a free roof assessment and help you understand options for financing."
          />
        </Suspense>
      </LandingFormSection>

      <LandingSection
        eyebrow="Understand your options"
        title="Two financing paths for your new roof"
        id="financing-options"
      >
        <FinancingProviders />
      </LandingSection>

      <LandingSection
        eyebrow="How It Works"
        title="Assessment, Application & Approval."
        className="bg-slate-50"
      >
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-blue-100 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-(--brand-blue)">
                  {index + 1}
                </span>
                <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
              </div>
              <p className="mt-3 leading-relaxed text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </LandingSection>

      <LandingSection 
        eyebrow="Let's Get to Work" 
        title="Your roof is our priority."
      >
        <div className="grid items-center gap-8 md:grid-cols-2">
          <StaticImage
            src="static:red-tile-roof-white-home"
            sizes="(min-width: 768px) 50vw, 100vw"
            className="aspect-4/3 w-full rounded-2xl object-cover"
            crop
          />
          <div>
            <p className="text-lg leading-relaxed text-slate-700">
              Financing is one part of replacing a roof. You also need to know what will be installed,
              how the work will be handled, and what your next steps are. SonShine guides you through 
              the whole process so you can rest easy.
            </p>
          </div>
        </div>
      </LandingSection>

      <LandingReviews
        reviews={REPLACEMENT_LANDING_REVIEWS}
        title="Read reviews from real SonShine customers."
        highlightText="real SonShine customers"
        subtitle="Hear how homeowners describe their roof replacement experience."
      />

      <LandingSection 
        eyebrow="Frequently Asked Questions"
        title="Need help? We've got you covered."
      >
        <LandingFaq
          items={[
            {
              question: 'Is the roof replacement estimate free?',
              answer:
                'Yes. SonShine’s roof replacement estimates are always free. You can discuss financing options as part of that conversation before deciding whether to apply.',
            },
            {
              question: 'Will this form check my credit?',
              answer:
                'No. This form requests a roofing estimate and a conversation with SonShine. Any financing application is separate and follows the provider’s requirements. We do not ask for your Social Security number, income documents or banking details here.',
            },
            {
              question: 'Is financing available for every property?',
              answer:
                'Availability depends on the property, project and provider. Ygrene PACE financing is only available in participating locations and has property and repayment requirements. Service Finance also requires lender approval. Our team can help you understand the next step for your replacement project.',
            },
            {
              question: 'What if I sell or refinance a home with Ygrene financing?',
              answer: (
                <>
                  Ygrene explains that most mortgage lenders require the remaining PACE assessment to
                  be paid off at sale or refinance. Discuss those plans with your lender before
                  choosing PACE financing.{' '}
                  <SmartLink
                    href="https://ygrene.com/faq/"
                    className="text-(--brand-blue) underline underline-offset-4"
                    showExternalIcon
                  >
                    Read Ygrene’s explanation
                  </SmartLink>
                  .
                </>
              ),
            },
          ]}
        />
      </LandingSection>

      <LandingCta
        title="Finance your new roof with confidence."
        highlightText="with confidence"
        description="Request your free roof replacement estimate and ask our team about financing. We’ll follow up within 30 minutes during business hours, or the next business day after hours."
        ctaLabel={CTA_LABEL}
      />
    </>
  );
}

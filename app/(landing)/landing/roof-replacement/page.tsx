import type { Metadata } from 'next';

export const revalidate = false;
export const dynamic = 'force-static';
import { Suspense } from 'react';
import StaticImage from '@/components/media/StaticImage';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { getWebsitePageMetadata } from '@/lib/content/directus-site';
import { getProjectBySlug } from '@/lib/content/projects';
import { staticImage } from '@/lib/content/static-media';
import { REPLACEMENT_LANDING_REVIEWS } from '@/lib/landing/reviews';
import ReviewStarRow from '@/components/reviews-widget/ReviewStarRow';
import { CONTENT_PREVIEW_MEDIA_CLASS } from '@/components/dynamic-content/card-utils';
import { ProjectFacts, ProjectNeighborhood } from '@/components/dynamic-content/project/ProjectMetadata';
import { cn } from '@/lib/utils';

const LANDING_PATH = '/landing/roof-replacement';
const CTA_LABEL = 'Request My Free Estimate';
const PROJECT_GROUPS = [
  { material: 'Shingle', slugs: ['brewster-rd-north-port-fl', 'spinnaker-blvd-englewood-fl'] },
  { material: 'Metal', slugs: ['coco-plum-way-sarasota-fl', 'vinson-ave-sarasota-fl'] },
  { material: 'Tile', slugs: ['41st-court-east-sarasota-fl', 'wagon-wheel-cir-sarasota-fl'] },
];

export async function generateMetadata(): Promise<Metadata> {
  const hero = staticImage('red-tile-roof-white-home');
  return getWebsitePageMetadata({
    path: LANDING_PATH,
    title: 'Free Roof Replacement Estimate | SonShine Roofing',
    description:
      'Plan your roof replacement with SonShine Roofing. Get a free estimate, compare roofing materials and discuss the next steps for your home.',
    robots: { index: false, follow: true },
    image: {
      url: hero.url,
      width: hero.width,
      height: hero.height,
      alt: hero.description,
    },
  });
}

const steps = [
  {
    title: 'Step #1: Initial Assessment',
    description:
      "Tell us what has you considering replacement. We'll arrange a free assessment, help you understand the condition of your roof, and help you decide if replacement is the right move.",
  },
  {
    title: 'Step #2: Understand Your Options',
    description:
      'Compare materials and review the proposed work, cost and warranty details with a Roofing Specialist before deciding how to move forward.',
  },
  {
    title: 'Step #3: Project Approval',
    description:
      'Once approved, our team handles permits and scheduling, protects the work area, installs your roof and completes the final inspection and cleanup.',
  },
];

const faqs = [
  {
    question: 'Is the roof replacement estimate free?',
    answer:
      'Yes. Roof replacement estimates are always free. Send your request and our team will contact you to discuss your roof and arrange the next step.',
  },
  {
    question: 'What if I am not sure my roof needs replacing?',
    answer:
      'You can still request an estimate. Tell us about the leaks, damage or other concerns you have. A Roofing Specialist will assess the roof and discuss whether replacement or repair is appropriate.',
  },
  {
    question: 'Which roofing materials can I choose?',
    answer:
      'SonShine installs shingle, tile, metal and flat roofing systems. Your roof structure, budget and preferences help determine which options fit your home. See our project gallery for inspiration',
  },
  {
    question: 'Do you offer financing?',
    answer:
      'Yes. Mention financing in the optional message field or ask your Roofing Specialist when we contact you. Available programs, eligibility and terms are determined by our partners at Service Finance and Ygrene.',
  },
  {
    question: 'When will I hear from you?',
    answer:
      "We respond within 30 minutes during business hours. After hours, we'll contact you the next business day regarding your inquiry and attempt to schedule an intiial appointment with one of our roofing specialists.",
  },
];

export default async function RoofReplacementLandingPage() {
  const projectGroups = await Promise.all(PROJECT_GROUPS.map(async ({ material, slugs }) => ({
    material,
    projects: (await Promise.all(slugs.map(getProjectBySlug))).filter(
      (project): project is NonNullable<typeof project> => Boolean(project?.heroImage),
    ),
  })));

  return (
    <>
      <LandingHero
        eyebrow="Residential roof replacement"
        title="Need to replace your roof? Let us help."
        highlightText="replace your roof"
        description="A new roof is a big decision. Our expert team will help you choose the right roofing system and guide you through the entire process from the initial assessment to the final cleanup."
        imageKey="red-tile-roof-white-home"
        ctaLabel={CTA_LABEL}
      />
      <LandingTrust />

      <LandingFormSection>
        <Suspense fallback={<p className="text-center text-slate-600">Loading your estimate form…</p>}>
          <EvenSimplerLeadForm
            projectType="retail"
            page={LANDING_PATH}
            title="Get Your Free Roof Replacement Estimate"
            titleHighlight="Roof Replacement"
            description="We respond within 30 minutes during business hours. After hours, we'll contact you the next business day."
            submitLabel={CTA_LABEL}
          />
        </Suspense>
      </LandingFormSection>

      {projectGroups.some(({ projects }) => projects.length > 0) && (
        <LandingSection 
          eyebrow="40+ Years of Roofing Excellence" 
          title="We take pride in our work."
        >
          <p className="mb-7 max-w-2xl text-lg text-slate-600">
            Explore completed shingle, metal and tile replacements with feedback from fellow
            homeowners.
          </p>
          <div className="space-y-10">
            {projectGroups.filter(({ projects }) => projects.length > 0).map(({ material, projects }) => (
              <div key={material}>
                <h3 className="mb-5 text-2xl font-semibold text-slate-900">{material} roof replacements</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {projects.map((project) => (
                    <Card key={project.slug} className="flex h-full min-w-0 flex-col">
                      <div className={cn(CONTENT_PREVIEW_MEDIA_CLASS, 'aspect-16/10')}>
                        <StaticImage
                          src={project.heroImage!.url}
                          alt={project.heroImage!.altText}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 600px"
                          loading="lazy"
                        />
                      </div>
                      <CardHeader className="px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
                        <h4 className="text-2xl font-bold leading-tight text-slate-900">{project.title}</h4>
                        <ProjectNeighborhood project={project} />
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                        <ProjectFacts project={project} />
                        {project.customerTestimonial?.customerReview && (
                          <div className="mt-6">
                            <ReviewStarRow />
                            <figure className="mt-4">
                              <blockquote className="whitespace-pre-line text-base italic leading-7 text-slate-600">
                                &ldquo;{project.customerTestimonial.customerReview}&rdquo;
                              </blockquote>
                              {project.customerTestimonial.customerName && (
                                <figcaption className="mt-4 text-sm font-semibold text-slate-900">
                                  {project.customerTestimonial.customerName}
                                </figcaption>
                              )}
                            </figure>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </LandingSection>
      )}

      <LandingReviews
        reviews={REPLACEMENT_LANDING_REVIEWS}
        title="Read reviews from real SonShine customers."
        highlightText="real SonShine customers"
        subtitle="Hear how homeowners describe their roof replacement experience."
      />

      <LandingSection 
        eyebrow="Straightforward & Simple" 
        title="Let us handle the details."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ title, description }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-3 text-xl font-semibold text-slate-900">{title}</h3>
              <p className="text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="bg-slate-50" title="Look beyond the shingles, tile or metal.">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-6 text-lg text-slate-600">
              Your new roof is a complete system. We explain the materials and installation details
              together so you know what you are choosing.
            </p>
            <ul className="list-disc space-y-4 pl-5 text-slate-700 marker:text-slate-400">
              {[
                'Material options that suit your home and budget.',
                'Underlayment, flashing and ventilation considered together.',
                'Warranty details for your selected materials and installation.',
                'Financing options to discuss with your Roofing Specialist.',
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
            <StaticImage
              src="static:tile-shingle-metal-roof-comparison"
              fill
              crop
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 600px"
              loading="lazy"
            />
          </div>
        </div>
      </LandingSection>

      <LandingSection 
        eyebrow="Frequently Asked Questions"
        title="Need help? We've got you covered."
      >
        <LandingFaq items={faqs} />
      </LandingSection>

      <LandingCta
        title="Make your next roofing decision with confidence."
        highlightText="with confidence"
        description="Start with a free estimate and a conversation about your home. We'll help you understand your options and next steps."
        ctaLabel={CTA_LABEL}
      />
    </>
  );
}

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, ClipboardList, Phone, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import StaticImage from '@/components/media/StaticImage';
import SmartLink from '@/components/utils/SmartLink';
import { renderHighlight } from '@/components/utils/renderHighlight';
import { Accordion } from '@/components/ui/Accordion';
import ReviewsCarouselView from '@/components/reviews-widget/ReviewsCarouselView';
import ReviewSummary from '@/components/reviews-widget/ReviewSummary';
import { reviewDate, safeReviewUrl } from '@/components/reviews-widget/review-presentation';
import type { Review } from '@/components/reviews-widget/types';
import { getSiteSettings } from '@/lib/content/directus-site';
import { getProjectBySlug } from '@/lib/content/projects';
import { staticImage } from '@/lib/content/static-media';
import { cn } from '@/lib/utils';
import { CONTENT_PREVIEW_MEDIA_CLASS } from '@/components/dynamic-content/card-utils';
import { ProjectFacts, ProjectNeighborhood } from '@/components/dynamic-content/project/ProjectMetadata';

const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
type HighlightText = string | readonly string[];

export async function LandingHero({
  eyebrow, title, highlightText, description, imageKey, ctaLabel,
}: {
  eyebrow: string; title: string; highlightText?: HighlightText; description: string; imageKey: string; ctaLabel: string;
}) {
  const settings = await getSiteSettings();
  return (
    <section className="overflow-hidden border-b border-blue-100 bg-linear-to-br from-sky-50 via-white to-cyan-50">
      <div className={cn(container, 'grid items-center gap-6 py-8 md:grid-cols-2 md:gap-10 md:py-10')}>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-(--brand-blue)">{eyebrow}</p>
          <h1 className="text-4xl leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-5xl">{renderHighlight(title, highlightText)}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">{description}</p>
          <ReviewSummary className="mt-4" />
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <SmartLink href="#book-an-appointment" aria-label={ctaLabel} className="btn btn-brand-blue min-h-12 px-5 py-3 text-center">
              {ctaLabel}<ArrowDown className="ml-2 size-4 shrink-0" aria-hidden="true" />
            </SmartLink>
            <SmartLink href={settings?.phoneHref ?? 'tel:+19418664320'} aria-label={`Call SonShine Roofing at ${settings?.phone ?? '(941) 866-4320'}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
              <Phone className="size-4" aria-hidden="true" />{settings?.phone ?? '(941) 866-4320'}
            </SmartLink>
          </div>
          <p className="mt-3 text-sm text-slate-500">For homes in Sarasota, Manatee &amp; Charlotte counties.</p>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-2xl shadow-xs md:aspect-4/3">
          <StaticImage src={`static:${imageKey.replace(/^static:/, '')}`} fill crop className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" priority />
        </div>
      </div>
    </section>
  );
}

export function LandingTrust() {
  return (
    <div className="border-b border-blue-100 bg-white">
      <ul aria-label="Why homeowners choose SonShine" className={cn(container, 'grid grid-cols-1 gap-5 py-6 text-sm font-medium text-slate-700 sm:grid-cols-3 sm:gap-6')}>
        {[
          { text: 'Serving SWFL Since 1987', icon: CalendarDays },
          { text: 'Licensed & Insured', icon: ShieldCheck },
          { text: 'Free Repair & Replacement Estimates', icon: ClipboardList },
        ].map(({ text, icon: Icon }) => (
          <li key={text} className="flex min-w-0 flex-col items-center gap-2 text-center">
            <Icon className="size-6 shrink-0 text-(--brand-blue)" aria-hidden="true" />
            <span className="max-w-64">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function LandingFormSection({ children }: { children: ReactNode }) {
  const projects = await Promise.all([
    'saralake-dr-sarasota-fl',
    'coco-plum-way-sarasota-fl',
    'western-pine-circle-sarasota-fl',
    'spinnaker-blvd-englewood-fl',
    'south-tamiami-trail-port-charlotte-fl-harbor-professional-center',
  ].map(getProjectBySlug));
  return (
    <section className="bg-slate-50 py-8 md:py-12" data-landing-form-section>
      <div className={cn(container, 'grid items-start gap-6 lg:grid-cols-3')}>
        <div className="min-w-0 lg:col-span-2">{children}</div>
        <aside 
          aria-label="Completed SonShine roofing projects" 
          className="hidden lg:flex min-w-0 flex-col gap-6"
        >
          {projects.map((project) => project?.heroImage ? (
            <figure key={project.slug} className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-xs">
              <div className={cn(CONTENT_PREVIEW_MEDIA_CLASS, 'aspect-4/3')}>
                <Image src={project.heroImage.url} alt={project.heroImage.altText || project.title} fill
                  sizes="(min-width: 1152px) 352px, (min-width: 1024px) 32vw, 100vw"
                  className="object-cover" loading="lazy" />
              </div>
              <figcaption className="space-y-2 px-5 py-4">
                <p className="text-sm font-semibold text-slate-700">{project.title}</p>
                <ProjectNeighborhood project={project} />
                <ProjectFacts project={project} className="pt-2" />
              </figcaption>
            </figure>
          ) : null)}
        </aside>
      </div>
    </section>
  );
}

export function LandingFaq({ items }: { items: { question: string; answer: ReactNode }[] }) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 text-left" data-landing-faq>
      {items.map(({ question, answer }) => (
        <Accordion key={question} summary={<h3 className="text-base font-normal text-slate-800 md:text-xl">{question}</h3>}
          size="md" tone="soft" radius="2xl" proseBody={false}>
          <div className="faq-answer text-base leading-loose text-slate-700">{answer}</div>
        </Accordion>
      ))}
    </div>
  );
}

export function LandingSection({ eyebrow, title, highlightText, subtitle, children, className, id }: {
  eyebrow?: string; title: string; highlightText?: HighlightText; subtitle?: string; children: ReactNode; className?: string; id?: string;
}) {
  return (
    <section id={id} className={cn('py-10 md:py-14', className)}>
      <div className={container}>
        {eyebrow ? <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-(--brand-blue)">{eyebrow}</p> : null}
        <h2 className={cn('text-3xl leading-tight tracking-tight md:text-4xl lg:text-4xl', subtitle ? 'mb-3' : 'mb-6')}>{renderHighlight(title, highlightText)}</h2>
        {subtitle ? <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">{subtitle}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function LandingCta({ title, highlightText, description, ctaLabel }: {
  title: string; highlightText?: HighlightText; description: string; ctaLabel: string;
}) {
  return (
    <section className="border-t border-blue-100 bg-blue-50 py-10 md:py-14">
      <div className={cn(container, 'max-w-3xl text-center')}>
        <h2 className="text-3xl leading-tight md:text-4xl lg:text-4xl">{renderHighlight(title, highlightText)}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">{description}</p>
        <SmartLink href="#book-an-appointment" aria-label={ctaLabel} className="btn btn-brand-blue mt-6 min-h-12 px-6 py-3">
          {ctaLabel}<ArrowUp className="ml-2 size-4 shrink-0" aria-hidden="true" />
        </SmartLink>
      </div>
    </section>
  );
}

export function LandingReviews({ reviews, title = 'From homeowners who chose SonShine', highlightText, subtitle }: {
  reviews: Review[]; title?: string; highlightText?: HighlightText; subtitle?: string;
}) {
  if (!reviews.length) return null;
  return (
    <LandingSection eyebrow="Homeowner Testimonials" title={title} highlightText={highlightText} subtitle={subtitle} className="bg-slate-50">
      <ReviewsCarouselView reviews={reviews.map((review) => ({
        id: `landing-${review.author_name}-${review.time ?? 'undated'}`,
        authorName: review.author_name,
        text: review.text,
        rating: review.rating ?? 5,
        ...reviewDate(review.time),
        sourceUrl: safeReviewUrl(review.author_url) ?? 'https://www.google.com/maps/place/SonShine+Roofing/data=!4m2!3m1!1s0x0:0x5318594fb175e958',
        sourceLabel: 'View on Google',
        sourceLogo: staticImage('google-logo'),
      }))} />
    </LandingSection>
  );
}

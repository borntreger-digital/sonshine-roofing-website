import Image from 'next/image';
import { CalendarDays, HandCoins, ShieldCheck } from 'lucide-react';
import LandingHero from '@/components/marketing/landing-page/LandingHero';
import InitialNavigation from '@/components/lead-capture/lead-form/InitialNavigation';
import ProjectArchiveCard from '@/components/dynamic-content/project/ProjectArchiveCard';
import { CONTENT_PREVIEW_IMAGE_SIZES } from '@/components/dynamic-content/card-utils';
import FaqInlineListClient from '@/components/dynamic-content/faq/FaqInlineListClient';
import ServiceAreaSection from '@/components/location/ServiceAreaSection';
import LocationSectionHeading from '@/components/location/LocationSectionHeading';
import { FEATURE_LIST_CLASS, FEATURE_PILL_CLASS } from '@/components/location/sectionStyles';
import LocationReviewsCarousel from '@/components/reviews-widget/LocationReviewsCarousel';
import SmartLink from '@/components/utils/SmartLink';
import { cn } from '@/lib/utils';
import { allura } from '@/lib/ui/allura-font';
import { JsonLd } from '@/lib/seo/json-ld';
import { faqSchema } from '@/lib/seo/schema';
import { sanitizeFaqHtml } from '@/lib/content/directus-faq-html';
import { sanitizeSponsorHtml } from '@/lib/content/directus-sponsor-html';
import type { DirectusFaq } from '@/lib/content/directus-faqs';
import type {
  LocationGroups,
  LocationNeighborhood,
  LocationPage,
  LocationProject,
  LocationReview,
  LocationSponsor,
} from '@/lib/content/location-types';

export type LocationHubProps = {
  page: LocationPage;
  projects: LocationGroups<LocationProject>;
  reviews: LocationGroups<LocationReview>;
  sponsors: LocationGroups<LocationSponsor>;
  neighborhoods: LocationNeighborhood[];
  /** All local published projects, including those outside the six recent cards. */
  neighborhoodProjects?: LocationProject[];
  faqs: DirectusFaq[];
};

type SectionCopy = {
  heading: string;
  highlightText: string;
  description: string;
};

function ProjectCards({ projects }: { projects: LocationProject[] }) {
  if (!projects.length) return null;
  return (
    <div className="grid items-start gap-8 md:grid-cols-2 lg:grid-cols-3">
      {projects.map(({ id, project }) => (
        <article key={id} className="space-y-4">
          <ProjectArchiveCard project={project} imageSizes={CONTENT_PREVIEW_IMAGE_SIZES} />
          {project.neighborhood?.name.trim() ? (
            <p className="px-2 text-sm text-slate-600" data-project-neighborhood>
              <span className="font-semibold">Neighborhood: </span>{project.neighborhood.name}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ProjectGroup({ heading, highlightText, description, projects, nearbyProjects }: SectionCopy & {
  projects: LocationProject[];
  nearbyProjects: LocationProject[];
}) {
  if (!projects.length && !nearbyProjects.length) return null;
  return (
    <section className="space-y-8" aria-label={heading}>
      <LocationSectionHeading heading={heading} highlightText={highlightText} description={description} />
      <ProjectCards projects={projects} />
      {nearbyProjects.length ? (
        <div className="space-y-6" aria-label="Roofing Projects in Nearby Areas">
          <h3 className="text-center text-2xl text-slate-700 md:text-3xl">Roofing Projects in Nearby Areas</h3>
          <ProjectCards projects={nearbyProjects} />
        </div>
      ) : null}
    </section>
  );
}

function SponsorGroup({ heading, highlightText, description, sponsors }: SectionCopy & { sponsors: LocationSponsor[] }) {
  if (!sponsors.length) return null;
  return (
    <section className="space-y-8" aria-label={heading}>
      <LocationSectionHeading heading={heading} highlightText={highlightText} description={description} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sponsors.map(({ id, feature, areaNames }) => (
          <article key={id} className="space-y-4 rounded-3xl border border-blue-200 bg-white p-6">
            {feature.featuredImage ? (
              <Image src={feature.featuredImage.url} alt={feature.featuredImage.altText || ''}
                width={96} height={96} sizes="96px" className="h-24 w-24 object-contain" />
            ) : null}
            <h3 className="text-2xl">{feature.title}</h3>
            <p className="text-sm text-slate-600">{Array.from(new Set(areaNames)).join(', ')}</p>
            {feature.contentHtml ? (
              <div className="space-y-3 text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeSponsorHtml(feature.contentHtml) }} />
            ) : null}
            {feature.links && (feature.links.websiteUrl || feature.links.facebookUrl || feature.links.instagramUrl) ? (
              <ul className="flex flex-wrap gap-4 text-sm font-semibold text-brand-blue">
                {feature.links.websiteUrl ? <li><SmartLink href={feature.links.websiteUrl}>Website</SmartLink></li> : null}
                {feature.links.facebookUrl ? <li><SmartLink href={feature.links.facebookUrl}>Facebook</SmartLink></li> : null}
                {feature.links.instagramUrl ? <li><SmartLink href={feature.links.instagramUrl}>Instagram</SmartLink></li> : null}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

/** All records arrive from the deployment snapshot. This component never fetches CMS content. */
export default function LocationHub({
  page, projects, reviews, sponsors, neighborhoods, neighborhoodProjects, faqs,
}: LocationHubProps) {
  const faqItems = faqs.map(({ id, title, contentHtml }) => ({ id, title, contentHtml: sanitizeFaqHtml(contentHtml) }));
  const customerReviews = [...reviews.local, ...reviews.nearby];
  return (
    <>
      <LandingHero scriptFontClassName={allura.variable} title={page.title}
        highlightText={['BEST', 'Over 39 Years']} description={page.introduction} />
      <div data-location-hub className="mx-auto flex max-w-7xl flex-col gap-20 px-4 py-14 md:gap-24 md:py-20">
        <InitialNavigation heading={`Roofing Services in ${page.name}`} headingId="location-services"
          highlightText={page.name} embedded trustPills={(
            <div className={cn(FEATURE_LIST_CLASS, 'mt-6 pb-0')}>
              <span className={`${FEATURE_PILL_CLASS} inline-flex items-center gap-2`}>
                <CalendarDays className="h-4 w-4 text-(--brand-blue)" aria-hidden="true" />39+ Years of Expertise
              </span>
              <span className={`${FEATURE_PILL_CLASS} inline-flex items-center gap-2`}>
                <ShieldCheck className="h-4 w-4 text-(--brand-blue)" aria-hidden="true" />Licensed and Insured
              </span>
              <span className={`${FEATURE_PILL_CLASS} inline-flex items-center gap-2`}>
                <HandCoins className="h-4 w-4 text-(--brand-blue)" aria-hidden="true" />Flexible Financing
              </span>
            </div>
          )} />

        {customerReviews.length ? (
          <section aria-labelledby="location-reviews" className="space-y-8">
            <LocationSectionHeading id="location-reviews" heading="What Our Customers Say" highlightText="Our Customers"
              description="Read what our customers have shared about their experience with SonShine Roofing." />
            <LocationReviewsCarousel reviews={customerReviews} />
          </section>
        ) : null}

        <ProjectGroup heading={`Recent Roofing Projects in ${page.name}`} highlightText={page.name}
          description={`Take a closer look at our roofing work in ${page.name} and nearby communities.`}
          projects={projects.local} nearbyProjects={projects.nearby} />

        <SponsorGroup heading={`Partnerships in ${page.name}`} highlightText={page.name}
          description={`Meet the organizations we support in ${page.name}.`} sponsors={sponsors.local} />
        <SponsorGroup heading="Partnerships in Nearby Areas" highlightText="Nearby Areas"
          description="Meet the organizations we support in nearby communities." sponsors={sponsors.nearby} />

        <ServiceAreaSection areaId={page.id} locationName={page.name} overviewHtml={page.overviewHtml}
          mapImage={page.mapImage} neighborhoods={neighborhoods} projects={neighborhoodProjects ?? projects.local} />

        {faqItems.length ? (
          <section aria-label="Roofing Questions and Answers">
            <FaqInlineListClient heading="Roofing Questions and Answers" highlightText="Questions and Answers"
              description={`Find answers about roofing in ${page.name} and working with SonShine Roofing.`}
              className="px-2" seeMoreHref="/faq" items={faqItems} />
            <JsonLd data={faqSchema(faqItems.map((faq) => ({
              question: faq.title,
              answerHtml: faq.contentHtml,
              url: `/faq#faq-${faq.id}`,
            })), { url: `/locations/${page.slug}` })} />
          </section>
        ) : null}
      </div>
    </>
  );
}

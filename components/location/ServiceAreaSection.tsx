import Image from 'next/image';
import LocationSectionHeading from '@/components/location/LocationSectionHeading';
import NeighborhoodCard from '@/components/location/NeighborhoodCard';
import type { LocationNeighborhood, LocationProject } from '@/lib/content/location-types';
import type { ProjectImage } from '@/lib/content/project-types';
import { sanitizeFaqHtml } from '@/lib/content/directus-faq-html';

type Props = {
  areaId: string;
  locationName: string;
  overviewHtml?: string | null;
  mapImage: ProjectImage | null;
  neighborhoods: LocationNeighborhood[];
  /** Published local project matches from the same deployment. */
  projects: LocationProject[];
};

export default function ServiceAreaSection({ areaId, locationName, overviewHtml, mapImage, neighborhoods, projects }: Props) {
  const coverage = neighborhoods.filter((item) => item.serviceAreaId === areaId && item.name.trim());
  if (!overviewHtml && !mapImage && !coverage.length) return null;

  return (
    <section aria-labelledby="location-coverage" className="space-y-8">
      <LocationSectionHeading id="location-coverage" heading={`Where We Work in ${locationName}`}
        highlightText={locationName}
        description="Explore the neighborhoods we serve, with links to our published projects where available." />

      {overviewHtml ? (
        <div className="mx-auto max-w-3xl space-y-4 text-lg leading-relaxed text-slate-700"
          dangerouslySetInnerHTML={{ __html: sanitizeFaqHtml(overviewHtml) }} />
      ) : null}

      {mapImage ? (
        <figure className="mx-auto max-w-4xl space-y-3">
          <Image src={mapImage.url} alt={mapImage.altText}
            width={mapImage.width || 1080} height={mapImage.height || 907}
            sizes="(max-width: 1024px) 100vw, 896px"
            className="h-auto w-full rounded-xl border border-blue-200" />
          <figcaption className="text-sm text-slate-600">{locationName} service coverage map</figcaption>
        </figure>
      ) : null}

      {coverage.length ? (
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {coverage.map((neighborhood) => {
            const matchingProjects = projects.filter((record) =>
              record.status === 'published' &&
              record.serviceAreaIds.includes(areaId) &&
              record.project.neighborhood?.id === neighborhood.id,
            );
            return (
              <NeighborhoodCard key={neighborhood.id} neighborhood={neighborhood} locationName={locationName}
                projects={matchingProjects.map(({ project }) => project)} />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

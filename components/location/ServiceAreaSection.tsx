import Image from 'next/image';
import SmartLink from '@/components/utils/SmartLink';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTENT_PREVIEW_GRID_CLASS, CONTENT_PREVIEW_IMAGE_SIZES, CONTENT_PREVIEW_MEDIA_CLASS } from '@/components/dynamic-content/card-utils';
import { cn } from '@/lib/utils';
import LocationSectionHeading from '@/components/location/LocationSectionHeading';
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
            className="h-auto w-full rounded-3xl border border-blue-200" />
          <figcaption className="text-sm text-slate-600">{locationName} service coverage map</figcaption>
        </figure>
      ) : null}

      {coverage.length ? (
        // Repeated flex tracks share one size across every card row, while photos retain their aspect ratio.
        <div className={cn(CONTENT_PREVIEW_GRID_CLASS, 'auto-rows-[auto_1fr_2fr_2fr]')}>
          {coverage.map((neighborhood) => {
            const matchingProjects = projects.filter((record) =>
              record.status === 'published' &&
              record.serviceAreaIds.includes(areaId) &&
              record.project.neighborhood?.id === neighborhood.id,
            );
            const description = neighborhood.description?.trim();
            const landmarks = neighborhood.landmarks?.trim();
            return (
              <Card key={neighborhood.id} className="row-span-4 grid grid-rows-subgrid gap-0" data-neighborhood-card>
                <div className={cn(CONTENT_PREVIEW_MEDIA_CLASS, 'aspect-video bg-blue-100')} data-neighborhood-photo>
                  {neighborhood.image ? (
                    <Image src={neighborhood.image.url} alt={neighborhood.image.altText}
                      fill sizes={CONTENT_PREVIEW_IMAGE_SIZES} className="object-cover" />
                  ) : null}
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold leading-tight">{neighborhood.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-6 leading-7 text-slate-600" data-neighborhood-description>
                  {description ? <p>{description}</p> : null}
                  {landmarks ? <p><span className="font-semibold">Nearby landmarks: </span>{landmarks}</p> : null}
                  {neighborhood.mapImage ? (
                    <Image src={neighborhood.mapImage.url} alt={neighborhood.mapImage.altText}
                      width={neighborhood.mapImage.width || 960} height={neighborhood.mapImage.height || 540}
                      sizes={CONTENT_PREVIEW_IMAGE_SIZES} className="h-auto w-full rounded-xl" />
                  ) : null}
                </CardContent>
                <CardFooter className="block border-t border-blue-200 bg-blue-50 p-6" data-neighborhood-projects>
                  {matchingProjects.length ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-800">Featured Projects:</h4>
                      <ul className="list-disc space-y-2 pl-5">
                        {matchingProjects.map(({ id, project }) => (
                          <li key={id}>
                            <SmartLink href={project.uri} className="font-semibold text-brand-blue underline underline-offset-4">
                              {project.title}
                            </SmartLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

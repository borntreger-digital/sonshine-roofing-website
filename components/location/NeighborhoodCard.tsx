import Image from 'next/image';
import { ChevronDown, House, MapPin } from 'lucide-react';
import ProjectArchiveCard from '@/components/dynamic-content/project/ProjectArchiveCard';
import { CONTENT_PREVIEW_IMAGE_SIZES } from '@/components/dynamic-content/card-utils';
import type { LocationNeighborhood } from '@/lib/content/location-types';
import type { ProjectSummary } from '@/lib/content/project-types';
import { cn } from '@/lib/utils';
import styles from './NeighborhoodCard.module.css';

export type NeighborhoodCardProps = {
  neighborhood: LocationNeighborhood;
  locationName: string;
  /** Published projects matched to this service area and neighborhood by the caller. */
  projects: readonly ProjectSummary[];
};

export default function NeighborhoodCard({ neighborhood, locationName, projects }: NeighborhoodCardProps) {
  const description = neighborhood.description?.trim();
  const landmarks = neighborhood.landmarks?.trim();
  const [firstProject, ...additionalProjects] = projects;

  return (
    <div className={styles.shell}>
      <article className={cn('not-prose rounded-xl', styles.card)} data-neighborhood-card>
        <div className={styles.photo} data-neighborhood-photo>
          {neighborhood.image ? (
            <Image
              src={neighborhood.image.url}
              alt={neighborhood.image.altText}
              fill
              sizes={CONTENT_PREVIEW_IMAGE_SIZES}
              className={styles.image}
            />
          ) : (
            <div className={styles.photoMissing} role="img" aria-label="Neighborhood photo unavailable">
              <House aria-hidden="true" />
              <span aria-hidden="true">Neighborhood photo unavailable</span>
            </div>
          )}
        </div>

        <div className={styles.body}>
          <header className={styles.heading}>
            <h3>{neighborhood.name}</h3>
            {locationName ? <p className={styles.location}><MapPin aria-hidden="true" /><span>{locationName}</span></p> : null}
          </header>

          {description ? (
            description.length > 270 ? (
              <details className={styles.overview} aria-label={`${neighborhood.name} overview`}>
                <summary>
                  <span className={cn(styles.description, styles.descriptionExcerpt)}>{description}</span>
                  <span className={styles.disclosureLabel}>
                    <span className={styles.whenClosed}>Read neighborhood overview</span>
                    <span className={styles.whenOpen}>Show less</span>
                    <ChevronDown className={styles.chevron} aria-hidden="true" />
                  </span>
                </summary>
                <p className={cn(styles.description, styles.descriptionFull)} data-neighborhood-description>{description}</p>
              </details>
            ) : <p className={styles.description} data-neighborhood-description>{description}</p>
          ) : null}

          {landmarks ? (
            <dl className={styles.landmarks}>
              <div><dt>Nearby</dt><dd>{landmarks}</dd></div>
            </dl>
          ) : null}

          {neighborhood.mapImage ? (
            <details className={styles.map}>
              <summary><span>Neighborhood map</span><ChevronDown className={styles.chevron} aria-hidden="true" /></summary>
              <Image
                src={neighborhood.mapImage.url}
                alt={neighborhood.mapImage.altText}
                width={neighborhood.mapImage.width || 960}
                height={neighborhood.mapImage.height || 540}
                sizes={CONTENT_PREVIEW_IMAGE_SIZES}
                className="rounded-lg"
              />
            </details>
          ) : null}

          {firstProject ? (
            <section className={styles.projects} data-neighborhood-projects aria-label={`Roofing projects in ${neighborhood.name}`}>
              <div className={styles.projectsHeading}>
                <h4>Roofing projects</h4><span className="rounded-md">{projects.length}</span>
              </div>
              <ul className={styles.projectList} role="list">
                <li><ProjectArchiveCard project={firstProject} variant="compact" headingLevel={5} imageSizes="80px" /></li>
              </ul>
              {additionalProjects.length ? (
                <details className={styles.moreProjects}>
                  <summary>
                    <span className={styles.whenClosed}>
                      {additionalProjects.length} more {additionalProjects.length === 1 ? 'project' : 'projects'} in {neighborhood.name}
                    </span>
                    <span className={styles.whenOpen}>Show fewer projects</span>
                    <ChevronDown className={styles.chevron} aria-hidden="true" />
                  </summary>
                  <ul className={styles.projectList} role="list">
                    {additionalProjects.map((project) => (
                      <li key={project.id}><ProjectArchiveCard project={project} variant="compact" headingLevel={5} imageSizes="80px" /></li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}

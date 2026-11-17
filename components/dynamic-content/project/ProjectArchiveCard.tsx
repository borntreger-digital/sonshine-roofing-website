import type { CSSProperties } from 'react';
import Image from 'next/image';
import { ArrowRight, House, MapPin } from 'lucide-react';
import SmartLink from '@/components/utils/SmartLink';
import { CONTENT_PREVIEW_IMAGE_SIZES } from '@/components/dynamic-content/card-utils';
import type { ProjectSummary, TermLite } from '@/lib/content/project-types';
import { buildProjectHref, buildProjectHrefFromUri, ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import styles from './ProjectArchiveCard.module.css';

export type ProjectCardVariant = 'standard' | 'archive' | 'related' | 'compact';

export type ProjectArchiveCardProps = {
  project: ProjectSummary;
  style?: CSSProperties;
  className?: string;
  imageSizes?: string;
  variant?: ProjectCardVariant;
  /** Landing-page proof cards intentionally keep visitors in the lead flow. */
  linked?: boolean;
  headingLevel?: 3 | 4 | 5;
  /** Static proof cards can show the complete testimonial without a detail-page link. */
  reviewDisplay?: 'excerpt' | 'full';
};

const DEFAULT_IMAGE_SIZES: Record<ProjectCardVariant, string> = {
  standard: CONTENT_PREVIEW_IMAGE_SIZES,
  archive: '(min-width: 1280px) 520px, (min-width: 768px) 44vw, calc(100vw - 32px)',
  related: CONTENT_PREVIEW_IMAGE_SIZES,
  compact: '76px',
};

const termNames = (terms?: readonly TermLite[]) =>
  [...new Set((terms ?? []).map(({ name }) => name.trim()).filter(Boolean))].join(', ');

function excerpt(value: string | null | undefined, limit: number): string {
  const text = value?.trim().replace(/\s+/g, ' ') ?? '';
  if (text.length <= limit) return text;
  const prefix = text.slice(0, limit + 1);
  const wordBoundary = prefix.lastIndexOf(' ');
  return `${prefix.slice(0, wordBoundary > limit * 0.65 ? wordBoundary : limit).replace(/[\s,.…]+$/, '')}…`;
}

export default function ProjectArchiveCard({
  project,
  style,
  className,
  imageSizes,
  variant = 'standard',
  linked = true,
  headingLevel = 3,
  reviewDisplay = 'excerpt',
}: ProjectArchiveCardProps) {
  const href =
    buildProjectHref(project.slug) ??
    buildProjectHrefFromUri(project.uri) ??
    project.uri ??
    ROUTES.project;
  const Heading = `h${headingLevel}` as 'h3' | 'h4' | 'h5';
  const condensed = variant === 'related' || variant === 'compact';
  const summary = condensed ? '' : excerpt(project.projectDescription, 190);
  const review = condensed
    ? ''
    : reviewDisplay === 'full'
      ? (project.reviewSnippet?.trim() ?? '')
      : excerpt(project.reviewSnippet, 145);
  const author = project.reviewAuthorName?.trim();
  const neighborhood = project.neighborhood?.name.trim();
  const facts = [
    ['Material', termNames(project.materialTypes)],
    ['Color', termNames(project.roofColors)],
    ['Location', termNames(project.serviceAreas)],
  ].filter(([, value]) => value);
  const cardClassName = cn(
    'proj-card',
    styles.card,
    styles[variant],
    linked ? styles.interactive : styles.staticCard,
    !summary && styles.noDescription,
    (summary || review) && styles.hasProse,
  );
  const content = (
    <>
      <div className={styles.photo}>
        {project.heroImage?.url ? (
          <Image
            fill
            src={project.heroImage.url}
            alt={project.heroImage.altText || project.title}
            sizes={imageSizes ?? DEFAULT_IMAGE_SIZES[variant]}
            className={styles.image}
          />
        ) : (
          <div className={styles.photoMissing} role="img" aria-label="Project photo unavailable">
            <House aria-hidden="true" />
            <span aria-hidden="true">Project photo unavailable</span>
          </div>
        )}
      </div>

      <div className={styles.heading}>
        <Heading className={styles.title}>{project.title}</Heading>
        {neighborhood ? (
          <p data-project-neighborhood className={styles.neighborhood}>
            <MapPin aria-hidden="true" />
            <span>{neighborhood}</span>
          </p>
        ) : null}
      </div>

      {facts.length ? (
        <dl data-project-facts className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {summary ? <p className={styles.description}>{summary}</p> : null}

      {review ? (
        <blockquote className={cn(styles.review, reviewDisplay === 'full' && styles.fullReview)}>
          <p>&ldquo;{review}&rdquo;</p>
          {author ? <cite>— {author}</cite> : null}
        </blockquote>
      ) : null}

      {linked ? (
        <div className={styles.footer}>
          <span>{variant === 'compact' ? 'View project' : 'View project details'}</span>
          <span className={styles.arrow} aria-hidden="true">
            <ArrowRight />
          </span>
        </div>
      ) : null}
    </>
  );

  return (
    <div className={cn('not-prose', styles.shell, className)} style={style}>
      {linked ? (
        <SmartLink
          href={href}
          className={cardClassName}
          aria-label={`View project: ${project.title}`}
          data-project-card={variant}
          unstyled
          proseGuard
        >
          {content}
        </SmartLink>
      ) : (
        <article className={cardClassName} data-project-card={variant}>
          {content}
        </article>
      )}
    </div>
  );
}

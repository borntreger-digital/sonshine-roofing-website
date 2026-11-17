'use client';

import type { CSSProperties, MouseEvent } from 'react';
import Image from 'next/image';
import { ArrowRight, Play } from 'lucide-react';
import SmartLink from '@/components/utils/SmartLink';
import { truncateText } from '@/components/dynamic-content/card-utils';
import type { VideoItem } from '@/lib/content/video-types';
import { buildProjectHref } from '@/lib/routes';
import { cn } from '@/lib/utils';
import styles from './VideoArchiveCard.module.css';

export type VideoCardVariant = 'standard' | 'archive' | 'compact';

export type VideoArchiveCardProps = {
  video: VideoItem;
  onVideoOpen?: (video: VideoItem) => void;
  variant?: VideoCardVariant;
  imageSizes?: string;
  className?: string;
  style?: CSSProperties;
  /** Last-resort legacy identity when upstream video identifiers are absent. */
  index?: number;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const DEFAULT_IMAGE_SIZES: Record<VideoCardVariant, string> = {
  standard: '(min-width: 1024px) 50vw, 100vw',
  archive: '(min-width: 1280px) 520px, (min-width: 768px) 44vw, calc(100vw - 32px)',
  compact: '120px',
};

export default function VideoArchiveCard({
  video,
  onVideoOpen,
  variant = 'standard',
  imageSizes,
  className,
  style,
  index = 0,
}: VideoArchiveCardProps) {
  const safeSlug = String(video.id ?? video.slug ?? video.youtubeId ?? index);
  const categories = video.categories ?? [];
  const categoryNames = categories.map(({ name }) => name).filter(Boolean);
  const bucketSlugs = categories
    .map(({ slug, name }) => slug ?? name ?? '')
    .filter((value) => value.length > 0)
    .join(',');
  const materialSlugs = (video.materialTypes ?? []).map(({ slug }) => slug ?? '').filter(Boolean).join(',');
  const serviceSlugs = (video.serviceAreas ?? []).map(({ slug }) => slug ?? '').filter(Boolean).join(',');
  const description = variant === 'compact' ? undefined : truncateText(String(video.excerpt ?? ''), 220);
  const publishedDate = video.date ? new Date(video.date) : null;
  const validPublishedDate = publishedDate && !Number.isNaN(publishedDate.getTime()) ? publishedDate : null;
  const dateLabel = validPublishedDate ? dateFormatter.format(validPublishedDate) : '';
  // The content adapter supplies projectSlug only for a published related project.
  const projectHref = video.projectSlug ? buildProjectHref(video.projectSlug) : null;

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onVideoOpen?.(video);
  };

  return (
    <div
      className={cn('vid-item block not-prose', styles.shell, className)}
      style={style}
      data-video-slug={safeSlug}
    >
      <article
        className={cn('vid-card', styles.card, styles[variant], variant === 'compact' ? 'rounded-lg' : 'rounded-xl')}
        data-video-card={variant}
        data-title={video.title}
        data-cats={categoryNames.join(', ')}
        data-bucket={bucketSlugs}
        data-mt={materialSlugs}
        data-sa={serviceSlugs}
      >
        <button
          type="button"
          className={cn(styles.media, !video.thumbnailUrl && styles.mediaMissing)}
          aria-label={`Play ${video.title || 'video'}`}
          onClick={handleOpen}
          data-video-slug={safeSlug}
        >
          {video.thumbnailUrl ? (
            <Image
              fill
              src={video.thumbnailUrl}
              alt={video.title}
              sizes={imageSizes ?? DEFAULT_IMAGE_SIZES[variant]}
              className={styles.image}
            />
          ) : (
            <span className={styles.missing} aria-hidden="true">
              <span>Preview unavailable</span>
            </span>
          )}
          <span className={styles.play} aria-hidden="true">
            <Play fill="currentColor" strokeWidth={0} />
          </span>
        </button>

        <div className={styles.body}>
          <h3 className={styles.title}>{video.title}</h3>
          {categoryNames.length || dateLabel ? (
            <dl className={styles.facts} data-video-facts>
              {categoryNames.length ? (
                <div className={styles.fact}>
                  <dt>{categoryNames.length > 1 ? 'Topics' : 'Topic'}</dt>
                  <dd>{categoryNames.join(', ')}</dd>
                </div>
              ) : null}
              {dateLabel && validPublishedDate ? (
                <div className={styles.fact}>
                  <dt>Published</dt>
                  <dd><time dateTime={validPublishedDate.toISOString()}>{dateLabel}</time></dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {description ? <p className={styles.description}>{description}</p> : null}
          {projectHref ? (
            <SmartLink href={projectHref} className={styles.project} unstyled proseGuard>
              <span className={styles.projectLabel}>Related project</span>
              <span className={styles.projectTitle}>See full project details <ArrowRight aria-hidden="true" /></span>
            </SmartLink>
          ) : null}
        </div>
      </article>

      <template className="vid-body-src" suppressHydrationWarning>
        {String(video.excerpt ?? '')}
      </template>
    </div>
  );
}

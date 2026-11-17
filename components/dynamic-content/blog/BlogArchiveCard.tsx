import { Fragment, type CSSProperties } from 'react';
import Image from 'next/image';
import { ArrowRight, FileText } from 'lucide-react';
import SmartLink from '@/components/utils/SmartLink';
import type { PostCard } from '@/lib/content/content-types';
import { stripHtml } from '@/lib/content/html-text';
import { CONTENT_PREVIEW_IMAGE_SIZES } from '@/components/dynamic-content/card-utils';
import { buildBlogPostHref, ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import styles from './BlogArchiveCard.module.css';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export type BlogCardVariant = 'standard' | 'archive' | 'compact';

export type BlogArchiveCardProps = {
  post: PostCard;
  style?: CSSProperties;
  className?: string;
  imageSizes?: string;
  variant?: BlogCardVariant;
};

const DEFAULT_IMAGE_SIZES: Record<BlogCardVariant, string> = {
  standard: CONTENT_PREVIEW_IMAGE_SIZES,
  archive: '(min-width: 1280px) 440px, (min-width: 1024px) 32vw, (min-width: 768px) 44vw, calc(100vw - 32px)',
  compact: '76px',
};

function excerpt(value: string, limit = 230): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length <= limit) return text;
  const prefix = text.slice(0, limit + 1);
  const boundary = prefix.lastIndexOf(' ');
  return `${prefix.slice(0, boundary > limit * 0.65 ? boundary : limit).replace(/[\s,.…]+$/, '')}…`;
}

export default function BlogArchiveCard({
  post,
  style,
  className,
  imageSizes,
  variant = 'standard',
}: BlogArchiveCardProps) {
  const href = buildBlogPostHref(post.slug) ?? ROUTES.blog;
  const date = post.date ? new Date(post.date) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : '';
  const summarySource = post.contentPlain || stripHtml(post.excerpt || '');
  const summary = variant === 'compact' ? '' : excerpt(summarySource);
  const categories = [...new Set((post.categories ?? []).map((category) => category.trim()).filter(Boolean))];
  const hasFacts = Boolean(dateLabel || categories.length);

  return (
    <article className={cn('not-prose', styles.shell, className)} style={style}>
      <SmartLink
        href={href}
        className={cn(
          'blog-card',
          variant === 'compact' ? 'rounded-lg' : 'rounded-xl',
          styles.card,
          styles[variant],
          !hasFacts && styles.noFacts,
          !summary && styles.noSummary,
        )}
        title={post.title}
        aria-label={`Read article: ${post.title}`}
        data-blog-card={variant}
        unstyled
        proseGuard
      >
        <div className={styles.photo}>
          {post.featuredImage?.url ? (
            <Image
              fill
              src={post.featuredImage.url}
              alt={post.featuredImage.altText || post.title}
              sizes={imageSizes ?? DEFAULT_IMAGE_SIZES[variant]}
              className={styles.image}
            />
          ) : (
            <div className={styles.photoMissing} role="img" aria-label="Article photo unavailable">
              <FileText aria-hidden="true" />
              <span aria-hidden="true">Article photo unavailable</span>
            </div>
          )}
        </div>

        <div className={styles.heading}>
          <h3 className={styles.title}>{post.title}</h3>
        </div>

        {hasFacts ? (
          <dl className={styles.facts} data-blog-facts>
            {dateLabel ? (
              <div className={styles.fact}>
                <dt>Published</dt>
                <dd><time dateTime={post.date}>{dateLabel}</time></dd>
              </div>
            ) : null}
            {categories.length ? (
              <div className={styles.fact}>
                <dt>Topics</dt>
                <dd className={styles.topics}>
                  {categories.map((category, index) => (
                    <Fragment key={category}>
                      {index > 0 ? <span className={styles.separator} aria-hidden="true">·</span> : null}
                      <span>{category}</span>
                    </Fragment>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {summary ? <p className={styles.description}>{summary}</p> : null}

        <div className={styles.footer}>
          <span>Read article</span>
          <span className={styles.arrow} aria-hidden="true"><ArrowRight /></span>
        </div>
      </SmartLink>
    </article>
  );
}

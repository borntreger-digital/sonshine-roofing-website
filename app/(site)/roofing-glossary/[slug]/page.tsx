import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import Section from '@/components/layout/Section';
import SmartLink from '@/components/utils/SmartLink';
import { getGlossaryTerm, listGlossaryIndex, type GlossarySummary } from '@/lib/content/glossary';
import { getSiteSettings } from '@/lib/content/directus-site';
import { buildBasicMetadata } from '@/lib/seo/meta';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, definedTermSchema } from '@/lib/seo/schema';
import { SITE_ORIGIN } from '@/lib/seo/site';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Link the first plain-text occurrence of each other glossary term. Directus
 * HTML is sanitized before this helper runs, and inserted href/class values
 * are generated exclusively from validated slugs and static markup.
 */
function autoLinkGlossary(
  html: string,
  index: Array<Pick<GlossarySummary, 'slug' | 'title'>>,
  currentSlug: string,
): string {
  if (!html || !index.length) return html;

  const candidates = index
    .filter((term) => term.slug !== currentSlug && term.title)
    .sort((left, right) => right.title.length - left.title.length);
  if (!candidates.length) return html;

  const byTitle = new Map(candidates.map((term) => [term.title.toLowerCase(), term.slug]));
  const pattern = candidates.map((term) => escapeRegExp(term.title)).join('|');
  if (!pattern) return html;
  const matcher = new RegExp(`(?<![\\w-])(${pattern})(?![\\w-])`, 'gi');
  const tokens = html.split(/(<[^>]+>)/g);
  const linkedOnce = new Set<string>();
  let inAnchor = false;
  let inCode = false;
  let linkBudget = 40;

  for (let indexPosition = 0; indexPosition < tokens.length; indexPosition += 1) {
    const token = tokens[indexPosition];
    if (!token) continue;
    if (token.startsWith('<')) {
      if (/^<a\b/i.test(token)) inAnchor = true;
      else if (/^<\/a\b/i.test(token)) inAnchor = false;
      if (/^<code\b/i.test(token)) inCode = true;
      else if (/^<\/code\b/i.test(token)) inCode = false;
      continue;
    }
    if (inAnchor || inCode || linkBudget <= 0) continue;

    tokens[indexPosition] = token.replace(matcher, (match) => {
      if (linkBudget <= 0) return match;
      const slug = byTitle.get(match.toLowerCase());
      if (!slug || linkedOnce.has(slug)) return match;
      linkedOnce.add(slug);
      linkBudget -= 1;
      return `<a href="/roofing-glossary/${slug}" class="underline decoration-dotted hover:decoration-solid">${match}</a>`;
    });
  }

  return tokens.join('');
}

export const revalidate = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [term, settings] = await Promise.all([getGlossaryTerm(slug), getSiteSettings()]);
  if (!term) notFound();

  const description =
    term.metaDescription ?? term.contentPlain.slice(0, 160) ?? 'SonShine Roofing glossary term.';
  const image = term.ogImageOverride ?? settings?.defaultOgImage;
  return buildBasicMetadata({
    title: term.metaTitle ?? `${term.title} | Roofing Glossary`,
    description,
    openGraphTitle: term.ogTitle ?? term.metaTitle ?? undefined,
    openGraphDescription: term.ogDescription ?? term.metaDescription ?? undefined,
    path: `/roofing-glossary/${term.slug}`,
    keywords: term.focusKeywords,
    image: image
      ? {
          url: image.url,
          width: image.width ?? undefined,
          height: image.height ?? undefined,
          alt: 'altText' in image ? image.altText : image.description,
        }
      : { url: '/og-default.png?v=20260818', width: 1200, height: 630 },
    robots: { index: !term.noindex, follow: true },
  });
}

export async function generateStaticParams() {
  const index = await listGlossaryIndex();
  return index.map((term) => ({ slug: term.slug }));
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [index, term] = await Promise.all([listGlossaryIndex(), getGlossaryTerm(slug)]);
  if (!term) notFound();

  const position = index.findIndex((item) => item.slug === slug);
  const hasPosition = position >= 0;
  const previous =
    hasPosition && position > 0
      ? index[position - 1]
      : hasPosition
        ? index[index.length - 1]
        : null;
  const next =
    hasPosition && position < index.length - 1
      ? index[position + 1]
      : hasPosition
        ? index[0]
        : null;
  const termPath = `/roofing-glossary/${term.slug}`;
  const linkedHtml = autoLinkGlossary(term.contentHtml, index, term.slug);

  const definedTermLd = definedTermSchema({
    name: term.title,
    description: term.contentPlain.slice(0, 300),
    url: termPath,
    inDefinedTermSet: '/roofing-glossary',
    origin: SITE_ORIGIN,
  });
  const breadcrumbsLd = breadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'Roofing Glossary', item: '/roofing-glossary' },
      { name: term.title, item: termPath },
    ],
    { origin: SITE_ORIGIN },
  );

  return (
    <Section className="py-8 md:py-10">
      <div className="mx-auto max-w-3xl px-2">
        <nav className="mb-5" aria-label="Glossary">
          <SmartLink href="/roofing-glossary" className="btn btn-sm btn-ghost">
            ← Back to Glossary
          </SmartLink>
        </nav>

        <article className="rounded-xl border border-blue-200 bg-white p-5 shadow-xs md:p-8">
          <p className="mb-3 text-sm font-semibold text-slate-600">Roofing Glossary</p>
          <h1 className="wrap-break-word text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            {term.title}
          </h1>
          <JsonLd data={definedTermLd} />
          <JsonLd data={breadcrumbsLd} />
          <div
            className="prose prose-slate mt-5 max-w-none text-base leading-relaxed prose-p:text-base prose-li:text-base prose-a:text-(--brand-blue)"
            dangerouslySetInnerHTML={{ __html: linkedHtml }}
          />
        </article>

        {hasPosition && (
          <nav className="mt-6 grid grid-cols-2 gap-3" aria-label="Term navigation">
            {previous ? (
              <SmartLink
                href={`/roofing-glossary/${previous.slug}`}
                rel="prev"
                className="group inline-flex min-w-0 items-center justify-between gap-2 rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-(--brand-blue) hover:bg-blue-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue)"
                aria-label={`Previous term: ${previous.title}`}
              >
                <span aria-hidden>←</span>
                <span className="min-w-0 wrap-break-word">{previous.title}</span>
              </SmartLink>
            ) : (
              <span />
            )}

            {next ? (
              <SmartLink
                href={`/roofing-glossary/${next.slug}`}
                rel="next"
                className="group inline-flex min-w-0 items-center justify-between gap-2 rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-(--brand-blue) hover:bg-blue-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue)"
                aria-label={`Next term: ${next.title}`}
              >
                <span className="min-w-0 wrap-break-word">{next.title}</span>
                <span aria-hidden>→</span>
              </SmartLink>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </Section>
  );
}

export const dynamic = 'force-static';

export const dynamicParams = false;

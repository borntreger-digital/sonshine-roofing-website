import ResourcePage from '@/components/resources/ResourcePage';
import {
  ResourceSearchPanel,
  ResourceSearchField,
  ResourceGroupHeading,
  resourceClearButtonClass,
} from '@/components/resources/ResourceUi';
import SmartLink from '@/components/utils/SmartLink';
import { groupFaqsForArchive, listAllFaqs } from '@/lib/content/directus-faqs';
import type { Metadata } from 'next';
import FaqSearchController from '@/components/dynamic-content/faq/FaqSearchController';
import { ArrowDown, ArrowUp, ArrowRight, ChevronDown, X } from 'lucide-react';
import FaqBulkToggleClient from '@/components/dynamic-content/faq/FaqBulkToggleClient';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, faqSchema } from '@/lib/seo/schema';
import { SITE_ORIGIN } from '@/lib/seo/site';
import { getWebsitePageMetadata } from '@/lib/content/directus-site';

export const revalidate = false;
const PAGE_PATH = '/faq';

export async function generateMetadata(): Promise<Metadata> {
  // EDIT: FAQ archive SEO title/description/copy here (applies to prod + staging)
  const title = 'Roofing FAQs | SonShine Roofing';
  const description =
    'Clear, no-nonsense answers to the most common roofing questions in Sarasota, Manatee, and Charlotte Counties. Get the facts before you buy.';

  return getWebsitePageMetadata({
    title,
    description,
    path: PAGE_PATH,
    image: { url: '/og-default.png?v=20260818', width: 1200, height: 630 },
  });
}

export default async function FAQArchivePage() {
  const faqs = await listAllFaqs(500);
  const groups = groupFaqsForArchive(faqs);

  // JSON-LD uses the same complete collection displayed below.
  const origin = SITE_ORIGIN;
  const faqLd = faqSchema(
    faqs.map((faq) => ({
      question: faq.title,
      answerHtml: faq.contentHtml,
      url: `${PAGE_PATH}#faq-${faq.id}`,
    })),
    { origin, url: PAGE_PATH },
  );
  const breadcrumbsLd = breadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'FAQ', item: PAGE_PATH },
    ],
    { origin },
  );

  return (
    <ResourcePage
      title="Frequently Asked Questions"
      introduction="Answers to common roofing questions from our team in Sarasota. If you can’t find what you need, we’re one call away."
      activePath={PAGE_PATH}
    >
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbsLd} />
      <ResourceSearchPanel>
        <ResourceSearchField
          id="faq-search"
          label="Search FAQs"
          placeholder="Search questions or topics…"
          aria-describedby="faq-search-hint"
          disabled
          clearButton={
            <button
              id="faq-clear-search"
              type="button"
              hidden
              className={resourceClearButtonClass}
              aria-label="Clear FAQ search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          }
        />
        <p id="faq-search-hint" className="mt-2 text-sm text-slate-500">
          Enter at least two characters to search.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600" role="status">
            Showing <span id="faq-result-count">{faqs.length}</span> FAQs
          </p>
          <button
            id="faq-toggle-all"
            type="button"
            disabled
            aria-expanded="false"
            aria-controls="faq-topics"
            className="btn btn-sm btn-outline gap-2 disabled:cursor-default disabled:opacity-50"
            data-state="collapsed"
          >
            <span data-faq-toggle-label>Expand all</span>
            <ArrowDown className="h-4 w-4" data-faq-toggle-icon="down" aria-hidden="true" />
            <ArrowUp className="hidden h-4 w-4" data-faq-toggle-icon="up" aria-hidden="true" />
          </button>
        </div>
      </ResourceSearchPanel>
      <div
        id="faq-no-results"
        className="mt-6 hidden rounded-xl border border-blue-200 bg-white p-5"
      >
        <p className="text-slate-700">
          No results for <span id="faq-query" className="font-semibold" />.
        </p>
        <p className="mt-2 text-sm text-slate-600">Try another question or clear your search.</p>
        <div id="faq-suggestions" className="mt-3 hidden">
          <p className="text-sm text-slate-600">Did you mean:</p>
          <ul id="faq-suggestion-list" className="mt-2 flex flex-wrap gap-2" />
        </div>
      </div>
      <div className="mt-6 space-y-6" id="faq-topics">
        {groups.map(({ key, title, items: list }, groupIndex) =>
          list.length ? (
            <section
              key={key}
              id={`topic-${key}`}
              aria-labelledby={`topic-heading-${key}`}
              className="faq-topic overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xs"
            >
              <ResourceGroupHeading
                title={title}
                count={list.length}
                id={`topic-heading-${key}`}
                countClassName="faq-count"
              />
              <div className="divide-y divide-blue-100 px-4 md:px-5">
                {list.map((f, index) => (
                  <details
                    key={f.id}
                    id={`faq-${f.id}`}
                    open={groupIndex === 0 && index === 0}
                    className="faq-item group/answer scroll-mt-28"
                    data-title={f.title}
                    data-topic={title}
                    data-excerpt=""
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-slate-800 hover:text-(--brand-blue) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-blue) group-open/answer:text-(--brand-blue) [&::-webkit-details-marker]:hidden">
                      <h3 className="text-base font-semibold leading-relaxed">{f.title}</h3>
                      <ChevronDown
                        className="h-5 w-5 shrink-0 text-(--brand-blue) transition-transform group-open/answer:rotate-180 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </summary>
                    <div
                      className="faq-answer prose prose-slate max-w-none pb-5 text-base leading-relaxed prose-p:my-3 prose-p:text-base prose-li:text-base prose-a:text-(--brand-blue)"
                      dangerouslySetInnerHTML={{ __html: f.contentHtml || '' }}
                    />
                  </details>
                ))}
              </div>
            </section>
          ) : null,
        )}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-blue-200 pt-5">
        <p className="text-sm text-slate-600">Looking for a roofing term?</p>
        <SmartLink
          href="/roofing-glossary"
          aria-label="Explore the glossary"
          className="btn btn-sm btn-ghost gap-2"
        >
          Explore the glossary <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SmartLink>
      </div>
      <FaqBulkToggleClient />
      <FaqSearchController
        ids={{
          query: '#faq-search',
          noResults: '#faq-no-results',
          resultCount: '#faq-result-count',
        }}
        urlKeys={{ q: 'q' }}
        minQueryLen={2}
      />
    </ResourcePage>
  );
}

export const dynamic = 'force-static';

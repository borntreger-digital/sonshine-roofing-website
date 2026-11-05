import Section from '@/components/layout/Section';
import StaticImage from '@/components/media/StaticImage';
import { listRelatedPosts } from '@/lib/content/blog';
import { listFaqs } from '@/lib/content/directus-faqs';
import FaqInlineList from '@/components/dynamic-content/faq/FaqInlineList';
import YouMayAlsoLike from '@/components/engagement/YouMayAlsoLike';
import RoofCareClub from '@/components/marketing/service-pages/RoofCareClub';
import type { Metadata } from 'next';
import ServicesAside from '@/components/global-nav/static-pages/ServicesAside';
import { getServiceMetadata } from '@/lib/content/directus-site';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { getServicePageConfig } from '@/lib/seo/service-pages';
import { SITE_ORIGIN } from '@/lib/seo/site';
import Hero from '@/components/ui/Hero';

const SERVICE_PATH = '/roof-maintenance';
const SERVICE_CONFIG = getServicePageConfig(SERVICE_PATH);

export async function generateMetadata(): Promise<Metadata> {
  const config = SERVICE_CONFIG;

  if (!config) {
    return getServiceMetadata({
      slug: SERVICE_PATH.slice(1),
      title: 'Roof Maintenance | SonShine Roofing',
      description: 'Roof maintenance services from SonShine Roofing.',
      path: SERVICE_PATH,
    });
  }

  return getServiceMetadata({
    slug: SERVICE_PATH.slice(1),
    title: config.title,
    description: config.description,
    path: SERVICE_PATH,
    image: config.image,
  });
}

export default async function Page() {
  const [pool, faqs] = await Promise.all([
    listRelatedPosts({ categorySlugs: ['roof-maintenance'] }),
    listFaqs({ serviceSlug: 'roof-maintenance', limit: 8 }).catch(() => []),
  ]);

  const origin = SITE_ORIGIN;
  const config = SERVICE_CONFIG;
  const breadcrumbsConfig = config?.breadcrumbs ?? [
    { name: 'Home', path: '/' },
    { name: 'Roof Maintenance', path: SERVICE_PATH },
  ];

  const webPageLd = webPageSchema({
    name: config?.title ?? 'Roof Maintenance',
    description: config?.description,
    url: SERVICE_PATH,
    origin,
    primaryImage: config?.image?.url ?? '/og-default.png?v=20260818',
    isPartOf: { '@type': 'WebSite', name: 'SonShine Roofing', url: origin },
  });

  const breadcrumbsLd = breadcrumbSchema(
    breadcrumbsConfig.map((crumb) => ({
      name: crumb.name,
      item: crumb.path,
    })),
    { origin },
  );

  return (
    <>
      <Hero
        title="Roof Maintenance"
        subtitle="For over 39 years, we've prioritized maintaining your current roof over upselling you on a replacement you don't need. We understand that committment, loyalty, and trust contribute more to our success than making a quick buck. To get the full lifespan out of your roof, we genuinely recommend that you join our 'Roof Care Club.' For less than $200 per year, your roof is guaranteed to live its full life, potentially saving you thousands in costly repairs or premature replacement. The choice is yours. Call us today to discuss a plan that works for you."
        eyelash="Residential Roof Maintenance in Sarasota, FL and Surrounding Areas"
        badges={[]}
        justifyStart
      >
        <div className="flex gap-6 flex-wrap max-w-3xl">
          <div>
            <p className="italic text-sm text-slate-300">Starting at just</p>
            <p className="text-blue-400 mt-2 text-4xl">
              <span className="line-through text-slate-400 items-start text-lg mr-1">$189 </span>
              $169<span className="text-slate-200 ml-1 text-lg">/ per year</span>
            </p>
          </div>
        </div>
      </Hero>
      <Section>
        <div className="grid px-2 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] overflow-visible items-start">
          <div id="article-root" className="prose min-w-0 max-lg:max-w-none">
            {/* JSON-LD: WebPage + BreadcrumbList */}
            <JsonLd data={webPageLd} />
            <JsonLd data={breadcrumbsLd} />

            <RoofCareClub origin={origin} />

            <h2 className="text-3xl">
              Undoubtedly, lack of maintenance is among the top reasons why roofs fail.
            </h2>
            <p>
              Whether it’s a large hole or a small leak, water that seeps below the top layer of a
              roof can destroy everything in its path. Small leaks, in particular, are dangerous
              because the damage often goes undetected for years. This hidden moisture leads to
              rotting wood sheathing and trusses, increased utility costs, and serious health risks
              due to mold and mildew growth. In fact, such damage can silently erode your safety,
              comfort, and security—sometimes for as long as 13 years before it becomes visible
              inside the home.
            </p>

            <figure className="not-prose">
              <div className="relative aspect-4/3 overflow-hidden rounded-lg">
                <StaticImage crop
                  src="static:roof-maintenance-saves-money-graphic"
                  fill
                  className="object-cover mb-2"
                  sizes="(max-width: 768px) 100vw, 800px"
                  loading="lazy"
                />
              </div>
            </figure>

            <p>
              While it may be tempting to ignore your roof’s maintenance needs, doing so can shorten
              its lifespan and lead to major expenses down the road. Roofing materials are built to
              last, but only when they’re properly maintained. That’s why SonShine Roofing strongly
              recommends following a roof maintenance schedule and sticking with it year after year.
              <br></br>
              <br></br>
              Routine roof inspections are critical to catching these hidden problems early—before
              they escalate into major roof repairs, structural rot, or indoor health hazards that
              threaten your home and well-being.
            </p>
          </div>

          <ServicesAside activePath={SERVICE_PATH} />
        </div>

        <div data-toc-exclude>
          <YouMayAlsoLike
            posts={pool}
            heading="Learn More About Roof Maintenance Services"
          />
        </div>

        {/* FAQs (dynamic) */}
        <FaqInlineList
          heading="Roof Maintenance FAQs"
          pagePath="/roof-maintenance"
          limit={8}
          initialItems={faqs}
          seeMoreHref="/faq"
        />
      </Section>
    </>
  );
}

export const revalidate = false;

export const dynamic = 'force-static';

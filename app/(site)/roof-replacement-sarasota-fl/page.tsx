import Section from '@/components/layout/Section';
import ServicesAside from '@/components/global-nav/static-pages/ServicesAside';
import StaticImage from '@/components/media/StaticImage';
import SmartLink from '@/components/utils/SmartLink';
import { listRelatedPosts } from '@/lib/content/blog';
import { listFaqs } from '@/lib/content/directus-faqs';
import FaqInlineList from '@/components/dynamic-content/faq/FaqInlineList';
import YouMayAlsoLike from '@/components/engagement/YouMayAlsoLike';
import { Accordion } from '@/components/ui/Accordion';
import {
  ShieldCheck,
  Layers,
  BadgeCheck,
  Wrench,
  ListChecks,
  Lightbulb,
  CircleCheckBig,
  HandCoins,
  CheckCircle,
  Ban,
  Smartphone,
  Zap,
  ArrowDown,
} from 'lucide-react';
import RepairVsReplace from '@/components/marketing/service-pages/RepairVsReplace';
import type { Metadata } from 'next';
import FinancingBand from '@/components/cta/FinancingBand';
import { getServiceMetadata, getSiteSettings } from '@/lib/content/directus-site';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, howToSchema, webPageSchema } from '@/lib/seo/schema';
import { getServicePageConfig } from '@/lib/seo/service-pages';
import { SITE_ORIGIN } from '@/lib/seo/site';
import Hero from '@/components/ui/Hero';
import EvenSimplerLeadForm from '@/components/lead-capture/lead-form/EvenSimplerLeadForm';
import { Suspense } from 'react';
import { getPersonProfileImage } from '@/lib/content/persons';

const figureStyles = 'not-prose py-8';
const liStyles = 'relative pl-4';
const stepperStyles = 'absolute left-[-5px] top-2 h-2 w-2 rounded-full bg-[#0045d7]';

const SERVICE_PATH = '/roof-replacement-sarasota-fl';
const SERVICE_CONFIG = getServicePageConfig(SERVICE_PATH);

export async function generateMetadata(): Promise<Metadata> {
  const config = SERVICE_CONFIG;

  if (!config) {
    return getServiceMetadata({
      slug: SERVICE_PATH.slice(1),
      title: 'Roof Replacement | SonShine Roofing',
      description: 'Roof replacement services from SonShine Roofing.',
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
  const [pool, faqs, nathanImage, settings] = await Promise.all([
    listRelatedPosts({ categorySlugs: ['roof-replacement'] }),
    listFaqs({ serviceSlug: 'roof-replacement-sarasota-fl', limit: 8 }).catch(() => []),
    getPersonProfileImage('nathan-borntreger'),
    getSiteSettings(),
  ]);
  const origin = SITE_ORIGIN;
  const config = SERVICE_CONFIG;

  const breadcrumbsConfig = config?.breadcrumbs ?? [
    { name: 'Home', path: '/' },
    { name: 'Roof Replacement', path: SERVICE_PATH },
  ];

  const webPageLd = webPageSchema({
    name: config?.title ?? 'Roof Replacement',
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

  const howToLd = howToSchema({
    name: 'Roof Replacement: What to Expect',
    description:
      'Step-by-step overview of a typical roof replacement from permits through final inspection and warranty.',
    steps: [
      { name: 'Permits & Scheduling', text: 'We file permits and set your installation date.' },
      { name: 'Site Prep', text: 'We protect landscaping and the home exterior.' },
      { name: 'Tear-off & Inspection', text: 'We remove old materials and inspect decking.' },
      {
        name: 'Install New Roof',
        text: 'Underlayment, flashing, ventilation, and finishing materials are installed.',
      },
      {
        name: 'Final Inspection & Cleanup',
        text: 'We inspect the final install and clean the site.',
      },
      { name: 'Warranty & Maintenance', text: 'We provide warranty info and maintenance tips.' },
    ],
    url: SERVICE_PATH,
    origin,
  });
  return (
    <>
      <Hero
        title="Roof Replacement"
        subtitle="For over 39 years, we've been Sarasota's premier roofing company providing long‑lasting shingle, tile, flat and metal roof replacements with robust workmanship warranties, flexible financing, and a team you can trust. Schedule an appointment with a Roofing Specialist today to learn more."
        eyelash="Residential Roof Replacement Services in Sarasota, FL and surrounding areas"
        badges={[
          { icon: CheckCircle, label: 'GAF Master Elite Contractor' },
          { icon: Ban, label: 'No Subcontractors' },
          { icon: ShieldCheck, label: '25-year Warranty' },
          { icon: HandCoins, label: 'Flexible Financing' },
        ]}
        justifyStart
        imageSrc="static:red-tile-roof-white-home"
      >
        <div className="flex flex-wrap gap-3">
          <SmartLink
            href="#book-an-appointment"
            className="btn-brand-blue btn-lg px-3 py-2 rounded-lg"
            aria-label="Get Ballpark Estimate Online"
            data-icon-affordance="down"
            proseGuard
          >
            <Zap className="h-4 w-4 mr-2 inline" aria-hidden="true" />
            Free Estimate
            <ArrowDown className="ml-2 inline h-4 w-4 icon-affordance" />
          </SmartLink>
          <SmartLink
            href={settings?.phoneHref ?? '#book-an-appointment'}
            className="btn-outline text-white btn-lg px-3 py-2 hover:bg-transparent rounded-lg phone-affordance"
            aria-label="Call SonShine Roofing if you have questions"
            proseGuard
          >
            <Smartphone className="h-4 w-4 mr-2 phone-affordance-icon inline" aria-hidden="true" />
            {settings?.phone ?? 'Call us'}
          </SmartLink>
        </div>
      </Hero>
      <Section>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] overflow-visible items-start px-2">
          <div id="article-root" className="prose min-w-0 max-lg:max-w-none">
            {/* JSON-LD: WebPage + BreadcrumbList + HowTo */}
            <JsonLd data={webPageLd} />
            <JsonLd data={breadcrumbsLd} />
            <JsonLd data={howToLd} />
            <h2 className="mt-0">How do you know if you need new roof installation?</h2>
            <p>
              The thought of replacing your roof may feel overwhelming, but we’re here to help. Our
              Roofing Specialists and Production Team will walk you through the process, answer your
              questions, and be available to you even after your new roof is completed.
              <br />
              <br />
              Workmanship warranties are available on all of our roof replacements. SonShine offers
              coverage ranging from 6 to 25 years, depending on the materials you choose when
              building your new roof.
            </p>

            <Suspense fallback={null}>
              <EvenSimplerLeadForm
                projectType="retail"
                page="/roof-replacement-sarasota-fl"
                title="Free Roof Replacement Estimate"
                titleHighlight="Roof Replacement"
              />
            </Suspense>

            <h2>What Should You Know Before Getting a Roof Replacement?</h2>
            <Accordion
              icon={<ShieldCheck className="h-7 w-7" aria-hidden="true" />}
              summary={<h3 className="text-xl text-slate-800">Know Your Contractor</h3>}
              className="mb-4"
              radius="2xl"
              proseBody={false}
              open
            >
              <p>
                SonShine Roofing is licensed by the State of Florida as a roofing contractor and is
                fully insured. While state law requires roofers to carry a valid license and
                insurance, neither guarantees quality workmanship, real experience, or a
                long-lasting roof.
              </p>

              <figure className={figureStyles}>
                <div className="relative aspect-4/3 overflow-hidden rounded-3xl">
                  <StaticImage
                    src={nathanImage.url}
                    alt={nathanImage.altText}
                    fill
                    className="object-cover mb-2"
                    sizes="(max-width: 768px) 100vw, 800px"
                    loading="lazy"
                  />
                </div>
                <figcaption className="mt-3 mx-2 text-xs text-slate-500">
                  <strong>Nathan Borntreger</strong> — Owner of SonShine Roofing • Insured • LIC: #
                  {settings?.licenseNumber ?? 'Florida contractor'} |{' '}
                  <SmartLink
                    className="hover:underline no-italic text-(--brand-blue)"
                    href="/person/nathan-borntreger"
                  >
                    See full bio
                  </SmartLink>
                </figcaption>
              </figure>

              <p>
                We bring over 50 years of combined expertise and hands-on experience to your
                real-world roofing needs. Our roofing crews are true employees of SonShine
                Roofing—not subcontractors—and we invest in their ongoing roofing education to keep
                pace with evolving industry standards.
              </p>
            </Accordion>

            <Accordion
              icon={<Layers className="h-7 w-7" aria-hidden="true" />}
              summary={<h3 className="text-xl text-slate-800">Know What Materials You Need</h3>}
              className="mb-4"
              radius="2xl"
              proseBody={false}
            >
              <p>
                There are many roofing material options available to choose from, and we’re here to
                help you determine what’s best for your home. As with any roof replacement or home
                improvement project, material selection plays a key role in the lifespan and
                performance of your roof.
                <br />
                <br />
                Elements like the type of nails used, quality of the underlayment, and balanced,
                efficient attic ventilation all contribute to a successful roof system. At SonShine
                Roofing, we take the time to walk you through every material option and answer your
                questions thoroughly.
              </p>

              <figure className={figureStyles}>
                <div className="relative aspect-4/3 overflow-hidden rounded-3xl">
                  <StaticImage crop
                    src="static:tile-shingle-metal-roof-comparison"
                    fill
                    className="object-cover mb-2"
                    sizes="(max-width: 768px) 100vw, 800px"
                    loading="lazy"
                  />
                </div>
              </figure>

              <p>
                It’s not just about the materials themselves — proper installation is equally
                important. Our experienced team ensures that every component is installed to the
                highest standard for long-term durability and protection.
              </p>
            </Accordion>

            <Accordion
              icon={<BadgeCheck className="h-7 w-7" aria-hidden="true" />}
              summary={
                <h3 className="text-xl text-slate-800">
                  Know What Warranties Come with Your New Roof
                </h3>
              }
              className="mb-4"
              radius="2xl"
              proseBody={false}
            >
              <p>
                There are usually two types of warranty that come with your new roof: workmanship
                and manufacturer.
                <br />
                <br />
              </p>

              <h4>Workmanship Warranty</h4>
              {/* Inline callout (#6) */}
              <div
                className="my-4 rounded-3xl border border-[#fb9216]/30 bg-[#fb9216]/5 p-4"
                role="note"
                aria-label="Important"
              >
                <strong className="uppercase block font-display text-[1rem] text-slate-800 mb-1">
                  <CircleCheckBig className="h-4 w-4 mr-2 text-(--brand-blue) inline" />
                  Fact:
                </strong>
                <p className="m-0 text-slate-700">
                  The vast majority of roof failures are caused by poor workmanship, and often you
                  won’t notice these errors for many years down the line without yearly inspections.
                </p>
              </div>
              <p>
                This is why it is important to seek out roofers who stand behind their work with
                extended workmanship warranties and have a long-standing reputation. This ensures
                that you won’t be on the hook for costly repairs that are not your fault.
                <br />
                <br />
                Depending on your roof and warranty package, you can enjoy up to 30 years of
                workmanship coverage with SonShine Roofing.
                <br />
                <br />
              </p>

              <h4>Manufacturer Warranty</h4>
              <p>
                Many roofing materials also come with warranties directly from the manufacturer that
                protect against product defects. That being said, such defects are incredibly rare
                with reputable vendors such as GAF, Eagle Tile, Westlake Royal Roofing, Polyglass
                USA, Crown Tile, and Sunshine Metal Supply.
                <br />
                <br />
                These warranties typically last for decades, some even up to 50 years on more
                durable materials such as metal or tile.
                <br />
                <br />
              </p>

              <h4>Important Note</h4>
              <p>
                As with any contract, always read the fine print before you sign. Be aware that
                warranties typically do not cover anything considered beyond “normal wear and tear.”
                <br />
                <br />
                For example, if a tree falls on your roof during a hurricane, that is neither the
                manufacturer’s nor the roofer’s fault. Ideally this sort of event would be covered
                by your insurance company.
              </p>
            </Accordion>

            <Accordion
              icon={<Wrench className="h-7 w-7" aria-hidden="true" />}
              summary={
                <h3 className="text-xl text-slate-800">Know the Importance of Roof Maintenance</h3>
              }
              className="mb-4"
              radius="2xl"
              proseBody={false}
            >
              <p>
                A roof replacement is a major investment—but that doesn’t mean your new roof is “set
                it and forget it.” Regular maintenance is the key to protecting your roof’s
                longevity and your home’s safety. Even the highest quality roofing materials need
                routine care to withstand Florida’s heat, storms, and humidity. Without regular
                checkups, small issues like clogged gutters or cracked flashing can quickly snowball
                into expensive repairs or premature failure.
              </p>

              <figure className={figureStyles}>
                <div className="relative aspect-4/3 overflow-hidden rounded-3xl">
                  <StaticImage crop
                    src="static:clearing-leaves-from-roof-gutter"
                    fill
                    className="object-cover mb-2"
                    sizes="(max-width: 768px) 100vw, 800px"
                    loading="lazy"
                  />
                </div>
              </figure>
              <p>
                At SonShine Roofing, we’ve seen it all—shingles lifted by summer storms, debris
                buildup that traps moisture, and flashing that’s been slowly leaking for months. The
                good news? These are all preventable with the right maintenance plan. We recommend
                annual inspections and seasonal touch-ups to keep your roof performing like it
                should.
                <br />
                <br />
                Proper maintenance not only extends the life of your roof but also preserves your
                warranty, safeguards your home’s structure, and helps you avoid the stress of
                emergency repairs. Whether your roof is brand new or pushing its limits, we’re here
                to help you stay ahead of the curve—because since 1987, we’ve got you covered.
              </p>

              {/* Inline callout (#6) */}
              <div
                className="my-4 rounded-3xl border border-[#fb9216]/30 bg-[#fb9216]/5 p-4"
                role="note"
                aria-label="Pro tip"
              >
                <strong className="uppercase text-[1rem] font-display block text-slate-800 mb-1">
                  <Lightbulb className="text-(--brand-orange) h-4 w-4 mr-2 inline" />
                  Pro Tip:
                </strong>
                <p className="m-0 text-slate-700">
                  Annual inspections keep warranties valid and catch small issues before they become
                  leaks.
                </p>
              </div>
            </Accordion>

            <Accordion
              icon={<ListChecks className="h-7 w-7" aria-hidden="true" />}
              summary={<h3 className="text-xl text-slate-800">Know What to Expect</h3>}
              radius="2xl"
              proseBody={false}
            >
              {/* Stepper timeline (#4) */}
              <ol className="my-4 not-prose border-blue-100 pl-6 space-y-4">
                <li className={liStyles}>
                  <span className={stepperStyles} />
                  <p className="m-0">
                    <strong>Permits &amp; Scheduling</strong> — We file permits and set your
                    installation date.
                  </p>
                </li>
                <li className={liStyles}>
                  <span className={stepperStyles} />
                  <p className="m-0">
                    <strong>Site Prep</strong> — Protect landscaping &amp; home exterior.
                  </p>
                </li>
                <li className={liStyles}>
                  <span className={stepperStyles} />
                  <p className="m-0">
                    <strong>Tear‑off &amp; Inspection</strong> — Remove old materials, inspect
                    decking.
                  </p>
                </li>
                <li className={liStyles}>
                  <span className={stepperStyles} />
                  <p className="m-0">
                    <strong>Install New Roof</strong> — Underlayment, flashing, ventilation, and
                    finish roof.
                  </p>
                </li>
                <li className={liStyles}>
                  <span className={stepperStyles} />
                  <p className="m-0">
                    <strong>Final Inspection &amp; Cleanup</strong> — Ensure quality and clean the
                    site.
                  </p>
                </li>
                <li className={liStyles}>
                  <span className={stepperStyles} />
                  <p className="m-0">
                    <strong>Warranty &amp; Maintenance</strong> — Provide warranty info and
                    maintenance tips.
                  </p>
                </li>
              </ol>
            </Accordion>

            <RepairVsReplace />

            <FinancingBand />
          </div>

          <ServicesAside activePath={SERVICE_PATH} />
        </div>

        <div data-toc-exclude>
          <YouMayAlsoLike
            posts={pool}
            heading="Learn More About Roof Replacement Services"
          />
        </div>

        {/* FAQs (dynamic) */}
        <FaqInlineList
          heading="Roof Replacement FAQs"
          pagePath="/roof-replacement-sarasota-fl"
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

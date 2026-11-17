import Section from '@/components/layout/Section';
import { AboutVideo } from '@/components/marketing/about-page/AboutVideo';
import { listTeamPersons } from '@/lib/content/persons';
import PersonGrid from '@/components/dynamic-content/person/PersonGrid';
import { HoursAndInformation } from '@/components/marketing/about-page/HoursAndInformation';
import { Accordion } from '@/components/ui/Accordion';
import {
  UserRoundSearch,
  ExternalLink,
  ShieldCheck,
  MapPin,
  HardHat,
  Heart,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import ResourcesQuickLinks from '@/components/global-nav/static-pages/ResourcesQuickLinks';
import { getSiteSettings, getWebsitePageMetadata } from '@/lib/content/directus-site';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { getServicePageConfig } from '@/lib/seo/service-pages';
import { SITE_ORIGIN } from '@/lib/seo/site';
import StaticImage from '@/components/media/StaticImage';
import Hero from '@/components/ui/Hero';
import SmartLink from '@/components/utils/SmartLink';
import SidebarCta from '@/components/cta/SidebarCta';

const SERVICE_PATH = '/about-sonshine-roofing';
const SERVICE_CONFIG = getServicePageConfig(SERVICE_PATH);

export async function generateMetadata(): Promise<Metadata> {
  const config = SERVICE_CONFIG;

  if (!config) {
    return getWebsitePageMetadata({
      title: 'About SonShine Roofing',
      description: 'Learn about the SonShine Roofing team.',
      path: SERVICE_PATH,
    });
  }

  return getWebsitePageMetadata({
    title: config.title,
    description: config.description,
    path: SERVICE_PATH,
    image: config.image,
  });
}

export default async function Page() {
  const [people, settings] = await Promise.all([listTeamPersons(), getSiteSettings()]);
  const origin = SITE_ORIGIN;
  const config = SERVICE_CONFIG;

  const breadcrumbsConfig = config?.breadcrumbs ?? [
    { name: 'Home', path: '/' },
    { name: 'About SonShine Roofing', path: SERVICE_PATH },
  ];

  const webPageLd = webPageSchema({
    name: config?.title ?? 'About SonShine Roofing',
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
        title="About Us"
        eyelash="Who we are"
        subtitle="Family-owned roofing company based in Sarasota, Florida, serving Sarasota, Manatee, and Charlotte County residents with 39+ years of experience."
        justifyStart
        imageSrc="static:sonshine-roofing-team-and-work-trucks"
        badges={[
          { icon: ShieldCheck, label: 'Licensed & Insured' },
          { icon: MapPin, label: 'Local & Family-owned' },
          { icon: HardHat, label: '39+ Years of Experience' },
          { icon: Heart, label: 'Faith-based Values' },
          { icon: Users, label: 'Community Sponsor' },
        ]}
      >
        <div className="not-prose mt-2 mb-4 flex flex-wrap items-center gap-2">
          {settings?.licenseNumber && settings.licenseUrl ? (
            <SmartLink
              href={settings.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View Florida contractor license #${settings.licenseNumber} on myfloridalicense.com (opens in a new tab)`}
              className="btn btn-brand-blue btn-md inline-flex items-center"
            >
              <span>Lic. #{settings.licenseNumber}</span>
              <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
            </SmartLink>
          ) : null}
        </div>
      </Hero>

      <Section>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] items-start max-w-full">
          <div className="prose max-w-full min-w-0">
            {/* JSON-LD: Breadcrumbs + WebPage */}
            <JsonLd data={breadcrumbsLd} />
            <JsonLd data={webPageLd} />

            <Accordion
              icon={<UserRoundSearch className="h-5 w-5 text-(--brand-blue)" aria-hidden="true" />}
              summary={<h2 className="text-2xl">What we do</h2>}
              className="mb-4"
              radius="xl"
              proseBody={false}
              defaultOpen
              contentClassName="text-lg bg-amber-50/50/25 leading-loose"
              summaryClassName="bg-amber-50/25"
            >
              <p>
                We specialize in <strong>residential roofing services</strong>, including{' '}
                <strong>roof repair</strong>, <strong>roof replacement</strong>,{' '}
                <strong>roof inspections</strong>, and our <strong>Roof Care Club</strong>, which is
                our preventative maintenance program uniquely designed for Sarasota-area homeowners.
                We work with a wide variety of materials, including{' '}
                <strong>asphalt shingles</strong>, <strong>metal panels</strong>,{' '}
                <strong>concrete tiles</strong>, and even some <strong>flat roofs</strong>.
              </p>
              <AboutVideo />
              <p>
                We&rsquo;ve learned that <strong>superior customer service</strong> and{' '}
                <strong>honesty</strong> with clients are the most reliable ways to stay in business
                long term. The majority of our work is based on referrals and word-of-mouth, which
                we are very proud of, and you&apos;ll quickly see why that&apos;s the case.
              </p>
              <p className="mt-4">
                By the way, when you ask us to inspect your roof, we&rsquo;ll tell you the{' '}
                <strong>flat-out honest truth&mdash;period</strong>. Many of the other guys will
                prioritize their big-ticket customers during storm season, leaving budget-conscious
                and savvy homeowners out to dry. Not us. We always give our expert recommendation
                based on our <strong>39+ years</strong> of professional experience in the Sarasota
                area, and we will <strong>NEVER</strong> sell you something you don&apos;t need.
              </p>
            </Accordion>

            <Accordion
              icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
              summary={<h2 className="text-2xl">Local &amp; Family-owned</h2>}
              className="mb-4"
              radius="xl"
              proseBody={false}
              defaultOpen
              summaryClassName="bg-sky-50"
              contentClassName="bg-sky-50 text-lg leading-loose"
            >
              <p>
                Unlike storm-chasing contractors, SonShine Roofing is rooted in the Sarasota
                community. Since we are keenly attuned to unpredictable nature of hurricane season,
                we focus on <strong>quality</strong> over &lsquo;quick fixes,&rsquo; offering
                durable roofing solutions backed by in-house crews, exclusive manufacturer
                warranties and our own 25-year Leak Free Guarantee.
              </p>
              <div className="flex items-center justify-self-center">
                <StaticImage
                  src="static:sonshine-roofing-team-and-work-trucks"
                  title="SonShine Roofing Team"
                  width={800}
                  height={225}
                  className="my-6"
                />
              </div>
              <p>
                When you choose SonShine Roofing, you are showing that you value honesty, reliable
                service, and unbeatable quality. We trust that you&rsquo;ll make{' '}
                <strong>the right choice</strong>.
              </p>
            </Accordion>

            <HoursAndInformation />
          </div>

          <aside className="lg:sticky top-16 self-start lg:h-fit">
            <ResourcesQuickLinks activePath={SERVICE_PATH} />
            <div className="h-px w-full bg-blue-100 my-4" />
            <SidebarCta />
          </aside>
        </div>
      </Section>

      <Section>
        <h2 id="meet-our-team" className="text-center mb-8 meet-our-team text-3xl lg:text-5xl">
          Meet Our Team
        </h2>
        <div className="gradient-divider my-4" />
        <PersonGrid people={people} />
      </Section>
    </>
  );
}

export const revalidate = false;

export const dynamic = 'force-static';

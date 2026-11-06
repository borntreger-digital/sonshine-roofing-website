import { listPersonNav, listPersonsBySlug } from '@/lib/content/persons';
import type { Metadata } from 'next';
import PersonProfile from '@/components/dynamic-content/person/PersonProfile';
import SidebarCta from '@/components/cta/SidebarCta';
import { notFound } from 'next/navigation';
import { buildProfileMetadata } from '@/lib/seo/meta';
import { JsonLd } from '@/lib/seo/json-ld';
import { breadcrumbSchema, personSchema, webPageSchema } from '@/lib/seo/schema';
import { SITE_ORIGIN } from '@/lib/seo/site';
import { getSiteSettings } from '@/lib/content/directus-site';

export const revalidate = false;

// Dynamic metadata per person
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [person, settings] = await Promise.all([listPersonsBySlug(slug), getSiteSettings()]);
  const canonicalPath = `/person/${slug}`;
  const title = person?.seo.meta_title ?? 'Team Member | SonShine Roofing';
  const description =
    person?.seo.meta_description ??
    'Meet the SonShine Roofing team serving Sarasota, Manatee, and Charlotte Counties.';
  const ogImage = person?.seo.og_image;

  const [firstName, ...restName] = person?.title?.split(' ') ?? [];
  const metadata = buildProfileMetadata({
    title,
    description,
    openGraphTitle: person?.seo.og_title,
    openGraphDescription: person?.seo.og_description,
    path: canonicalPath,
    image: ogImage
      ? {
          url: ogImage.url,
          width: ogImage.width ?? undefined,
          height: ogImage.height ?? undefined,
          alt: ogImage.altText || person?.title,
        }
      : settings?.defaultOgImage
        ? {
            url: settings.defaultOgImage.url,
            width: settings.defaultOgImage.width ?? undefined,
            height: settings.defaultOgImage.height ?? undefined,
            alt: settings.defaultOgImage.description,
          }
        : { url: '/og-default.png?v=20260818', width: 1200, height: 630 },
    profile: firstName
      ? {
          firstName,
          lastName: restName.length ? restName.join(' ') : undefined,
        }
      : undefined,
    keywords: person?.focusKeywords,
  });

  metadata.robots = { index: person ? !person.noindex : false, follow: true };
  return metadata;
}

export async function generateStaticParams() {
  const navItems = await listPersonNav();
  return navItems.map(({ slug }) => ({ slug }));
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [person, navItems] = await Promise.all([listPersonsBySlug(slug), listPersonNav()]);
  if (!person) return notFound();

  const origin = SITE_ORIGIN;
  const pagePath = `/person/${person.slug}`;

  const personLd = personSchema({
    name: person.title,
    description: person.seo.meta_description,
    url: pagePath,
    origin,
    jobTitle: person.positionTitle ?? undefined,
    image: person.featuredImage?.url,
    worksFor: `${origin}/#roofingcontractor`,
  });

  const breadcrumbsLd = breadcrumbSchema(
    [
      { name: 'Home', item: '/' },
      { name: 'About SonShine Roofing', item: '/about-sonshine-roofing' },
      { name: person.title, item: pagePath },
    ],
    { origin },
  );

  const webPageLd = webPageSchema({
    name: person.seo.meta_title,
    description: person.seo.meta_description,
    url: pagePath,
    origin,
    primaryImage: person.featuredImage?.url ?? '/og-default.png?v=20260818',
    isPartOf: { '@type': 'WebSite', name: 'SonShine Roofing', url: origin },
  });

  return (
    <>
      <JsonLd data={personLd} />
      <JsonLd data={breadcrumbsLd} />
      <JsonLd data={webPageLd} />
      <PersonProfile person={person} people={navItems} contact={<SidebarCta embedded />} />
    </>
  );
}

export const dynamic = 'force-static';

export const dynamicParams = false;

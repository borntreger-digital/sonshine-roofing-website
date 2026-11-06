import type { ReactNode } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import Section from '@/components/layout/Section';
import SmartLink from '@/components/utils/SmartLink';
import type { Person, PersonNavItem } from '@/lib/content/persons';
import { imagePosition } from '@/lib/content/public-image';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import PersonNavigation from './PersonNavigation';

const TEAM_HREF = `${ROUTES.about}#meet-our-team`;
const STRIPE_STYLES = 'h-1 bg-linear-to-r from-[#0045d7] via-[#1c6fff] to-[#00e3fe]';

export default function PersonProfile({
  person,
  people,
  contact,
}: {
  person: Person;
  people: PersonNavItem[];
  contact: ReactNode;
}) {
  return (
    <Section>
      <article aria-labelledby="person-name">
        <SmartLink
          href={TEAM_HREF}
          className="mb-6 inline-block text-sm font-semibold text-(--brand-blue) underline-offset-4 hover:underline"
        >
          ← Back to all team members
        </SmartLink>
        <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-xs lg:grid lg:max-w-none lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[max-content_1fr] lg:items-start lg:gap-x-8 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none xl:grid-cols-[352px_minmax(0,1fr)] xl:gap-x-12">
          <header className="min-w-0 overflow-hidden bg-blue-50 lg:col-start-1 lg:row-start-1 lg:rounded-t-3xl lg:border lg:border-b-0 lg:border-blue-200 lg:bg-white">
            {person.featuredImage && (
              <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                <Image
                  src={person.featuredImage.url}
                  alt={person.featuredImage.altText || person.title}
                  fill
                  sizes="(min-width: 1280px) 350px, (min-width: 1024px) 318px, (min-width: 688px) 670px, calc(100vw - 18px)"
                  className="object-cover"
                  style={{ objectPosition: imagePosition(person.featuredImage) }}
                  priority
                />
              </div>
            )}
            <div className="min-w-0 p-5 sm:p-6">
              <h1
                id="person-name"
                className="wrap-break-word text-5xl leading-tight font-semibold text-slate-900"
              >
                {person.title}
              </h1>
              {person.positionTitle && (
                <p className="mt-3 wrap-break-word text-2xl leading-snug font-medium text-(--brand-blue)">
                  {person.positionTitle}
                </p>
              )}
            </div>
          </header>
          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:space-y-8">
            {person.howHelps.length > 0 && (
              <section
                aria-labelledby="person-helps-heading"
                className="lg:overflow-hidden lg:rounded-3xl lg:border lg:border-blue-200 lg:bg-blue-50"
              >
                <div className="bg-white px-5 pt-6 pb-2 sm:px-6 lg:py-5">
                  <h2 id="person-helps-heading" className="text-3xl leading-tight">
                    How {person.firstName} helps
                  </h2>
                </div>
                <div className={cn(STRIPE_STYLES, 'hidden lg:block')} aria-hidden="true" />
                <ul className="m-0 list-none divide-y divide-blue-100 px-5 py-2 sm:px-6">
                  {person.howHelps.map(({ text }, index) => (
                    <li
                      key={index}
                      className="flex gap-3 py-4 text-base leading-relaxed text-slate-700"
                    >
                      <Check
                        className="mt-1 h-4 w-4 shrink-0 text-(--brand-blue)"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 wrap-break-word">{text}</span>
                    </li>
                  ))}
                </ul>
                <div className={cn(STRIPE_STYLES, 'lg:hidden')} aria-hidden="true" />
              </section>
            )}
            <section
              aria-labelledby="person-bio-heading"
              className="p-5 sm:p-6 lg:rounded-3xl lg:border lg:border-blue-200 lg:bg-white lg:shadow-xs"
            >
              <h2 id="person-bio-heading" className="text-3xl leading-tight">
                Meet {person.firstName}
              </h2>
              <div
                className="prose mt-5 max-w-prose prose-p:text-base prose-p:leading-[1.85] lg:prose-p:text-lg"
                dangerouslySetInnerHTML={{ __html: person.contentHtml }}
              />
            </section>
          </div>
          <aside
            className="min-w-0 border-t border-blue-200 bg-blue-50 p-5 sm:p-6 lg:col-start-1 lg:row-start-2 lg:rounded-b-3xl lg:border lg:shadow-xs"
            aria-labelledby="person-contact-heading"
          >
            <h2
              id="person-contact-heading"
              className="mb-4 text-2xl leading-tight lg:mb-3 lg:font-sans lg:text-sm lg:font-semibold lg:text-slate-600"
            >
              Contact SonShine Roofing
            </h2>
            {contact}
          </aside>
        </div>
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <PersonNavigation slug={person.slug} people={people} />
        </div>
        <div className="mt-6 text-center">
          <SmartLink href={TEAM_HREF} className="btn btn-outline btn-md">
            View the full team
          </SmartLink>
        </div>
      </article>
    </Section>
  );
}

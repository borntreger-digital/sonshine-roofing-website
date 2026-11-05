import type { ReactNode } from 'react';
import Image from 'next/image';
import Section from '@/components/layout/Section';
import SmartLink from '@/components/utils/SmartLink';
import type { Person, PersonNavItem } from '@/lib/content/persons';
import { imagePosition } from '@/lib/content/public-image';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import PersonNavigation from './PersonNavigation';

const TEAM_HREF = `${ROUTES.about}#meet-our-team`;

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
        <header
          className={cn(
            'grid items-center gap-6',
            person.featuredImage && 'md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]',
          )}
        >
          {person.featuredImage && (
            <div className="relative aspect-4/3 w-full max-w-80 overflow-hidden rounded-3xl bg-slate-100">
              <Image
                src={person.featuredImage.url}
                alt={person.featuredImage.altText || person.title}
                fill
                sizes="(max-width: 352px) calc(100vw - 16px), 320px"
                className="object-cover"
                style={{ objectPosition: imagePosition(person.featuredImage) }}
                priority
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-(--brand-blue)">
              Meet the team
            </p>
            <h1
              id="person-name"
              className="wrap-break-word text-4xl font-semibold text-slate-900 md:text-5xl"
            >
              {person.title}
            </h1>
            {person.positionTitle && (
              <p className="mt-3 text-lg font-medium text-(--brand-blue)">{person.positionTitle}</p>
            )}
          </div>
        </header>
        <div className="gradient-divider my-8" />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 rounded-3xl border border-blue-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="prose max-w-prose">
              {person.howHelps.length > 0 && (
                <>
                  <h2 className="mt-0">How {person.firstName} helps</h2>
                  <ul>
                    {person.howHelps.map(({ text }, index) => (
                      <li key={index}>{text}</li>
                    ))}
                  </ul>
                </>
              )}
              <h2 className={cn(!person.howHelps.length && 'mt-0')}>Meet {person.firstName}</h2>
              <div dangerouslySetInnerHTML={{ __html: person.contentHtml }} />
            </div>
          </div>
          <aside className="min-w-0 lg:sticky lg:top-16" aria-label="Contact SonShine Roofing">
            {contact}
          </aside>
        </div>
        <PersonNavigation slug={person.slug} people={people} />
        <div className="mt-6 text-center">
          <SmartLink href={TEAM_HREF} className="btn btn-outline btn-md">
            View the full team
          </SmartLink>
        </div>
      </article>
    </Section>
  );
}

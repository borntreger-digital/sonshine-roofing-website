import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import SmartLink from '@/components/utils/SmartLink';
import { buildPersonHref } from '@/lib/routes';
import { imagePosition } from '@/lib/content/public-image';
import type { PersonNavItem } from '@/lib/content/persons';
import { cn } from '@/lib/utils';

function NeighborCard({ person, next }: { person: PersonNavItem; next: boolean }) {
  const image = person.featuredImage;
  const portrait = image ? (
    <div className="relative w-28 shrink-0 self-stretch bg-slate-100 sm:w-32">
      <Image
        src={image.url}
        alt=""
        fill
        sizes="128px"
        className="object-cover"
        style={{ objectPosition: imagePosition(image) }}
      />
    </div>
  ) : null;
  const Arrow = next ? ArrowRight : ArrowLeft;

  return (
    <SmartLink
      href={buildPersonHref(person.slug)!}
      className={cn(
        'group block min-w-0 rounded-3xl focus-visible:outline-hidden',
        next && 'sm:col-start-2',
      )}
      data-icon-affordance={next ? 'right' : 'left'}
    >
      <Card interactive className={cn('flex h-full', next && 'text-right')}>
        {!next && portrait}
        <div className="flex min-w-0 flex-1 flex-col">
          <CardHeader className="grow px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {next ? 'Next team member' : 'Previous team member'}
            </p>
            <CardTitle className="wrap-break-word text-xl leading-tight">{person.title}</CardTitle>
            {person.positionTitle && (
              <p className="text-sm text-slate-600">{person.positionTitle}</p>
            )}
          </CardHeader>
          <CardFooter
            className={cn(
              'gap-2 border-t border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-(--brand-blue) sm:px-5',
              next && 'justify-end',
            )}
          >
            {!next && <Arrow className="icon-affordance h-4 w-4 shrink-0" aria-hidden="true" />}
            <span>View profile</span>
            {next && <Arrow className="icon-affordance h-4 w-4 shrink-0" aria-hidden="true" />}
          </CardFooter>
        </div>
        {next && portrait}
      </Card>
    </SmartLink>
  );
}

export default function PersonNavigation({
  slug,
  people,
}: {
  slug: string;
  people: PersonNavItem[];
}) {
  const index = people.findIndex((person) => person.slug === slug);
  if (index < 0) return null;
  const previous = people[index - 1];
  const next = people[index + 1];
  if (!previous && !next) return null;

  return (
    <nav aria-label="Other team members" className="mt-8 grid gap-4 sm:grid-cols-2">
      {previous && <NeighborCard person={previous} next={false} />}
      {next && <NeighborCard person={next} next />}
    </nav>
  );
}

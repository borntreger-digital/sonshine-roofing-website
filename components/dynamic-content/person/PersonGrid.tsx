import type { Person } from '@/lib/content/persons';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import SmartLink from '@/components/utils/SmartLink';
import MediaFrame from '@/components/ui/MediaFrame';
import { ArrowRight } from 'lucide-react';
import { lineClampStyle, truncateText } from '@/components/dynamic-content/card-utils';
import { buildPersonHref, ROUTES } from '@/lib/routes';

export default function PersonGrid({ people }: { people: Person[] }) {
  if (!people?.length) return null;

  return (
    <div className="pb-16">
      <ul className="grid auto-rows-fr grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0 px-2 py-4">
        {people.map((p) => {
          const summary = truncateText(p.contentPlain, 180);
          return (
            <li key={p.slug} className="min-w-0 h-full">
              <SmartLink
                href={buildPersonHref(p.slug) ?? ROUTES.about}
                className="group block h-full rounded-2xl focus-visible:outline-hidden"
                data-icon-affordance="right"
              >
                <Card className="flex h-full flex-col overflow-hidden hover:shadow-lg transition">
                  <CardHeader className="shrink-0 px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
                    <CardTitle className="h-6 shrink-0 font-semibold text-2xl leading-6 lg:h-12 min-[1200px]:h-6">{p.title}</CardTitle>
                    <p className="mt-1 h-12 shrink-0 text-slate-700 leading-6 lg:h-18 min-[1200px]:h-12">{p.positionTitle}</p>
                  </CardHeader>

                  {p.featuredImage?.url ? (
                    <div className="relative w-full shrink-0 overflow-hidden bg-blue-200">
                      <MediaFrame
                        src={p.featuredImage.url}
                        alt={p.featuredImage.altText || p.title}
                        ratio="4 / 3"
                        className="object-cover w-full transition-transform duration-300 hover:scale-[1.06]"
                        sizes="(min-width: 1152px) 262px, (min-width: 1024px) calc((100vw - 104px) / 4), (min-width: 768px) calc((100vw - 68px) / 2), (min-width: 640px) calc((100vw - 52px) / 2), calc(100vw - 34px)"
                        priority={false}
                      />
                    </div>
                  ) : (
                    <div className="aspect-4/3 w-full shrink-0 bg-linear-to-r from-[#0045d7] to-[#00e3fe]" />
                  )}

                  <CardContent className="flex-1 px-5 pb-4 pt-5 text-slate-600 sm:px-6 sm:pb-6">
                    <p className="h-18 leading-6" style={{ ...lineClampStyle, WebkitLineClamp: 3 }}>{summary}</p>
                  </CardContent>

                  <CardFooter className="mt-auto flex shrink-0 justify-end border-t border-blue-200 bg-blue-50 font-semibold px-5 py-4 text-slate-700 sm:px-6">
                    <span className="items-center gap-2 text-base font-semibold tracking-wide">
                      See profile
                      <ArrowRight className="w-4 h-4 inline ml-2 icon-affordance" />
                    </span>
                  </CardFooter>
                </Card>
              </SmartLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

'use client';

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import SmartLink from '@/components/utils/SmartLink';
import { ArrowRight, X } from 'lucide-react';
import {
  ResourceSearchPanel,
  ResourceSearchField,
  ResourceGroupHeading,
  resourceClearButtonClass,
} from '@/components/resources/ResourceUi';
import type { GlossaryItem } from './fuzzy';
import { filterContains, suggest } from './fuzzy';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const letterFor = (title: string) => (/^[A-Za-z]/.test(title) ? title[0].toUpperCase() : '#');
const anchorFor = (letter: string) => `glossary-${letter === '#' ? 'num' : letter}`;

export default function GlossaryQuickSearch({ terms }: { terms: GlossaryItem[] }) {
  const [q, setQ] = useState('');
  const deferredQuery = useDeferredValue(q);
  const searchPanel = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () => filterContains(deferredQuery, terms, terms.length),
    [deferredQuery, terms],
  );
  const suggestions = useMemo(
    () => (deferredQuery.trim() && !filtered.length ? suggest(deferredQuery, terms, 5) : []),
    [deferredQuery, terms, filtered.length],
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, GlossaryItem[]>();
    for (const term of filtered) {
      const letter = letterFor(term.title);
      grouped.set(letter, [...(grouped.get(letter) || []), term]);
    }
    return grouped;
  }, [filtered]);
  const letters = terms.some((term) => letterFor(term.title) === '#')
    ? [...alphabet, '#']
    : alphabet;
  return (
    <>
      <div ref={searchPanel}>
        <ResourceSearchPanel>
          <ResourceSearchField
            id="glossary-search"
            label="Search glossary terms"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search roofing terms…"
            clearButton={
              q ? (
                <button
                  type="button"
                  className={resourceClearButtonClass}
                  aria-label="Clear glossary search"
                  onClick={() => {
                    setQ('');
                    searchPanel.current?.querySelector('input')?.focus();
                  }}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null
            }
          />
          <p className="mt-3 text-sm text-slate-600" role="status">
            Showing {filtered.length} of {terms.length} terms
          </p>
          <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Glossary letters">
            {letters.map((letter) =>
              groups.has(letter) ? (
                <a
                  key={letter}
                  href={`#${anchorFor(letter)}`}
                  aria-label={`Terms starting with ${letter === '#' ? 'a number or symbol' : letter}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50/50 text-sm font-semibold text-(--brand-blue) hover:bg-blue-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue)"
                >
                  {letter}
                </a>
              ) : (
                <span
                  key={letter}
                  aria-disabled="true"
                  aria-label={`No terms starting with ${letter}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-400"
                >
                  {letter}
                </span>
              ),
            )}
          </nav>
        </ResourceSearchPanel>
      </div>
      <div className="mt-6 space-y-6" id="glossary-groups" aria-busy={q !== deferredQuery}>
        {letters
          .filter((letter) => groups.has(letter))
          .map((letter) => {
            const list = groups.get(letter)!;
            const anchor = anchorFor(letter);
            return (
              <section
                key={letter}
                id={anchor}
                aria-labelledby={`${anchor}-heading`}
                className="scroll-mt-28 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xs"
              >
                <ResourceGroupHeading
                  title={letter === '#' ? '0–9 & symbols' : letter}
                  count={list.length}
                  id={`${anchor}-heading`}
                />
                <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                  {list.map((term) => (
                    <li key={term.slug} className="min-w-0">
                      <SmartLink
                        href={`/roofing-glossary/${term.slug}`}
                        aria-label={term.title}
                        className="flex h-full items-center justify-between gap-3 rounded-lg border border-blue-100 px-4 py-4 text-base font-medium text-(--brand-blue) hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue)"
                      >
                        <span className="min-w-0 wrap-break-word">{term.title}</span>
                        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        {!filtered.length && (
          <div className="rounded-xl border border-blue-200 bg-white p-5">
            <p className="text-slate-700">
              No matches for <strong>“{deferredQuery}”</strong>.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Try another spelling or clear your search.
            </p>
            {suggestions.length > 0 && (
              <>
                <p className="mt-4 text-sm text-slate-600">Did you mean:</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((term) => (
                    <li key={term.slug}>
                      <SmartLink
                        href={`/roofing-glossary/${term.slug}`}
                        aria-label={term.title}
                        className="inline-flex rounded-md border border-blue-200 px-3 py-2 text-sm text-(--brand-blue) hover:bg-blue-50"
                      >
                        {term.title}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

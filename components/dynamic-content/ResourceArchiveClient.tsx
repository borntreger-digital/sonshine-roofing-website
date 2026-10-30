'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, ChevronDown, Search } from 'lucide-react';
import type { FacetGroup } from '@/lib/content/project-types';
import type { PageResult, ResourceKind } from '@/lib/ui/pagination';
import {
  archiveLocationKey,
  archivePayloadInput,
  archiveFilterView,
  archiveConditionConflicts,
  changeArchiveSelection,
  normalizeArchiveFilters,
  readArchiveFilters,
  writeArchiveFilters,
  type ArchiveFilterGroup,
  type ArchiveFilters,
} from '@/lib/ui/archive-filters';

export type FilterGroupConfig = ArchiveFilterGroup;
type ResourceArchiveResult<Item> = PageResult<Item> & { facets?: FacetGroup[] };

type Props<Item> = {
  kind: ResourceKind;
  apiPath: string;
  pageSize: number;
  initialResult: ResourceArchiveResult<Item>;
  initialFilters: { search?: string; selections: Record<string, string[]> };
  groups: FilterGroupConfig[];
  conditionNotice?: { message: string; clearLabel: string };
  labels: { itemSingular: string; itemPlural: string };
  minSearchLength?: number;
  searchParamKey?: string;
  buildFiltersPayload: (input: ReturnType<typeof archivePayloadInput>) => Record<string, unknown>;
  renderResults: (args: {
    result: ResourceArchiveResult<Item>;
    listFilters: Record<string, unknown>;
    listKey: string;
    loading: boolean;
  }) => React.ReactNode;
};

const controlClass =
  'min-h-12 w-full min-w-0 rounded-lg border border-blue-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-(--brand-cyan) disabled:bg-slate-100 disabled:text-slate-500';

export default function ResourceArchiveClient<Item>({
  kind,
  apiPath,
  pageSize,
  initialResult,
  initialFilters,
  groups,
  conditionNotice,
  labels,
  minSearchLength = 2,
  searchParamKey = 'q',
  buildFiltersPayload,
  renderResults,
}: Props<Item>) {
  const searchParams = useSearchParams();
  const paramsString = searchParams?.toString() ?? '';
  const [draft, setDraft] = useState(() =>
    normalizeArchiveFilters(
      {
        search: initialFilters.search ?? '',
        selections: Object.fromEntries(
          groups.map((group) => [group.key, initialFilters.selections[group.key]?.[0] ?? '']),
        ),
      },
      groups,
      minSearchLength,
    ),
  );
  const [requested, setRequested] = useState(draft);
  const [applied, setApplied] = useState(() => ({
    filters: draft,
    result: initialResult,
    payload: buildFiltersPayload(archivePayloadInput(draft)),
  }));
  const [requestVersion, setRequestVersion] = useState(0);
  const [forceRequest, setForceRequest] = useState(false);
  const [outcome, setOutcome] = useState({ requested, version: 0, error: false });
  const needsRequest = forceRequest || JSON.stringify(requested) !== JSON.stringify(applied.filters);
  const settled = outcome.requested === requested && outcome.version === requestVersion;
  const loading = needsRequest && !settled;
  const error = settled && outcome.error;
  const [legacyNotice, setLegacyNotice] = useState(false);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState('');
  const appliedKeyRef = useRef(JSON.stringify(draft));
  const locationKey = archiveLocationKey(new URLSearchParams(paramsString), groups, searchParamKey);
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const conditionConflicts = archiveConditionConflicts(draft, groups);

  const publishUrl = useCallback(
    (filters: ArchiveFilters, replace = false) => {
      const url = new URL(window.location.href);
      url.search = writeArchiveFilters(
        url.searchParams,
        filters,
        groups,
        searchParamKey,
      ).toString();

      if (url.href !== window.location.href) {
        // Next's native history integration updates useSearchParams without a route fetch.
        window.history[replace ? 'replaceState' : 'pushState'](
          null,
          '',
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    },
    [groups, searchParamKey],
  );

  if (lastLocation !== locationKey) {
    setLastLocation(locationKey);
    const restored = readArchiveFilters(new URLSearchParams(paramsString), groups, minSearchLength, searchParamKey);
    setDraft(restored.filters);
    setRequested(restored.filters);
    setForceRequest(false);
    setLegacyNotice(restored.adjustedLegacyLink || (legacyNotice && JSON.stringify(restored.filters) === JSON.stringify(requested)));
  }

  useEffect(() => {
    const restored = readArchiveFilters(new URLSearchParams(paramsString), groups, minSearchLength, searchParamKey);
    if (restored.adjustedLegacyLink || restored.inferredParent) publishUrl(restored.filters, true);
  }, [paramsString, groups, minSearchLength, searchParamKey, publishUrl]);

  useEffect(() => {
    const key = JSON.stringify(requested);
    if (key === appliedKeyRef.current && !forceRequest) {
      return;
    }
    const controller = new AbortController();
    let current = true;
    const payload = buildFiltersPayload(archivePayloadInput(requested));
    fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first: pageSize, after: null, filters: payload }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Archive request failed');
        return response.json() as Promise<ResourceArchiveResult<Item>>;
      })
      .then((result) => {
        if (!current) return;
        appliedKeyRef.current = key;
        setApplied({ filters: requested, result, payload });
        setOutcome({ requested, version: requestVersion, error: false });
      })
      .catch(() => {
        if (current) setOutcome({ requested, version: requestVersion, error: true });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [requested, requestVersion, forceRequest, apiPath, pageSize, buildFiltersPayload]);

  const applyFilters = (filters: ArchiveFilters) => {
    // Legacy conditions remain readable, but require explicit repair before a new search.
    if (archiveConditionConflicts(filters, groups).length) return;
    const normalized = normalizeArchiveFilters(filters, groups, minSearchLength);
    setDraft(normalized);
    setRequested(normalized);
    setForceRequest(true);
    setRequestVersion((version) => version + 1);
    setLegacyNotice(false);
    const nextParams = writeArchiveFilters(new URLSearchParams(paramsString), normalized, groups, searchParamKey);
    setLastLocation(archiveLocationKey(nextParams, groups, searchParamKey));
    publishUrl(normalized);
  };
  const clearFilters = () => applyFilters({ search: '', selections: {} });
  const changeSelection = (key: string, value: string) => {
    const next = changeArchiveSelection(draft, groups, key, value, minSearchLength);
    const cleared = groups.filter((group) => group.key !== key && draft.selections[group.key] && !next.selections[group.key]);
    setSelectionAnnouncement(cleared.length
      ? `${cleared.map((group) => group.label).join(' and ')} cleared.` : '');
    // Dependent changes affect only the form, never the displayed results.
    setDraft(next);
  };
  const clearConditionConflicts = () => {
    const parentKey = conditionConflicts[0]?.enabledWhen?.key;
    const selections = { ...draft.selections };
    for (const group of conditionConflicts) selections[group.key] = '';
    setDraft({ ...draft, selections });
    setSelectionAnnouncement(`${conditionConflicts.map((group) => group.label).join(' and ')} cleared.`);
    // The repair button disappears; return focus to the controlling filter.
    filtersRef.current?.querySelector<HTMLSelectElement>(`[id="${kind}-${parentKey}"]`)?.focus({ preventScroll: true });
  };
  const appliedSummary = [
    ...(applied.filters.search ? [`Search: “${applied.filters.search}”`] : []),
    ...groups.flatMap((group) => {
      const option = group.options.find(
        (item) => item.slug === applied.filters.selections[group.key],
      );
      return option ? [`${group.label}: ${option.label}`] : [];
    }),
  ].join(' · ');
  const count =
    applied.result.total ??
    (typeof applied.result.meta?.overallTotal === 'number'
      ? applied.result.meta.overallTotal
      : applied.result.items.length);
  const listKey = useMemo(() => JSON.stringify(applied.payload), [applied.payload]);
  const pendingEdits =
    JSON.stringify(normalizeArchiveFilters(draft, groups, minSearchLength, true)) !==
    JSON.stringify(requested);

  return (
    <div>
      <div
        ref={filtersRef}
        className="scroll-mt-28 rounded-3xl border border-blue-300 bg-white p-4 shadow-md md:p-6"
        role="search"
        aria-label={`Search ${labels.itemPlural}`}
      >
        <h2 className="text-2xl">
          <Search
            className="mr-2 inline h-5 w-5 align-text-top text-(--brand-blue)"
            aria-hidden="true"
          />
          Search {labels.itemPlural}
        </h2>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters(draft);
          }}
        >
          <div className={`grid gap-4 ${groups.length > 1 ? 'md:grid-cols-3' : ''}`}>
            {groups.map((group) => {
              const view = archiveFilterView(group, draft, groups);
              return (
                <div key={group.key} className="min-w-0">
                  <label
                    htmlFor={`${kind}-${group.key}`}
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {view.label}
                  </label>
                  <div className="relative">
                    <select
                      id={`${kind}-${group.key}`}
                      name={group.paramKey}
                      value={draft.selections[group.key] ?? ''}
                      disabled={!view.enabled}
                      onChange={(event) => changeSelection(group.key, event.target.value)}
                      aria-describedby={
                        conditionConflicts.some((item) => item.key === group.key) ? `${kind}-condition-conflict` :
                          view.conflict ? `${kind}-${group.key}-conflict` : group.helpText ? `${kind}-${group.key}-help` : undefined
                      }
                      className={`${controlClass} peer appearance-none pr-10 forced-colors:appearance-auto`}
                    >
                      <option value="">{view.placeholder}</option>
                      {view.conflict && view.selected && (
                        <option value={view.selected.slug} disabled>{view.selected.label} (different material)</option>
                      )}
                      {view.options.map((option) => (
                        <option key={option.slug} value={option.slug}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      focusable="false"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 peer-disabled:text-slate-400 forced-colors:hidden"
                    />
                  </div>
                  {group.helpText && <p id={`${kind}-${group.key}-help`} className="mt-2 text-sm text-slate-500">{group.helpText}</p>}
                  {view.conflict && (
                    <div id={`${kind}-${group.key}-conflict`} role="alert" className="mt-2 text-sm text-amber-900">
                      <p>This saved search combines a {group.label.toLowerCase()} with a different material. Choose a matching {group.label.toLowerCase()} or clear it, then select Search.</p>
                      <button type="button" onClick={() => changeSelection(group.key, '')} className="mt-2 min-h-12 rounded-lg border border-amber-400 px-3 underline focus:outline-hidden focus:ring-2 focus:ring-(--brand-cyan)">
                        Clear {group.label.toLowerCase()}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{selectionAnnouncement}</p>
          {conditionConflicts.length > 0 && (
            <div id={`${kind}-condition-conflict`} role="alert" className="text-sm text-amber-900">
              <p>{conditionNotice?.message ?? 'This saved search uses unavailable filters. Change the category or clear those filters, then select Search.'}</p>
              <button type="button" onClick={clearConditionConflicts} className="mt-2 min-h-12 rounded-lg border border-amber-400 px-3 underline focus:outline-hidden focus:ring-2 focus:ring-(--brand-cyan)">
                {conditionNotice?.clearLabel ?? 'Clear unavailable filters'}
              </button>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <div className="min-w-0">
              <label
                htmlFor={`${kind}-search`}
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search
              </label>
              <input
                ref={searchRef}
                id={`${kind}-search`}
                name={searchParamKey}
                type="search"
                minLength={minSearchLength}
                placeholder={`Search ${labels.itemPlural}…`}
                value={draft.search}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, search: event.target.value }))
                }
                className={controlClass}
              />
            </div>
            <button
              type="submit"
              disabled={conditionConflicts.length > 0}
              aria-describedby={conditionConflicts.length > 0 ? `${kind}-condition-conflict` : undefined}
              className="min-h-12 rounded-lg bg-(--brand-blue) px-5 py-2 font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-(--brand-cyan) focus:ring-offset-2 disabled:opacity-50"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-12 rounded-lg border border-blue-300 px-4 py-2 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-(--brand-cyan) focus:ring-offset-2 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>
          {pendingEdits && conditionConflicts.length === 0 && (
            <p className="text-sm text-slate-500">Select Search to apply your changes.</p>
          )}
        </form>
        {legacyNotice && (
          <p role="status" className="mt-3 text-sm text-slate-600">
            This saved search included multiple selections. We kept the first available option in
            each filter.
          </p>
        )}
      </div>

      <div
        className="mt-6 text-sm text-slate-700"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p>
          {count} {count === 1 ? labels.itemSingular : labels.itemPlural} found.
        </p>
        {appliedSummary && <p className="mt-1 text-slate-500">{appliedSummary}</p>}
        {loading && <p className="mt-2">Loading {labels.itemPlural}…</p>}
      </div>
      {error && (
        <div role="alert" className="mt-3 text-sm text-red-700">
          <p>Unable to load your search. The previous results are still shown.</p>
          <button
            type="button"
            onClick={() => setRequestVersion((version) => version + 1)}
            className="mt-2 min-h-12 rounded-lg border border-red-300 px-4 underline focus:outline-hidden focus:ring-2 focus:ring-(--brand-cyan)"
          >
            Retry search
          </button>
        </div>
      )}
      <div aria-busy={loading}>
        {count === 0 ? (
          <div className="mt-8 rounded-xl border border-amber-400 bg-white p-6 text-slate-700">
            <p className="mb-2 font-medium">No results found.</p>
            <p className="text-sm">
              Check your search and filters, or clear all filters to start again.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 min-h-12 rounded-lg border border-blue-300 px-4 py-2 focus:outline-hidden focus:ring-2 focus:ring-(--brand-cyan)"
            >
              Clear all
            </button>
          </div>
        ) : (
          renderResults({ result: applied.result, listFilters: applied.payload, listKey, loading })
        )}
      </div>
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 md:hidden">
        <button
          type="button"
          onClick={() => {
            filtersRef.current?.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
              block: 'start',
            });
            searchRef.current?.focus({ preventScroll: true });
          }}
          className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-(--brand-blue) px-4 py-2 text-sm font-semibold text-white shadow-lg focus:outline-hidden focus:ring-2 focus:ring-(--brand-cyan) focus:ring-offset-2"
        >
          To Filters <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import FilterTabs from "@/components/dynamic-content/FilterTabs";
import SmartLink from "@/components/utils/SmartLink";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import {
  PROJECT_TAB_CONFIG,
  type MaterialKey,
  type TabConfig,
} from "@/components/dynamic-content/latest-filters/latest-tab-config";
import { renderHighlight } from "@/components/utils/renderHighlight";
import { SECTION_HEADING, SECTION_SUBTITLE } from "@/components/location/sectionStyles";
import { PROJECT_PREVIEW_GRID_CLASS } from "@/components/dynamic-content/card-utils";

const lessFatCta = "btn btn-ghost btn-sm md:btn-md w-auto";

type TabPayload = {
  key: MaterialKey;
  totalCount: number;
  slugs: string[];
};

type CardLookup = Record<string, ReactNode>;

type Props = {
  showHeader: boolean;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  tabs: TabPayload[];
  initialKey: MaterialKey;
  cardLookup: CardLookup;
  emptyState: ReactNode;
};

const CONFIG_LOOKUP = PROJECT_TAB_CONFIG.reduce(
  (acc, tab) => {
    acc[tab.key] = tab;
    return acc;
  },
  {} as Record<MaterialKey, TabConfig<MaterialKey>>,
);

export default function LatestProjectsFilter({
  showHeader,
  description,
  ctaHref,
  ctaLabel,
  tabs,
  initialKey,
  cardLookup,
  emptyState,
}: Props) {
  const [selected, setSelected] = useState<MaterialKey>(initialKey);

  const computedTabs = useMemo(
    () =>
      tabs.map((tab) => {
        const config = CONFIG_LOOKUP[tab.key];
        return {
          key: tab.key,
          label: config?.label ?? tab.key,
          icon: config?.icon,
          terms: [],
          totalCount: tab.totalCount,
          selectedCount: 0,
        };
      }),
    [tabs],
  );

  const active = useMemo(() => {
    const found = tabs.find((tab) => tab.key === selected);
    if (found) return found;
    return tabs[0] ?? null;
  }, [selected, tabs]);

  const renderFilterTabs = () => (
    <div className={`flex justify-center ${showHeader ? "mt-3" : "mb-8"}`}>
      <FilterTabs
        tabs={computedTabs}
        activeKey={selected}
        onTabChange={(key) => setSelected(key as MaterialKey)}
        isLoading={false}
        ariaLabel="Latest project filters"
      >
        {() => null}
      </FilterTabs>
    </div>
  );
  const heading = "Shingle, Metal & Tile Roof Replacement";
  const renderedHeading = renderHighlight(heading, "Roof Replacement");

  return (
    <div className="px-4 max-w-[1600px] mx-auto">
      {showHeader ? (
        <div className="text-center">
          <h2 className={SECTION_HEADING}>{renderedHeading}</h2>
          <div className="max-w-3xl mx-auto text-center">
            <p className={SECTION_SUBTITLE}>{description}</p>
          </div>
          <p className="text-slate-500 text-xs leading-none uppercase font-semibold">
            <ArrowLeftRight className="h-3 w-3 mr-1 text-(--brand-blue) inline" />
            Filter by Material
          </p>   
          {renderFilterTabs()}
        </div>
      ) : (
        renderFilterTabs()
      )}

      {showHeader && (
        <div className="mt-6 text-right">
          <SmartLink
            href={ctaHref}
            className={lessFatCta}
            title={ctaLabel}
            data-icon-affordance="right"
            proseGuard
          >
            {ctaLabel}
            <ArrowRight className="inline w-4 h-4 ml-2 icon-affordance" />
          </SmartLink>
        </div>
      )}

      <div key={selected} className={`mt-8 ${PROJECT_PREVIEW_GRID_CLASS}`}>
        {active && active.slugs.length > 0
          ? active.slugs.map((slug, index) => {
              const card = cardLookup[slug];
              if (!card) return null;
              return (
                <div
                  key={slug}
                  className="h-full min-w-0 motion-safe:animate-lp-fade-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {card}
                </div>
              );
            })
          : emptyState}
      </div>

      <style jsx global>{`
        @keyframes lp-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
        .animate-lp-fade-in { animation: lp-fade-in .28s ease-out both; }
        /* Tailwind variant friendly: use with motion-safe:animate-lp-fade-in */
      `}</style>
    </div>
  );
}

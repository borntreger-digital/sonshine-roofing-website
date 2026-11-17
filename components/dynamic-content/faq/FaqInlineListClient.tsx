"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, HelpCircle } from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { renderHighlight } from "@/components/utils/renderHighlight";
import SmartLink from "../../utils/SmartLink";

const lessFatCta = "btn btn-ghost btn-sm md:btn-md w-auto";

type Item = {
  id: string;
  title: string;
  contentHtml: string;
};

export type FaqInlineListClientItem = Item;

type Props = {
  heading: string;
  highlightText?: string | readonly string[];
  description?: string;
  className?: string;
  seeMoreHref: string;
  items: Item[];
};

export default function FaqInlineListClient({ heading, highlightText, description, className, seeMoreHref, items }: Props) {
  const detailRefs = useRef<Array<HTMLDetailsElement | null>>([]);
  const [allOpen, setAllOpen] = useState(false);

  const safeItems = useMemo(() => items ?? [], [items]);

  useEffect(() => {
    detailRefs.current = detailRefs.current.slice(0, safeItems.length);
  }, [safeItems.length]);

  const syncAllOpenState = useCallback(() => {
    const nodes = detailRefs.current.filter(Boolean);
    if (nodes.length === 0) {
      setAllOpen(false);
      return;
    }
    setAllOpen(nodes.every((node) => node?.open));
  }, []);

  useEffect(() => {
    const nodes = detailRefs.current.filter(Boolean);
    nodes.forEach((node) => node?.addEventListener("toggle", syncAllOpenState));
    syncAllOpenState();
    return () => {
      nodes.forEach((node) => node?.removeEventListener("toggle", syncAllOpenState));
    };
  }, [safeItems, syncAllOpenState]);

  const handleToggleAll = () => {
    const next = !allOpen;
    detailRefs.current.forEach((node) => {
      if (!node) return;
      if (next) {
        node.setAttribute("open", "");
      } else {
        node.removeAttribute("open");
      }
    });
    setAllOpen(next);
  };

  const assignRef = useCallback((index: number) => (node: HTMLDetailsElement | null) => {
    detailRefs.current[index] = node;
  }, []);

  if (!safeItems.length) return null;

  return (
    <div className={className ?? "mb-8 mt-24 px-2"} data-toc-exclude>
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start justify-start gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-800 md:text-4xl">
            <HelpCircle
              className="mr-1 hidden sm:inline h-7 w-7 text-(--brand-blue) md:h-9 md:w-9"
              aria-hidden="true"
            />
            <span>{renderHighlight(heading, highlightText)}</span>
          </h2>
          <div className="text-right">
            <SmartLink
              href={seeMoreHref}
              className={lessFatCta}
              title="See All FAQs"
              data-icon-affordance="right"
              proseGuard
            >
              See All FAQs
              <ArrowRight className="icon-affordance h-4 w-4 inline ml-2" />
            </SmartLink>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleAll}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-(--brand-blue) bg-white px-4 py-2 text-sm font-semibold text-(--brand-blue) transition hover:bg-(--brand-blue)/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue) focus-visible:ring-offset-2 sm:w-auto"
        >
          {allOpen ? (
            <>
              Collapse all
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Expand all
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      {description ? <p className="mt-4 max-w-3xl text-lg text-slate-600">{description}</p> : null}

      <div className="mt-12 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {safeItems.map((faq, idx) => (
          <FaqItem
            key={faq.id}
            ref={assignRef(idx)}
            title={faq.title}
            contentHtml={faq.contentHtml}
          />
        ))}
      </div>
    </div>
  );
}

type FaqItemProps = {
  title: string;
  contentHtml: string;
};

const FaqItem = forwardRef<HTMLDetailsElement, FaqItemProps>(function FaqItem(
  { title, contentHtml },
  ref,
) {
  return (
    <Accordion
      ref={ref}
      summary={<h3 className="text-base md:text-xl font-normal text-slate-800">{title}</h3>}
      size="md"
      tone="soft"
      radius="xl"
      proseBody={false}
    >
      <div
        dangerouslySetInnerHTML={{ __html: contentHtml || "" }}
        className="faq-answer text-[1rem] leading-loose text-slate-700"
      />
    </Accordion>
  );
});

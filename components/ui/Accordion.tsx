import { forwardRef, type ReactNode, type DetailsHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type BaseDetailsProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "children" | "className" | "id" | "open">;

type AccordionSize = "sm" | "md" | "lg";
type AccordionTone = "soft" | "medium" | "strong";
type AccordionRadius = "lg" | "xl" | "2xl" | "3xl";

export type AccordionProps = BaseDetailsProps & {
  children: ReactNode;
  summary: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  /**
   * Keeps the disclosure open by default when uncontrolled.
   */
  defaultOpen?: boolean;
  /**
   * Sets the disclosure state explicitly (no event handlers are wired to keep this component server-compatible).
   */
  open?: boolean;
  size?: AccordionSize;
  tone?: AccordionTone;
  radius?: AccordionRadius;
  proseBody?: boolean;
  id?: string;
  className?: string;
  summaryClassName?: string;
  iconWrapperClassName?: string;
  metaClassName?: string;
  chevronClassName?: string;
  contentClassName?: string;
};

const DETAIL_BASE =
  "group/accordion not-prose w-full overflow-hidden border bg-white shadow-xs transition-colors duration-200 ease-out [&_summary::-webkit-details-marker]:hidden";

const SUMMARY_BASE =
  "flex cursor-pointer select-none items-center justify-between gap-4 text-left text-sm font-medium text-slate-900 transition-colors duration-200 ease-out hover:bg-blue-10";

const SUMMARY_SIZE: Record<AccordionSize, string> = {
  sm: "px-3.5 py-3 text-sm",
  md: "px-4 py-3 text-base",
  lg: "px-4 py-3 text-lg",
};

const BODY_PADDING: Record<AccordionSize, string> = {
  sm: "accordion-motion px-3.5 pb-3.5 pt-0 text-sm text-slate-700",
  md: "accordion-motion px-4 pb-4 pt-0 text-slate-700",
  lg: "accordion-motion px-4 pb-4 pt-0 text-slate-700"
};

const TONE_BORDER: Record<AccordionTone, string> = {
  soft: "border-blue-200",
  medium: "border-blue-300",
  strong: "border-blue-400",
};

const RADIUS_MAP: Record<AccordionRadius, string> = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
};

const ICON_WRAPPER_BASE = "inline-flex flex-none items-center justify-center text-(--brand-blue)";
const META_BASE = "inline-flex flex-none items-center gap-2 text-xs font-medium text-slate-600";
const CHEVRON_BASE =
  "h-5 w-5 flex-none transform transition-transform duration-200 ease-out group-open/accordion:rotate-180 group-open/accordion:scale-110";

export const Accordion = forwardRef<HTMLDetailsElement, AccordionProps>(function Accordion(
  {
    children,
    summary,
    icon,
    meta,
    defaultOpen,
    open,
    size = "md",
    tone = "soft",
    radius = "xl",
    proseBody = true,
    id,
    className,
    summaryClassName,
    iconWrapperClassName,
    metaClassName,
    chevronClassName,
    contentClassName,
    ...rest
  },
  ref,
) {
  const detailOpen = open ?? (defaultOpen ? true : undefined);

  return (
    <details
      id={id}
      open={detailOpen}
      ref={ref}
      {...rest}
      className={cn(
        DETAIL_BASE,
        RADIUS_MAP[radius],
        TONE_BORDER[tone],
        className,
      )}
    >
      <summary
        className={cn(
          SUMMARY_BASE,
          SUMMARY_SIZE[size],
          summaryClassName,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {icon ? (
            <span className={cn(ICON_WRAPPER_BASE, iconWrapperClassName)}>
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">{summary}</span>
        </span>
        <span className="flex items-center gap-3">
          {meta ? (
            <span className={cn(META_BASE, metaClassName)}>
              {meta}
            </span>
          ) : null}
          <ChevronDown
            className={cn(CHEVRON_BASE, chevronClassName)}
            aria-hidden="true"
          />
        </span>
      </summary>
      <div
        className={cn(
          BODY_PADDING[size],
          proseBody ? "prose prose-sm" : null,
          contentClassName,
        )}
      >
        {children}
      </div>
    </details>
  );
});

/*
Example usage:

<Accordion
  summary={<h3 className="m-0 text-lg font-semibold">Know Your Contractor</h3>}
  icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
  meta={<span className="text-xs uppercase tracking-wide text-slate-500">Required</span>}
  defaultOpen
  size="md"
  tone="soft"
  radius="xl"
>
  <p>
    Bring documents that show licensure, insurance, and workmanship guarantees before you sign.
  </p>
</Accordion>
*/

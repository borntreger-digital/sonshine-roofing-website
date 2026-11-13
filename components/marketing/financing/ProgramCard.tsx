import StaticImage from "@/components/media/StaticImage";

import { Accordion } from "@/components/ui/Accordion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Percent, Landmark, HelpCircle, ArrowRight } from "lucide-react";
import SmartLink from "@/components/utils/SmartLink";

type CTA = { href: string; label: string; title?: string; className?: string };

type ProgramCardProps = {
  title: string;
  subtitle?: string;
  eyelash?: string;
  chips?: string[];
  keyFigures: string[]; // 2–4 short highlights like "From 7.9% APR"
  bullets: string[];    // 5–7 benefits
  eligibility?: string[]; // 3 light bullets
  eligibilityLabel?: string; // override accordion label
  finePrint?: string;
  sampleMonthly?: string; // e.g., "$144/mo on $15k (15yr @ 7.9%)"
  cta: CTA;
  // Theme keys: "blue" (primary/YGrene), "cyan" (secondary/Service Finance)
  theme: "blue" | "cyan" | "orange";
  recommended?: boolean;
  // Optional logo URL placeholders (provide real URLs later)
  logoUrl?: string;
  id?: string;
};

export default function ProgramCard({
  id,
  title,
  subtitle,
  eyelash,
  chips = [],
  keyFigures,
  bullets,
  eligibility = [],
  eligibilityLabel,
  finePrint,
  sampleMonthly,
  cta,
  theme,
  recommended,
  logoUrl,
}: ProgramCardProps) {
  const isBluePrimary = theme === "blue";
  const isOrange = theme === "orange";
  const isCyan = theme === "cyan";
  const headerTint = isBluePrimary
    ? "bg-blue-50"
    : isOrange
      ? "bg-orange-50"
      : "bg-cyan-50";
  // Motif: YGrene (blue) uses Landmark (tax/house), Service Finance (cyan) uses Percent
  const motif = isBluePrimary ? (
    <Landmark className="h-4 w-4 text-(--brand-blue)" aria-hidden />
  ) : isOrange ? (
    <Landmark className="h-4 w-4 text-orange-500" aria-hidden />
  ) : (
    <Percent className="h-4 w-4 text-cyan-600" aria-hidden />
  );

  // Wrapper style per theme (blue/orange/cyan gradients)
  const wrapperClass = isBluePrimary
    ? "p-[2px] bg-linear-to-r from-(--brand-blue) to-(--brand-cyan)"
    : isOrange
      ? "p-[2px] bg-linear-to-r from-(--brand-orange) to-amber-400"
      : isCyan
        ? "p-[2px] bg-linear-to-r from-(--brand-cyan) to-sky-400"
        : "border border-slate-400";

  return (
    <div
      className={cn(
        "rounded-2xl h-fit",
        wrapperClass,
        isBluePrimary && "shadow-lg"
      )}
    >
      <section
        id={id}
        className={cn("rounded-2xl bg-white h-full flex flex-col")}
        aria-label={title}
      >
        {/* Distinct header bar with motif + optional badge */}
        <div className={cn("rounded-t-2xl px-4 py-3 flex items-center justify-between", headerTint)}>
          <div className="flex items-center gap-2">
            {motif}
            <h3 className="m-0 text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Optional logo placeholder — add real URL if available */}
            {logoUrl ? (
              <StaticImage
                src={logoUrl}
                alt="" decorative
                width={96}
                height={32}
                className="h-8 w-auto opacity-70"
              />
            ) : null}
            {recommended && (
              <span className="inline-flex items-center rounded-md bg-(--brand-orange) px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap shrink-0">
                Most popular
              </span>
            )}
          </div>
        </div>

        {/* Key figure ribbon with a soft one‑time pulse */}
        <div
          className={cn(
            "mx-4 mt-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900",
            isBluePrimary ? "bg-blue-50" : isOrange ? "bg-orange-50" : "bg-cyan-50",
            "animate-pulse",
          )}
          style={{ animationIterationCount: 1 }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {keyFigures.map((k, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-slate-900">
                <CheckCircle2
                  className={cn(
                    "h-4 w-4",
                    isOrange ? "text-(--brand-orange)" : isCyan ? "text-cyan-600" : "text-(--brand-blue)",
                  )}
                  aria-hidden
                />
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div
          className={cn(
            "flex-1 px-4 py-4",
            isBluePrimary ? "bg-blue-50/20" : isOrange ? "bg-orange-50/20" : "bg-cyan-50/20"
          )}
        >
          {subtitle ? (
            <p className="m-0 text-sm text-slate-700">{subtitle}</p>
          ) : null}

          {chips.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map((c, i) => (
                <span key={i} className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-0.5 text-xs text-slate-700">
                  {c}
                </span>
              ))}
            </div>
          ) : null}

          {sampleMonthly ? (
            <div className="mt-3 text-sm text-slate-700">
              Example: <span className="font-semibold">{sampleMonthly}</span>
            </div>
          ) : null}

          <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-slate-800">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>

          {eligibility.length ? (
            <Accordion
              className="mt-4 rounded-xl border border-slate-300 bg-white"
              summary={<span className="inline-flex items-center gap-2">{eligibilityLabel || "How eligibility works"}</span>}
              icon={
                <HelpCircle
                  className={cn(
                    "h-4 w-4",
                    isOrange ? "text-(--brand-orange)" : isCyan ? "text-cyan-600" : "text-(--brand-blue)",
                  )}
                  aria-hidden
                />
              }
              size="sm"
              tone="medium"
              radius="xl"
              proseBody={false}
              summaryClassName="px-3 py-2 text-sm font-medium text-slate-900"
              iconWrapperClassName="inline-flex items-center justify-center"
              chevronClassName="h-4 w-4 text-slate-500"
              contentClassName="accordion-motion px-4 pb-3 pt-0 text-sm text-slate-700"
            >
              <ul className="space-y-1">
                {eligibility.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </Accordion>
          ) : null}
        </div>

        {/* Footer CTA + compliance */}
        <div className="px-4 pt-0 pb-4 mt-auto">
          <div className="flex justify-end">
            <p className="text-slate-500 italic text-xs mb-2">{eyelash}</p>
          </div>
          <div className="flex justify-end">
            <SmartLink
              href={cta.href}
              className={cn(
                "btn btn-lg inline-flex items-center",
                isOrange ? "bg-(--brand-orange) hover:bg-(--brand-orange)/90" : undefined,
                cta.className,
              )}
              title={cta.title || cta.label}
              data-icon-affordance="right"
            >
              {cta.label}
              <ArrowRight className="icon-affordance ml-2 h-4 w-4" aria-hidden />
            </SmartLink>
          </div>
          {finePrint ? (
            <p className="mt-8 text-xs italic text-slate-500">{finePrint}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

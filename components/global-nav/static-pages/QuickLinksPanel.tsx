import { ChevronRight } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import SmartLink from "@/components/utils/SmartLink";
import { normalizePathname } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type QuickLinkItem = {
  href: string;
  label: string;
  description: string;
  aria: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type QuickLinksPalette = {
  activeBorderClass: string;
  hoverBorderClass: string;
  hoverBackgroundClass: string;
  focusRingClass: string;
  titleIconClassName: string;
  iconGradientFromClass: string;
  iconGradientToClass: string;
};

type QuickLinksPanelProps = {
  title: string;
  titleIcon: ComponentType<SVGProps<SVGSVGElement>>;
  links: QuickLinkItem[];
  palette: QuickLinksPalette;
  className?: string;
  activePath?: string;
};

function isActivePath(current: string, href: string) {
  const cur = normalizePathname(current);
  const base = normalizePathname(href);
  if (base === "/") return cur === "/";
  return cur === base || cur.startsWith(`${base}/`);
}

export default function QuickLinksPanel({
  title,
  titleIcon: TitleIcon,
  links,
  palette,
  className,
  activePath = "/",
}: QuickLinksPanelProps) {
  return (
    <div className={cn("rounded-xl border border-blue-200 bg-white p-4 shadow-xs", className)}>
      <h2 className="not-prose items-center mb-3 font-display text-center text-[1rem] leading-none font-bold uppercase tracking-wide text-slate-600">
        {title}
        <TitleIcon className={cn("ml-2 inline h-4 w-4", palette.titleIconClassName)} />
      </h2>

      <ul className="space-y-2">
        {links.map(({ href, label, description, aria, Icon }) => {
          const active = isActivePath(activePath, href);
          const commonClasses =
            "group flex items-center gap-3 rounded-lg border bg-white px-3 py-2 text-sm font-medium transition hover:shadow-xs focus:outline-hidden focus-visible:ring-2 motion-reduce:transition-none";
          const stateClasses = active
            ? cn(palette.activeBorderClass, "text-slate-900")
            : "border-blue-200 text-slate-800";

          return (
            <li key={href}>
              <SmartLink
                href={href}
                title={label}
                aria-label={aria}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
                data-icon-affordance="right"
                className={cn(
                  commonClasses,
                  palette.hoverBorderClass,
                  palette.hoverBackgroundClass,
                  palette.focusRingClass,
                  stateClasses
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-linear-to-br text-white shadow-xs",
                    palette.iconGradientFromClass,
                    palette.iconGradientToClass
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1 text-left">
                  <h3 className="not-prose font-normal font-display leading-none truncate text-[1rem]">{label}</h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{description}</p>
                </div>

                <ChevronRight className="icon-affordance h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </SmartLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import SmartLink from "@/components/utils/SmartLink";
import Section from "@/components/layout/Section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Route } from "next";
import {
  Home,
  PhoneCall,
  FolderOpen,
  Newspaper,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const quickLinks = [
  {
    href: "/" as Route,
    label: "Site Home",
    description: "Start fresh from the SonShine Roofing homepage.",
    icon: Home,
  },
  {
    href: "/contact-us" as Route,
    label: "Contact",
    description: "Reach out to schedule service or ask a question.",
    icon: PhoneCall,
  },
  {
    href: "/project" as Route,
    label: "Project Gallery",
    description: "Browse recent installs across the Gulf Coast.",
    icon: FolderOpen,
  },
  {
    href: "/blog" as Route,
    label: "Blog",
    description: "Read roofing insights, maintenance tips, and news.",
    icon: Newspaper,
  },
] satisfies ReadonlyArray<{
  href: Route;
  label: string;
  description: string;
  icon: LucideIcon;
}>;

export default function NotFound() {
  return (
    <Section>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 text-center">
        <div className="inline-flex items-center gap-3 rounded-md bg-white/80 px-4 py-2 text-sm font-semibold text-(--brand-blue) shadow-xs ring-1 ring-slate-200">
          <Sparkles className="h-4 w-4 text-(--brand-blue)" aria-hidden="true" />
          Page Not Found
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Sorry, we can’t find that page.
          </h1>
          <p className="mx-auto max-w-xl text-base text-slate-600 md:text-lg">
            The link might be outdated or the page may have moved. Try one of these destinations to get back on track.
          </p>
        </div>

        <div className="grid w-full gap-4 text-left sm:grid-cols-2">
          {quickLinks.map(({ href, label, description, icon: Icon }) => (
            <SmartLink
              key={href}
              href={href}
              className="group flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-(--brand-blue)/70 hover:shadow-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue) focus-visible:ring-offset-2"
              data-icon-affordance="right"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--brand-blue)/10 text-(--brand-blue)">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="not-prose font-display text-[1.5rem] font-bold leading-none group-hover:text-(--brand-blue)">
                  {label}
                </h2>
              </div>
              <p className="text-sm text-slate-600 group-hover:text-slate-700">
                {description}
              </p>
              <span
                className={cn(
                  buttonVariants({ variant: "link" }),
                  "self-start px-0 text-sm font-semibold text-(--brand-blue) hover:no-underline"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  Visit {label}
                  <ArrowRight className="icon-affordance h-3.5 w-3.5 text-(--brand-blue)" aria-hidden="true" />
                </span>
              </span>
            </SmartLink>
          ))}
        </div>
      </div>
    </Section>
  );
}

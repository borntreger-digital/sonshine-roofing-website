"use client";
import SmartLink from "@/components/utils/SmartLink";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Smartphone,
  UserSearch,
  HandCoins,
  Hammer,
  Wrench,
  Search,
  ShieldCheck,
  PlayCircle,
  Newspaper,
  BookOpen,
  HelpCircle,
  Eye,
  Home as HomeIcon,
  Image as ImageIcon,
  HardHat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/routes";
import { NAV_MAIN, ROUTES } from "@/lib/routes";
import { InstantQuoteCTA } from "./InstantQuoteCTA";

type Item = NavItem;

const NAV_ICONS: Record<string, LucideIcon> = {
  About: UserSearch,
  Financing: HandCoins,
  "Roofing Services": HardHat,
  "Roof Replacement": Hammer,
  "Roof Repair": Wrench,
  "Roof Inspection": Search,
  "Roof Maintenance": ShieldCheck,
  "Referral Program": HandCoins,
  "Our Work": Eye,
  "Project Gallery": ImageIcon,
  "Video Library": PlayCircle,
  Blog: Newspaper,
  "Roofing Glossary": BookOpen,
  FAQ: HelpCircle,
  Home: HomeIcon,
  Contact: Smartphone,
  "Contact Us": Smartphone,
};

const TARGET_CHILD_PARENTS = new Set(["Roofing Services", "Our Work"]);
const CONTACT_LABELS = new Set(["Contact", "Contact Us"]);
const CHILD_CHEVRON_CLASS = "icon-affordance h-4 w-4 text-slate-500";
const ENTRY_MOTION_CLASS =
  "transition-all duration-150 ease-out motion-reduce:transform-none motion-reduce:translate-none motion-reduce:rotate-none motion-reduce:scale-none motion-reduce:opacity-100 motion-reduce:transition-none";

function MenuToggleIcon({ open }: { open: boolean }) {
  const barClassName =
    "absolute h-[1.5px] w-full rounded-full bg-white transition-[transform,translate,rotate,scale,opacity] duration-160 ease-[cubic-bezier(0.32,0,0.67,1)] motion-reduce:transition-none";

  return (
    <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden="true">
      <span
        className={cn(
          barClassName,
          "origin-center",
          open ? "translate-y-0 rotate-45" : "-translate-y-1 rotate-0"
        )}
      />
      <span
        className={cn(
          barClassName,
          open ? "scale-x-[0.4] opacity-0" : "scale-x-100 opacity-100"
        )}
      />
      <span
        className={cn(
          barClassName,
          "origin-center",
          open ? "translate-y-0 -rotate-45" : "translate-y-1 rotate-0"
        )}
      />
    </span>
  );
}

function LabelWithIcon({ label, iconClassName }: { label: string; iconClassName?: string }) {
  const Icon = NAV_ICONS[label];
  return (
    <span className="inline-flex font-display text-xl font-medium items-center">
      {Icon && (
        <Icon
          className={cn("h-4 w-4 inline mr-2", iconClassName ?? "text-(--brand-blue)")}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}

/* ===== Animation tuning knobs (edit these values to adjust speeds/delays) ===== */
// Close-delay when the cursor leaves a menu (hover intent)
const HOVER_CLOSE_DELAY_MS = 120;
// Container fade+lift duration for dropdown/flyout panels
const PANEL_DURATION_MS = 150;
// Chevron/caret rotation duration
const CARET_DURATION_MS = 200;
// Stagger timings for list items
const ITEM_STAGGER_BASE_MS = 70; // first item delay
const ITEM_STAGGER_STEP_MS = 50; // per-item additional delay
const LEVEL_BONUS_MS = 20;       // extra delay per nested level (deeper = later)
// Mobile-only: top-level staggering and CTA offsets
const MOBILE_TOP_STAGGER_BASE_MS = 70;
const MOBILE_CTA1_DELAY_MS = 70;  // "60-sec Quote"

/* ===== Desktop (fixed) ===== */
function DesktopMenu({
  transparent,
  navigation,
}: {
  transparent: boolean;
  navigation: Item[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterFrame = useRef<number | null>(null);
  const [enteredPanel, setEnteredPanel] = useState(false);
  const menuRef = useRef<HTMLUListElement>(null);
  const keyboardInteraction = useRef(true);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (enterFrame.current) cancelAnimationFrame(enterFrame.current);
  }, []);

  const closeMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (enterFrame.current) cancelAnimationFrame(enterFrame.current);
    setEnteredPanel(false);
    setOpenIndex(null);
  };

  const holdOpen = (i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (enterFrame.current) cancelAnimationFrame(enterFrame.current);
    setOpenIndex(i);
    setEnteredPanel(false);
    // defer to next frame so transitions can see initial state
    enterFrame.current = requestAnimationFrame(() => setEnteredPanel(true));
  };
  const scheduleClose = (i: number) => {
    // A pointer click also focuses links; only keyboard use should retain the menu.
    if (keyboardInteraction.current && menuRef.current?.children[i]?.contains(document.activeElement)) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(closeMenu, HOVER_CLOSE_DELAY_MS);
  };

  return (
    <>
      <ul
        ref={menuRef}
        className="hidden lg:flex items-center gap-4"
        onPointerDownCapture={() => { keyboardInteraction.current = false; }}
        onKeyDownCapture={() => {
          keyboardInteraction.current = true;
          if (closeTimer.current) clearTimeout(closeTimer.current);
        }}
        onClick={(event) => {
          // Also dismiss same-page links, which do not change the pathname.
          if ((event.target as Element).closest("a[href]")) closeMenu();
        }}
      >
        {navigation.map((item, i) => (
          <li
            key={item.label}
            className="relative"
            onMouseEnter={() => holdOpen(i)}
            onMouseLeave={() => scheduleClose(i)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || openIndex !== i) return;
              event.preventDefault();
              event.stopPropagation();
              closeMenu();
              event.currentTarget.querySelector<HTMLElement>("button, a")?.focus();
            }}
          >
            {item.href ? (
              <SmartLink
                href={item.href}
                className={cn(
                  "relative flex items-center whitespace-nowrap px-2 py-2 transition-colors duration-200",
                  item.children && "pr-5",
                  transparent ? "text-white hover:text-white/80" : "text-slate-700 hover:text-(--brand-blue)",
                  CONTACT_LABELS.has(item.label) && "phone-affordance"
                )}
              >
                <LabelWithIcon
                  label={item.label}
                  iconClassName={cn(
                    transparent ? "text-(--brand-orange)" : "text-(--brand-blue)",
                    CONTACT_LABELS.has(item.label) && "phone-affordance-icon"
                  )}
                />
                {item.children && (
                  <>
                    {/* ANIM: Caret rotation speed — edit CARET_DURATION_MS (and/or Tailwind duration class) */}
                    <ChevronDown
                      className={cn(
                        "pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70 transition-transform duration-200",
                        openIndex === i ? "rotate-180" : "rotate-0",
                        transparent ? "text-white" : "text-slate-400"
                      )}
                      style={{ transitionDuration: `${CARET_DURATION_MS}ms` }}
                      aria-hidden="true"
                    />
                  </>
                )}
              </SmartLink>
            ) : (
              <button
                type="button"
                className={cn(
                  "relative flex items-center whitespace-nowrap px-2 py-2 transition-colors duration-200",
                  item.children && "pr-5",
                  transparent ? "text-white hover:text-white/80" : "text-slate-700 hover:text-(--brand-blue)"
                )}
                aria-haspopup={item.children ? "menu" : undefined}
                aria-expanded={item.children ? openIndex === i : undefined}
                onClick={item.children ? () => holdOpen(i) : undefined}
              >
                <LabelWithIcon
                  label={item.label}
                  iconClassName={transparent ? "text-(--brand-orange)" : "text-(--brand-blue)"}
                />
                {item.children && (
                  <>
                    {/* ANIM: Caret rotation speed — edit CARET_DURATION_MS (and/or Tailwind duration class) */}
                    <ChevronDown
                      className={cn(
                        "pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70 transition-transform duration-200",
                        openIndex === i ? "rotate-180" : "rotate-0",
                        transparent ? "text-white" : "text-slate-400"
                      )}
                      style={{ transitionDuration: `${CARET_DURATION_MS}ms` }}
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            )}

            {item.children && openIndex === i && (
              <>
                {/* ANIM: Panel fade+lift speed — edit PANEL_DURATION_MS (and/or Tailwind 'duration-150') */}
                <div
                  className={cn(
                    "absolute left-0 top-full mt-2 min-w-[300px] rounded-3xl border bg-white border-blue-200 shadow-lg origin-top",
                    ENTRY_MOTION_CLASS,
                    enteredPanel ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-[0.98]"
                  )}
                  style={{ transitionDuration: `${PANEL_DURATION_MS}ms` }}
                  onMouseEnter={() => holdOpen(i)}
                  onMouseLeave={() => scheduleClose(i)}
                >
                  <MenuLevel items={item.children} level={1} parentLabel={item.label} />
                </div>
              </>
            )}
          </li>
        ))}

        <li className="pl-2">
          <InstantQuoteCTA />
        </li>
      </ul>
    </>
  );
}

/* ===== Nested menu list (scoped hover) ===== */
function MenuLevel({ items, level, parentLabel }: { items: Item[]; level: number; parentLabel?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(id);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const holdOpen = (i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenIndex(i);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenIndex(null), 120);
  };

  return (
    <ul className={cn("py-2", level > 1 && "px-2")}>
      {items.map((child, i) => {
        const hasKids = !!child.children?.length;
        const showChevron = !hasKids && TARGET_CHILD_PARENTS.has(parentLabel ?? "");

        return (
          <li
            key={child.label}
            className={cn(
              "relative",
              ENTRY_MOTION_CLASS,
              entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
            style={{ transitionDelay: `${Math.min(300, ITEM_STAGGER_BASE_MS + i * ITEM_STAGGER_STEP_MS + (level - 1) * LEVEL_BONUS_MS)}ms` }}
            onMouseEnter={() => holdOpen(i)}
            onMouseLeave={scheduleClose}
          >
            {child.href ? (
              <SmartLink
                href={child.href}
                className="flex items-center justify-between gap-2 px-3 py-2 text-slate-700 hover:bg-[#0045d7]/5 hover:text-(--brand-blue)"
                data-icon-affordance={showChevron ? "right" : undefined}
              >
                <LabelWithIcon label={child.label} />
                {hasKids ? (
                  <>
                    {/* ANIM: Nested caret rotation — edit CARET_DURATION_MS */}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 opacity-70 transition-transform duration-200",
                        openIndex === i ? "rotate-90" : "-rotate-90"
                      )}
                      style={{ transitionDuration: `${CARET_DURATION_MS}ms` }}
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  showChevron ? (
                    <ChevronRight className={CHILD_CHEVRON_CLASS} aria-hidden="true" />
                  ) : null
                )}
              </SmartLink>
            ) : (
              <button
                type="button"
                className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 text-xl text-slate-700 hover:bg-slate-50 hover:text-brand-blue rounded-xl"
                aria-haspopup={hasKids ? "menu" : undefined}
                aria-expanded={openIndex === i || undefined}
                onClick={() => holdOpen(i)}
              >
                <LabelWithIcon label={child.label} />
                {hasKids && (
                  <>
                    {/* ANIM: Nested caret rotation — edit CARET_DURATION_MS */}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 opacity-70 transition-transform duration-200",
                        openIndex === i ? "rotate-90" : "-rotate-90"
                      )}
                      style={{ transitionDuration: `${CARET_DURATION_MS}ms` }}
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            )}

            {hasKids && openIndex === i && (
              <>
                {/* ANIM: Panel fade+lift speed — edit PANEL_DURATION_MS (and/or Tailwind 'duration-150') */}
                <div
                  // keep open while inside the flyout
                  onMouseEnter={() => holdOpen(i)}
                  onMouseLeave={scheduleClose}
                  className={cn(
                    "md:absolute md:left-full md:top-0",
                    "md:pl-2",
                    "min-w-[240px] rounded-3xl border bg-white shadow-lg origin-top-left",
                    ENTRY_MOTION_CLASS,
                    entered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-[0.98]"
                  )}
                  style={{ transitionDuration: `${PANEL_DURATION_MS}ms` }}
                >
                  {/* optional invisible bridge in case of super fast mouse moves */}
                  <div className="pointer-events-none absolute -left-2 top-0 h-full w-3" />
                  <div className="pointer-events-auto">
                    <MenuLevel
                      items={child.children!}
                      level={level + 1}
                      parentLabel={child.label}
                    />
                  </div>
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ===== Mobile ===== */
function MobileMenu({ navigation }: { navigation: Item[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [entered, setEntered] = useState<Record<string, boolean>>({});
  const [enteredTop, setEnteredTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const scrollYRef = useRef(0);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on click outside or ESC
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setEnteredTop(false);
      const id = requestAnimationFrame(() => setEnteredTop(true));
      return () => cancelAnimationFrame(id);
    }
    setEnteredTop(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const root = document.documentElement;
    const body = document.body;

    scrollYRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const prevBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    const prevRoot = {
      scrollBehavior: root.style.scrollBehavior,
      scrollLock: root.dataset.scrollLock,
      scrollLockOffset: root.style.getPropertyValue("--scroll-lock-offset"),
    };
    const restoreFocusTarget = buttonRef.current;

    const scrollbar = window.innerWidth - root.clientWidth;

    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    root.dataset.scrollLock = "true";
    root.style.setProperty("--scroll-lock-offset", `${scrollbar}px`);

    return () => {
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.overflow = prevBody.overflow;
      body.style.paddingRight = prevBody.paddingRight;

      if (prevRoot.scrollLock) {
        root.dataset.scrollLock = prevRoot.scrollLock;
      } else {
        delete root.dataset.scrollLock;
      }

      if (prevRoot.scrollLockOffset) {
        root.style.setProperty("--scroll-lock-offset", prevRoot.scrollLockOffset);
      } else {
        root.style.removeProperty("--scroll-lock-offset");
      }

      const y = scrollYRef.current || 0;
      root.style.scrollBehavior = "auto";
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0 });
        root.style.scrollBehavior = prevRoot.scrollBehavior;
        const focusTarget = restoreFocusTarget ?? previouslyFocused.current;
        if (focusTarget) {
          try {
            focusTarget.focus({ preventScroll: true });
          } catch {
            focusTarget.focus();
          }
        }
        previouslyFocused.current = null;
      });
    };
  }, [open]);

  const toggle = (key: string) =>
    setExpanded((s) => {
      const next = { ...s, [key]: !s[key] };
      if (!s[key] && !entered[key]) {
        requestAnimationFrame(() =>
          setEntered((e) => ({ ...e, [key]: true }))
        );
      }
      if (s[key]) {
        // collapsing: remove entered to allow re-animate next time
        setEntered((e) => {
          const { [key]: removedEntry, ...rest } = e;
          void removedEntry;
          return rest;
        });
      }
      return next;
    });

  const menuOverlay = open ? (
    <div className="fixed inset-0 z-60">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0"
        onClick={() => setOpen(false)}
      />

      {/* floating panel */}
      <div
        id="mobile-nav"
        ref={panelRef}
        role="menu"
        aria-label="Main"
        className="fixed left-2 right-2 z-61
                   rounded-3xl border border-blue-200 bg-white shadow-xl p-2
                   top-[calc(var(--header-h,56px)+8px)]
                   max-h-[calc(100vh-var(--header-h,56px)-24px)] overflow-auto overscroll-contain"
      >
        <ul className="space-y-1">
          <li
            className={cn(
              ENTRY_MOTION_CLASS,
              enteredTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
            // ANIM: Mobile Home item stagger — base
            style={{ transitionDelay: `${MOBILE_TOP_STAGGER_BASE_MS}ms` }}
          >
            <SmartLink
              href={ROUTES.home}
              className="flex w-full px-3 py-2 rounded-2xl text-slate-800 hover:bg-slate-200"
              onClick={() => setOpen(false)}
            >
              <LabelWithIcon label="Home" />
            </SmartLink>
          </li>
          <hr className="my-1 border-blue-100" />
          {navigation.map((item, i) => {
            const k = `lv1-${i}`;
            const hasChildren = !!item.children?.length;
            return (
              <li
                key={k}
                className={cn(
                  ENTRY_MOTION_CLASS,
                  enteredTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}
                // ANIM: Mobile top-level stagger — base + per-item step
                style={{ transitionDelay: `${Math.min(300, MOBILE_TOP_STAGGER_BASE_MS + i * ITEM_STAGGER_STEP_MS)}ms` }}
              >
                {!hasChildren && item.href ? (
                  <SmartLink
                    href={item.href}
                    className="flex w-full items-center justify-between px-3 py-2 rounded-2xl text-slate-800 hover:bg-slate-200"
                    onClick={() => setOpen(false)}
                  >
                    <LabelWithIcon label={item.label} />
                  </SmartLink>
                ) : (
                  <div className="flex items-center justify-between">
                    {item.href ? (
                      <SmartLink
                        href={item.href}
                        className="block flex-1 min-w-0 text-left px-3 py-2 rounded-2xl text-slate-800 hover:bg-slate-200"
                        onClick={() => setOpen(false)}
                      >
                        <LabelWithIcon label={item.label} />
                      </SmartLink>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggle(k)}
                        aria-expanded={!!expanded[k]}
                        aria-controls={`section-${k}`}
                        className="px-3 py-2 rounded-2xl text-slate-800 hover:bg-slate-200 text-left flex-1"
                      >
                        <LabelWithIcon label={item.label} />
                      </button>
                    )}
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggle(k)}
                        aria-expanded={!!expanded[k]}
                        aria-controls={`section-${k}`}
                        className="p-2"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            expanded[k] ? "rotate-180" : "rotate-0"
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                )}

                {hasChildren && expanded[k] && (
                  <ul id={`section-${k}`} className="ml-2 border-l pl-3 py-1 group" data-open={!!expanded[k]}>
                    {item.children!.map((c, j) => {
                      const ck = `lv2-${i}-${j}`;
                      const childHasKids = !!c.children?.length;
                      const showChevron = !childHasKids && TARGET_CHILD_PARENTS.has(item.label);
                      return (
                        <li
                          key={ck}
                          className={cn(
                            "py-1",
                            ENTRY_MOTION_CLASS,
                            entered[k] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                          )}
                          // ANIM: Mobile child stagger — base + per-item step
                          style={{ transitionDelay: `${Math.min(300, ITEM_STAGGER_BASE_MS + j * ITEM_STAGGER_STEP_MS)}ms` }}
                        >
                          {c.href ? (
                            <SmartLink
                              href={c.href}
                              className="flex w-full items-center justify-between px-3 py-2 rounded-2xl text-slate-700 hover:bg-slate-200"
                              data-icon-affordance={showChevron ? "right" : undefined}
                              onClick={() => setOpen(false)}
                            >
                              <LabelWithIcon label={c.label} />
                              {showChevron ? (
                                <ChevronRight className={CHILD_CHEVRON_CLASS} aria-hidden="true" />
                              ) : null}
                            </SmartLink>
                          ) : (
                            <span className="block px-3 py-2 text-slate-700">
                              <LabelWithIcon label={c.label} />
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
          <li
            className={cn(
              ENTRY_MOTION_CLASS,
              enteredTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
            // ANIM: Mobile CTA1 stagger — base + NAV length step
            style={{ transitionDelay: `${Math.min(380, MOBILE_CTA1_DELAY_MS + navigation.length * ITEM_STAGGER_STEP_MS)}ms` }}
          >
            <InstantQuoteCTA
              size="sm"
              buttonClassName="w-full mt-4"
              linkClassName="w-full justify-center gap-x-2"
              iconClassName="w-4 h-4"
              onClick={() => setOpen(false)}
            />
          </li>
        </ul>
      </div>
    </div>
  ) : null;

  return (
    <div className="lg:hidden ml-auto">
      <button
        type="button"
        ref={buttonRef}
        className="flex items-center gap-2 rounded-xl border px-4 py-2 text-white bg-(--brand-blue)"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-haspopup="menu"
        aria-label={open ? "Close menu" : "Open menu"}
        data-open={open}
      >

        <MenuToggleIcon open={open} />
      </button>
      {mounted && menuOverlay ? createPortal(menuOverlay, document.body) : null}
    </div>
  );
}

type NavMenuProps = {
  transparent: boolean;
  navigation?: NavItem[];
};

export function NavMenu({ transparent, navigation }: NavMenuProps) {
  const pathname = usePathname();
  const resolvedNavigation =
    navigation?.length ? (navigation as Item[]) : (NAV_MAIN as Item[]);

  return (
    <nav className="ml-auto flex items-center gap-3">
      <DesktopMenu key={pathname} transparent={transparent} navigation={resolvedNavigation} />
      <MobileMenu navigation={resolvedNavigation} />
    </nav>
  );
}

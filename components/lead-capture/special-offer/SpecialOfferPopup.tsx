"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

export type SpecialOfferPopupOffer = {
  slug: string;
  title: string;
  href: string;
  eyebrow: string;
  introduction: string;
  discount: string | null;
  expirationLabel: string | null;
  legalDisclaimer: string | null;
  featuredImage: {
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
};

type Props = {
  offer: SpecialOfferPopupOffer;
};

const STORAGE_KEY = "ss_featured_offer_popup_hidden";
const SUPPRESSION_SECONDS = 60 * 60 * 24 * 7;
const EXACT_PATHNAME_BLACKLIST = new Set([
  "/contact-us",
  "/homeowner-referral-program/terms-and-conditions",
  "/instant-quote",
  "/privacy-policy",
  "/reviews",
  "/roof-maintenance/roof-care-club-terms-and-conditions",
  "/sms-terms-and-conditions",
  "/tell-us-why",
  "/thank-you",
]);
const PATHNAME_PREFIX_BLACKLIST = ["/special-offers"];
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type SuppressionPayload = {
  slug?: string;
  expiresAt?: number;
};

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return match.split("=").slice(1).join("=");
}

function clearSuppression() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage restrictions
  }
  document.cookie = `${STORAGE_KEY}=; Max-Age=0; path=/; SameSite=Lax`;
}

function readSuppressionPayload(raw: string | null): SuppressionPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SuppressionPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function isSuppressed(): boolean {
  if (typeof window === "undefined") return true;

  let payload: SuppressionPayload | null;
  try {
    payload = readSuppressionPayload(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    payload = null;
  }

  payload = payload ?? readSuppressionPayload(getCookie(STORAGE_KEY));
  const expiresAt = typeof payload?.expiresAt === "number" ? payload.expiresAt : 0;
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    clearSuppression();
    return false;
  }
  return true;
}

function writeSuppression(slug: string) {
  if (typeof window === "undefined") return;
  const payload: SuppressionPayload = {
    slug,
    expiresAt: Date.now() + SUPPRESSION_SECONDS * 1000,
  };
  const encoded = encodeURIComponent(JSON.stringify(payload));

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage restrictions
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${STORAGE_KEY}=${encoded}; Max-Age=${SUPPRESSION_SECONDS}; path=/; SameSite=Lax${secure}`;
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}|\r\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isPathnameBlacklisted(pathname: string): boolean {
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (
    EXACT_PATHNAME_BLACKLIST.has(normalizedPathname) ||
    PATHNAME_PREFIX_BLACKLIST.some(
      (prefix) => normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`),
    )
  );
}

export default function SpecialOfferPopup({ offer }: Props) {
  const pathname = usePathname();
  const isBlacklisted = isPathnameBlacklisted(pathname);
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const scrollYRef = useRef(0);
  const titleId = useId();
  const descriptionId = useId();
  const paragraphs = useMemo(() => splitParagraphs(offer.introduction), [offer.introduction]);

  useEffect(() => {
    if (isBlacklisted || isSuppressed()) return undefined;

    let timer: number | undefined;
    const show = () => {
      timer = window.setTimeout(() => {
        if (!isSuppressed()) setIsOpen(true);
      }, 300);
    };

    if (document.readyState === "complete") {
      window.requestAnimationFrame(show);
    } else {
      window.addEventListener("load", show, { once: true });
    }

    return () => {
      window.removeEventListener("load", show);
      if (timer) window.clearTimeout(timer);
    };
  }, [isBlacklisted, offer.slug]);

  const [previousBlacklist, setPreviousBlacklist] = useState(isBlacklisted);
  if (previousBlacklist !== isBlacklisted) {
    setPreviousBlacklist(isBlacklisted);
    if (isBlacklisted) setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen || isBlacklisted) return undefined;

    const dismissFromEffect = () => {
      writeSuppression(offer.slug);
      setIsOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissFromEffect();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      }
    };

    const body = document.body;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    scrollYRef.current = window.scrollY || window.pageYOffset || 0;
    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);

      const html = document.documentElement;
      const previousBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollYRef.current || 0, left: 0 });
        html.style.scrollBehavior = previousBehavior;
        try {
          previouslyFocused.current?.focus?.({ preventScroll: true });
        } catch {
          previouslyFocused.current?.focus?.();
        }
        previouslyFocused.current = null;
      });
    };
  }, [isBlacklisted, isOpen, offer.slug]);

  const dismiss = () => {
    writeSuppression(offer.slug);
    setIsOpen(false);
  };

  if (!isOpen || isBlacklisted) return null;

  return (
    <div
      className="fixed inset-0 z-1000 cursor-pointer bg-slate-950/60 px-2 sm:px-8 backdrop-blur-xs py-8"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="flex min-h-full cursor-auto items-end justify-center sm:items-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="relative flex max-h-[calc(100svh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-hidden sm:rounded-3xl"
          tabIndex={-1}
        >
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close special offer"
            className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/80 bg-white/95 text-slate-800 shadow-lg transition hover:bg-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue)"
            onClick={dismiss}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {offer.featuredImage?.url ? (
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-slate-100">
              <Image
                src={offer.featuredImage.url}
                alt={offer.featuredImage.altText || offer.title}
                fill
                sizes="(max-width: 640px) 100vw, 672px"
                className="object-cover"
                priority={false}
              />
            </div>
          ) : null}

          <div className="overflow-y-auto px-5 pb-5 pt-5 sm:px-7 sm:pb-7">
            <div className="space-y-3 pr-10">
              <p className="text-xs font-semibold uppercase text-(--brand-blue)">{offer.eyebrow}</p>
              <h2 id={titleId} className="text-2xl font-bold text-slate-950 sm:text-3xl">
                {offer.title}
              </h2>
              {offer.discount ? (
                <p className="text-lg font-semibold text-slate-800 sm:text-xl">{offer.discount}</p>
              ) : null}
              {offer.expirationLabel ? (
                <p className="text-sm font-medium text-slate-600">Offer valid through {offer.expirationLabel}</p>
              ) : null}
            </div>

            {paragraphs.length ? (
              <div id={descriptionId} className="mt-5 space-y-3 text-sm leading-6 text-slate-700 sm:text-base">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p id={descriptionId} className="sr-only">
                Special offer from SonShine Roofing.
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={offer.href} className="btn btn-brand-orange btn-md justify-center" onClick={dismiss}>
                View Offer
              </a>
              <button
                type="button"
                className="btn btn-secondary btn-md justify-center"
                onClick={dismiss}
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

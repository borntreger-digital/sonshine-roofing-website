"use client";

import * as React from "react";
import { useHydrated } from "@/lib/ui/use-hydrated";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import ModalCloseButton from "@/components/ui/ModalCloseButton";

type BlogPostInlineImageLightboxProps = {
  rootSelector?: string;
  dialogLabel?: string;
};

type InlineImageMeta = {
  index: number;
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
};

const IMAGE_EXT_RE = /\.(avif|bmp|gif|ico|jpe?g|jfif|png|svg|tiff?|webp)(?:$|[?#])/i;

const isPrimaryActivation = (event: MouseEvent) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey;

const readPositiveNumber = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const toAbsoluteUrl = (value: string): string => {
  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return value;
  }
};

const isImageHref = (href: string): boolean => {
  const normalized = href.trim();
  if (!normalized || normalized.startsWith("#")) return false;
  if (/^javascript:/i.test(normalized)) return false;

  try {
    const url = new URL(normalized, window.location.href);
    const composed = `${url.pathname}${url.search}${url.hash}`;
    if (IMAGE_EXT_RE.test(composed)) return true;
    return url.pathname.includes("/wp-content/uploads/") && !url.pathname.endsWith("/");
  } catch {
    return IMAGE_EXT_RE.test(normalized);
  }
};

export default function BlogPostInlineImageLightbox({
  rootSelector = "#article-root",
  dialogLabel = "Blog image viewer",
}: BlogPostInlineImageLightboxProps) {
  const pathname = usePathname();
  return <InlineImageLightbox key={`${pathname}:${rootSelector}`} rootSelector={rootSelector} dialogLabel={dialogLabel} />;
}

function InlineImageLightbox({ rootSelector, dialogLabel }: Required<BlogPostInlineImageLightboxProps>) {
  const mounted = useHydrated();
  const [images, setImages] = React.useState<InlineImageMeta[]>([]);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const scrollYRef = React.useRef(0);
  const wasOpenRef = React.useRef(false);

  const totalImages = images.length;
  const isOpen = activeIndex !== null;
  const currentImage = typeof activeIndex === "number" ? images[activeIndex] ?? null : null;


  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.querySelector(rootSelector);
    if (!(root instanceof HTMLElement)) {
      return;
    }

    const cleanupFns: Array<() => void> = [];
    const discovered: InlineImageMeta[] = [];
    const imgNodes = Array.from(root.querySelectorAll("img"));

    for (const node of imgNodes) {
      if (!(node instanceof HTMLImageElement)) continue;

      const fallbackSrc = (node.currentSrc || node.getAttribute("src") || "").trim();
      if (!fallbackSrc) continue;

      const anchorCandidate = node.closest("a[href]");
      const linkedAnchor =
        anchorCandidate instanceof HTMLAnchorElement && root.contains(anchorCandidate)
          ? anchorCandidate
          : null;
      const anchorHref = linkedAnchor?.getAttribute("href")?.trim() || "";
      const linkedImageSrc = anchorHref && isImageHref(anchorHref) ? toAbsoluteUrl(anchorHref) : "";
      const src = linkedImageSrc || toAbsoluteUrl(fallbackSrc);
      if (!src) continue;

      const width = readPositiveNumber(node.getAttribute("width")) ?? (node.naturalWidth > 0 ? node.naturalWidth : null);
      const height = readPositiveNumber(node.getAttribute("height")) ?? (node.naturalHeight > 0 ? node.naturalHeight : null);
      const itemIndex = discovered.length;
      const fallbackAlt = `Blog image ${itemIndex + 1}`;
      const alt = (node.getAttribute("alt") || "").trim() || fallbackAlt;

      let trigger: HTMLElement;
      let wrapper: HTMLSpanElement | null = null;
      const isLinkedImage = Boolean(linkedAnchor);

      if (linkedAnchor) {
        trigger = linkedAnchor;
      } else {
        const parent = node.parentElement;
        if (!parent) continue;

        wrapper = document.createElement("span");
        wrapper.className = "blog-inline-lightbox-wrap";
        const computedDisplay = window.getComputedStyle(node).display;
        wrapper.style.display = computedDisplay === "block" ? "block" : "inline-block";
        parent.insertBefore(wrapper, node);
        wrapper.appendChild(node);
        trigger = wrapper;
      }

      const previousAriaLabel = trigger.getAttribute("aria-label");

      trigger.classList.add("blog-inline-lightbox-trigger");
      trigger.setAttribute("data-blog-inline-lightbox-trigger", "");
      trigger.setAttribute("aria-label", previousAriaLabel || `Open image ${itemIndex + 1}`);
      node.classList.add("blog-inline-lightbox-image");
      node.setAttribute("data-blog-inline-lightbox-image", "");

      if (!isLinkedImage) {
        trigger.setAttribute("role", "button");
        trigger.setAttribute("tabindex", "0");
      }

      const overlay = document.createElement("span");
      overlay.className = "blog-inline-lightbox-overlay";
      overlay.setAttribute("aria-hidden", "true");

      const icon = document.createElement("span");
      icon.className = "blog-inline-lightbox-icon";
      overlay.appendChild(icon);
      trigger.appendChild(overlay);

      const openModal = () => {
        setImages(discovered);
        setActiveIndex(itemIndex);
      };

      const onClick = (event: MouseEvent) => {
        if (!isPrimaryActivation(event)) return;
        event.preventDefault();
        openModal();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openModal();
      };

      trigger.addEventListener("click", onClick);
      if (!isLinkedImage) {
        trigger.addEventListener("keydown", onKeyDown);
      }

      cleanupFns.push(() => {
        trigger.removeEventListener("click", onClick);
        if (!isLinkedImage) {
          trigger.removeEventListener("keydown", onKeyDown);
        }

        overlay.remove();
        trigger.classList.remove("blog-inline-lightbox-trigger");
        trigger.removeAttribute("data-blog-inline-lightbox-trigger");

        if (previousAriaLabel) {
          trigger.setAttribute("aria-label", previousAriaLabel);
        } else {
          trigger.removeAttribute("aria-label");
        }

        if (!isLinkedImage) {
          trigger.removeAttribute("role");
          trigger.removeAttribute("tabindex");
        }

        node.classList.remove("blog-inline-lightbox-image");
        node.removeAttribute("data-blog-inline-lightbox-image");

        if (wrapper?.parentNode) {
          wrapper.parentNode.insertBefore(node, wrapper);
          wrapper.remove();
        }
      });

      discovered.push({ index: itemIndex, src, alt, width, height });
    }

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [rootSelector]);

  const closeModal = React.useCallback(() => {
    setActiveIndex(null);
  }, []);

  const goPrev = React.useCallback(() => {
    if (totalImages < 2) return;
    setActiveIndex((idx) => {
      if (idx === null) return idx;
      return (idx - 1 + totalImages) % totalImages;
    });
  }, [totalImages]);

  const goNext = React.useCallback(() => {
    if (totalImages < 2) return;
    setActiveIndex((idx) => {
      if (idx === null) return idx;
      return (idx + 1) % totalImages;
    });
  }, [totalImages]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const activeElement = document.activeElement as HTMLElement | null;
        if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    };

    const body = document.body;

    if (isOpen) {
      wasOpenRef.current = true;
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;
      body.style.position = "fixed";
      body.style.top = `-${scrollYRef.current}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";

      window.addEventListener("keydown", onKey);
      setTimeout(() => closeBtnRef.current?.focus(), 0);
    } else {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";

      window.removeEventListener("keydown", onKey);

      if (wasOpenRef.current) {
        const y = scrollYRef.current || 0;
        const html = document.documentElement;
        const previousBehavior = html.style.scrollBehavior;
        html.style.scrollBehavior = "auto";
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, left: 0 });
          html.style.scrollBehavior = previousBehavior;
          const el = previouslyFocused.current;
          if (el) {
            try {
              el.focus({ preventScroll: true });
            } catch {
              el.focus();
            }
          }
          previouslyFocused.current = null;
        });
        wasOpenRef.current = false;
      }
    }

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeModal, goNext, goPrev]);

  const modal =
    mounted && currentImage
      ? createPortal(
          <AnimatePresence>
            {isOpen ? (
              <motion.div
                key="blog-inline-image-lightbox"
                className="fixed inset-0 z-1000"
                role="dialog"
                aria-modal="true"
                aria-label={dialogLabel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="absolute inset-0 bg-black/75 backdrop-blur-[1px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />

                <ModalCloseButton
                  ref={closeBtnRef}
                  ariaLabel="Close"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeModal();
                  }}
                />

                <div
                  className="absolute inset-0 flex cursor-pointer items-center justify-center p-4"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      event.preventDefault();
                      event.stopPropagation();
                      closeModal();
                    }
                  }}
                >
                  <motion.div
                    ref={modalRef}
                    className="relative flex w-full max-w-296 cursor-auto items-center justify-center md:px-12 lg:px-16"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: { type: "spring", stiffness: 260, damping: 24 },
                    }}
                    exit={{ opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.15 } }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="relative flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-xl">
                      <LightboxImage image={currentImage} />

                      {totalImages > 1 ? (
                        <>
                          <NavButton
                            ariaLabel="Previous image"
                            onClick={goPrev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 md:hidden"
                          >
                            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                          </NavButton>
                          <NavButton
                            ariaLabel="Next image"
                            onClick={goNext}
                            className="absolute right-3 top-1/2 -translate-y-1/2 md:hidden"
                          >
                            <ChevronRight className="h-6 w-6" aria-hidden="true" />
                          </NavButton>
                        </>
                      ) : null}
                    </div>

                    {totalImages > 1 ? (
                      <>
                        <NavButton
                          ariaLabel="Previous image"
                          onClick={goPrev}
                          className="absolute left-[max(0.5rem,env(safe-area-inset-left))] top-1/2 hidden -translate-y-1/2 md:inline-flex"
                        >
                          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                        </NavButton>
                        <NavButton
                          ariaLabel="Next image"
                          onClick={goNext}
                          className="absolute right-[max(0.5rem,env(safe-area-inset-right))] top-1/2 hidden -translate-y-1/2 md:inline-flex"
                        >
                          <ChevronRight className="h-6 w-6" aria-hidden="true" />
                        </NavButton>
                      </>
                    ) : null}
                  </motion.div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )
      : null;

  return <>{modal}</>;
}

function LightboxImage({ image }: { image: InlineImageMeta }) {
  const style: React.CSSProperties = {
    maxHeight: "85vh",
    maxWidth: "100%",
  };

  return (
    <div className="relative flex w-full items-center justify-center" style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic CMS URLs and intrinsic dimensions are resolved at runtime */}
      <img
        src={image.src}
        alt={image.alt}
        loading="eager"
        draggable={false}
        className="block max-h-[85vh] max-w-full select-none object-contain"
      />
    </div>
  );
}

type NavButtonProps = {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
};

function NavButton({ ariaLabel, onClick, children, className }: NavButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center justify-center rounded-xl border border-blue-100 bg-white/40 p-1 text-blue-200 shadow-lg backdrop-blur-xs transition-colors hover:bg-white/80 hover:text-blue-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue) focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:p-2 md:p-3 lg:p-4 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

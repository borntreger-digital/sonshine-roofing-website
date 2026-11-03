"use client";

import * as React from "react";
import { useHydrated } from "@/lib/ui/use-hydrated";
import Image, { type ImageProps } from "next/image";
import { DirectusImage } from "@/components/media/DirectusImage";
import type { PublicImage } from "@/lib/content/public-image";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import Skeleton from "@/components/ui/Skeleton";
import type { ProjectImage } from "@/lib/content/project-types";
import { PROJECT_GALLERY_DEFAULT_HEIGHT, PROJECT_GALLERY_DEFAULT_WIDTH } from "./galleryConfig";

type GalleryImage = ProjectImage & { staticMedia?: PublicImage };

type ProjectGalleryProps = {
  images: GalleryImage[];
  projectTitle: string;
};

const imageClassBase =
  "select-none object-cover object-center hover:scale-[1.06] transition-all duration-500 ease-out";

const containerBase = "relative overflow-hidden rounded-xl shadow-xl border border-blue-200 bg-slate-100";

export default function ProjectGallery({ images, projectTitle }: ProjectGalleryProps) {
  const mounted = useHydrated();
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const scrollYRef = React.useRef(0);

  const totalImages = images.length;
  const hasImages = totalImages > 0;
  const isOpen = activeIndex !== null;
  const currentImage = typeof activeIndex === "number" ? images[activeIndex] : null;


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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const isShift = e.shiftKey;
        const el = document.activeElement as HTMLElement | null;
        if (!isShift && el === last) {
          e.preventDefault();
          first.focus();
        } else if (isShift && el === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    const body = document.body;

    if (isOpen) {
      // Safari does not focus buttons on pointer click. Preserve the actual opener.
      previouslyFocused.current ??= document.activeElement as HTMLElement | null;
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

      const y = scrollYRef.current || 0;
      const html = document.documentElement;
      const prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0 });
        html.style.scrollBehavior = prevBehavior;
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

  const modalComponent =
    mounted && currentImage
      ? createPortal(
          <AnimatePresence>
            {isOpen ? (
              <motion.div
                key="project-gallery-lightbox"
                className="fixed inset-0 z-1000"
                role="dialog"
                aria-modal="true"
                aria-label="Project photo viewer"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    closeModal();
                  }}
                />

                <div
                  className="absolute inset-0 flex cursor-pointer items-center justify-center p-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      e.preventDefault();
                      e.stopPropagation();
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-xl">
                      <LightboxImage image={currentImage} projectTitle={projectTitle} />

                      {totalImages > 1 ? (
                        <>
                          <NavButton
                            ariaLabel="Previous photo"
                            onClick={goPrev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 md:hidden"
                          >
                            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                          </NavButton>
                          <NavButton
                            ariaLabel="Next photo"
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
                          ariaLabel="Previous photo"
                          onClick={goPrev}
                          className="absolute left-[max(0.5rem,env(safe-area-inset-left))] top-1/2 hidden -translate-y-1/2 md:inline-flex"
                        >
                          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                        </NavButton>
                        <NavButton
                          ariaLabel="Next photo"
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

  if (!hasImages) return null;

  return (
    <section aria-label="Project Photos" className="p-4 sm:p-6 bg-white rounded-3xl shadow-md border border-blue-200">
      <h2 className="text-xl text-center md:text-left md:text-3xl">Photo Gallery</h2>
      <p className="text-xs flex items-center gap-2 justify-center md:justify-start md:text-sm text-slate-500" aria-live="off">
        <span>Tap to expand an image</span>
        <Expand className="h-4 w-4 text-(--brand-blue)" aria-hidden="true" />
      </p>
      <div className="grid grid-cols-2 mt-4 gap-4 md:gap-6">
        {images.map((image, index) => (
          <GalleryImage
            key={`${image.url}-${index}`}
            image={image}
            projectTitle={projectTitle}
            onOpen={(event) => {
              previouslyFocused.current = event.currentTarget;
              setActiveIndex(index);
            }}
          />
        ))}
      </div>
      {modalComponent}
    </section>
  );
}

type GalleryImageProps = {
  image: GalleryImage;
  projectTitle: string;
  onOpen: React.MouseEventHandler<HTMLButtonElement>;
};

function GalleryImage({ image, projectTitle, onOpen }: GalleryImageProps) {
  const [loadedUrl, setLoadedUrl] = React.useState<string | null>(null);
  const loaded = loadedUrl === image.url;
  const handleLoad = React.useCallback(() => setLoadedUrl(image.url), [image.url]);
  const imageRef = React.useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoadedUrl(image.url);
  }, [image.url]);
  const alt = image.altText || projectTitle;


  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${containerBase} aspect-4/3 shadow-md group block w-full cursor-zoom-in focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--brand-blue)`}
      aria-label={`Open photo: ${alt}`}
    >
      {!loaded ? <Skeleton className="pointer-events-none absolute inset-0 h-full w-full" /> : null}
      <GalleryPhoto
        ref={imageRef}
        image={image}
        projectTitle={projectTitle}
        crop
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={`${imageClassBase} ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={handleLoad}
        loading="lazy"
      />
      <span
        className="pointer-events-none absolute inset-0 grid place-items-center bg-linear-to-t from-black/50 via-black/20 to-transparent opacity-0 transition duration-200 ease-out group-active:opacity-100 group-focus-visible:opacity-100 group-hover:opacity-100"
        aria-hidden="true"
      >
        <span className="flex items-center justify-center rounded-full bg-white/90 p-3 text-slate-900 shadow-xs transition group-active:scale-105 group-hover:scale-105">
          <Expand className="h-5 w-5" />
        </span>
      </span>
    </button>
  );
}

function LightboxImage({ image, projectTitle }: { image: GalleryImage; projectTitle: string }) {
  const width = image.width ?? PROJECT_GALLERY_DEFAULT_WIDTH;
  const height = image.height ?? PROJECT_GALLERY_DEFAULT_HEIGHT;
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${width} / ${height}`,
    maxHeight: "85vh",
    maxWidth: "95vw",
  };

  return (
    <div className="relative w-full max-w-5xl" style={aspectStyle}>
      <GalleryPhoto
        image={image}
        projectTitle={projectTitle}
        fill
        sizes="100vw"
        priority={false}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function GalleryPhoto({ image, projectTitle, crop, ...props }: Omit<ImageProps, 'src' | 'alt'> & { image: GalleryImage; projectTitle: string; crop?: boolean; ref?: React.Ref<HTMLImageElement> }) {
  if (image.staticMedia) return <DirectusImage {...props} media={image.staticMedia} crop={crop} />;
  return <Image {...props} src={image.url} alt={image.altText || projectTitle} />;
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center justify-center rounded-full bg-white/40 hover:bg-white/80 p-1 backdrop-blur-xs sm:p-2 md:p-3 lg:p-4 text-blue-200 border border-blue-100 hover:text-blue-500 shadow-lg transition-colors hover:bg-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue) focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

"use client";

import * as React from "react";
import { useHydrated } from "@/lib/ui/use-hydrated";
import Image, { type ImageProps } from "next/image";
import { DirectusImage } from "@/components/media/DirectusImage";
import type { PublicImage } from "@/lib/content/public-image";
import { motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import type { ProjectImage } from "@/lib/content/project-types";
import { useGalleryModal } from "./useGalleryModal";
import { useGalleryGestures } from "./useGalleryGestures";
import styles from "./ProjectGallery.module.css";

type GalleryImage = ProjectImage & { staticMedia?: PublicImage };

type ProjectGalleryProps = {
  images: GalleryImage[];
  projectTitle: string;
  appearance?: "card" | "flat";
};

const imageClassBase =
  "select-none object-cover object-center motion-safe:group-hover:scale-[1.06] motion-safe:transition duration-500 ease-out";

const containerBase = "relative overflow-hidden rounded-xl shadow-xl border border-blue-200 bg-slate-100";

export default function ProjectGallery({ images, projectTitle, appearance = "card" }: ProjectGalleryProps) {
  const mounted = useHydrated();
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  const totalImages = images.length;
  const hasImages = totalImages > 0;
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

  const modalComponent = mounted && currentImage && activeIndex !== null
    ? createPortal(
        <ProjectImageViewer
          image={currentImage}
          projectTitle={projectTitle}
          activeIndex={activeIndex}
          totalImages={totalImages}
          opener={previouslyFocused}
          onClose={closeModal}
          onPrevious={goPrev}
          onNext={goNext}
        />,
        document.body,
      )
    : null;

  if (!hasImages) return null;

  return (
    <section aria-label="Project Photos" className={appearance === "card" ? "p-4 sm:p-6 bg-white rounded-xl shadow-md border border-blue-200" : "min-w-0"}>
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
        <span className="flex items-center justify-center rounded-lg bg-white/90 p-3 text-slate-900 shadow-xs transition group-active:scale-105 group-hover:scale-105">
          <Expand className="h-5 w-5" />
        </span>
      </span>
    </button>
  );
}

type ProjectImageViewerProps = {
  image: GalleryImage;
  projectTitle: string;
  activeIndex: number;
  totalImages: number;
  opener: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

function ProjectImageViewer({ image, projectTitle, activeIndex, totalImages, opener, onClose, onPrevious, onNext }: ProjectImageViewerProps) {
  const { dialogRef, closeRef } = useGalleryModal(opener, onClose, onPrevious, onNext);
  const { stageRef, backdropRef } = useGalleryGestures(totalImages > 1, onPrevious, onNext, onClose);
  const reducedMotion = useReducedMotion();
  const id = React.useId();

  return (
    <motion.div
      ref={dialogRef}
      className={styles.dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-counter ${id}-instructions`}
      tabIndex={-1}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.15 }}
    >
      <div ref={backdropRef} className={styles.backdrop}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h2 id={`${id}-title`} className={styles.title}>Photo gallery</h2>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close image viewer" className={styles.control}>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <p id={`${id}-instructions`} className="sr-only">
            {totalImages > 1 ? "Use the arrow buttons, Left and Right keys, or swipe on the image to browse. " : ""}
            Press Escape to close.
          </p>
          <div ref={stageRef} className={styles.stage}>
            <LightboxImage key={image.url} image={image} projectTitle={projectTitle} onRetry={() => closeRef.current?.focus({ preventScroll: true })} />
          </div>
          <div className={styles.footer}>
            <div className={styles.navigation}>
              {totalImages > 1 ? (
                <NavButton ariaLabel="Previous image" onClick={onPrevious}>
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </NavButton>
              ) : null}
              <span id={`${id}-counter`} className={styles.counter} style={{ minWidth: `max(8.75rem, ${10 + String(totalImages).length * 2}ch)` }} aria-live="polite" aria-atomic="true">
                Image {activeIndex + 1} of {totalImages}
              </span>
              {totalImages > 1 ? (
                <NavButton ariaLabel="Next image" onClick={onNext}>
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </NavButton>
              ) : null}
            </div>
            {totalImages > 1 ? <p className={styles.hint} aria-hidden="true">Swipe to browse</p> : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LightboxImage({ image, projectTitle, onRetry }: { image: GalleryImage; projectTitle: string; onRetry: () => void }) {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = React.useState(0);
  const imageRef = React.useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setStatus("loaded");
  }, []);

  return (
    <>
      <GalleryPhoto
        key={attempt}
        ref={imageRef}
        image={image}
        projectTitle={projectTitle}
        fill
        sizes="(min-width: 1024px) 1024px, 100vw"
        draggable={false}
        // vinext supplies an inline cover default for fill images.
        style={{ objectFit: "contain" }}
        className={`${styles.image} ${status !== "loaded" ? styles.imagePending : ""}`}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status !== "loaded" ? (
        <div className={styles.imageStatus}>
          <span>{status === "error" ? "Image couldn’t load" : "Loading image…"}</span>
          {status === "error" ? (
            <button type="button" className={styles.retry} onClick={() => {
              onRetry();
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}>Retry image</button>
          ) : null}
        </div>
      ) : null}
    </>
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
};

function NavButton({ ariaLabel, onClick, children }: NavButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        // Safari does not focus a button after a pointer activation.
        e.currentTarget.focus({ preventScroll: true });
        onClick();
      }}
      className={styles.control}
    >
      {children}
    </button>
  );
}

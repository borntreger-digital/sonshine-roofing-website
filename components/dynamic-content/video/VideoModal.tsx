"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { VideoItem } from "@/lib/content/video-types";
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import VideoShareBar from './VideoShareBar';

export type PlaybackVideo = Pick<VideoItem, 'id' | 'slug' | 'title' | 'youtubeId' | 'legacyIds'>;

type Props = {
  collectionUrl: string;
  video: PlaybackVideo | null;
  isOpen: boolean;
  onClose: () => void;
};

const ANIM = {
  backdrop: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  modal: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 260, damping: 24 },
    },
    exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.15 } },
  },
} as const;

export default function VideoModal({ collectionUrl, video, isOpen, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const scrollYRef = useRef(0);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const videoKey = useMemo(
    () => video?.youtubeId ?? video?.slug ?? video?.id ?? "video-modal",
    [video?.id, video?.slug, video?.youtubeId]
  );

  useEffect(() => {
    if (!isOpen || !video) return undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const isShift = e.shiftKey;
        const el = document.activeElement as HTMLElement | null;
        if (!isShift && el === last) { e.preventDefault(); first.focus(); }
        else if (isShift && (el === first || el === modalRef.current)) { e.preventDefault(); last.focus(); }
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

    window.addEventListener("keydown", onKey);
    setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
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
        try { el?.focus?.({ preventScroll: true }); }
        catch {
          try { el?.focus?.(); } catch { /* ignore */ }
        }
        previouslyFocused.current = null;
      });
    };
  }, [isOpen, video, onClose]);

  if (!video && !isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && video ? (
        <motion.div
          key={`${videoKey}-wrapper`}
          className="fixed inset-0 z-1000"
          aria-modal="true"
          role="dialog"
          aria-label={video.title}
          initial={ANIM.backdrop.initial}
          animate={ANIM.backdrop.animate}
          exit={ANIM.backdrop.exit}
        >
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={ANIM.backdrop.initial}
            animate={ANIM.backdrop.animate}
            exit={ANIM.backdrop.exit}
          />

          <div
            ref={modalRef}
            className="absolute inset-0 flex cursor-pointer items-center justify-center p-4"
            onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <motion.div
              key={videoKey}
              className="relative max-h-[calc(100dvh-2rem)] w-full max-w-6xl cursor-auto overflow-y-auto rounded-2xl bg-black shadow-2xl"
              initial={ANIM.modal.initial}
              animate={ANIM.modal.animate}
              exit={ANIM.modal.exit}
            >
              <iframe
                className="aspect-video max-h-[65dvh] w-full"
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <div className="p-3 sm:p-4">
                <VideoShareBar collectionUrl={collectionUrl} />
              </div>
            </motion.div>
            <ModalCloseButton
              ref={closeBtnRef}
              ariaLabel="Close"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

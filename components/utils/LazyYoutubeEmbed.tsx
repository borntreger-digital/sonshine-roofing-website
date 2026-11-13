"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import clsx from "clsx";

type LazyYoutubeEmbedProps = {
  videoId: string;
  /** Emit a real player in initial HTML for indexable supporting placements. */
  discoverable?: boolean;
  title: string;
  className?: string;
  posterUrl?: string;
  host?: "youtube" | "youtube-nocookie";
  query?: Partial<Record<string, string | number | boolean>>;
};

function buildQuery(videoId: string, overrides: LazyYoutubeEmbedProps["query"] = {}) {
  const base: Record<string, string | number | boolean> = {
    autoplay: 1,
    mute: 1,
    loop: 1,
    playlist: videoId,
    playsinline: 1,
    controls: 0,
    modestbranding: 1,
    rel: 0,
  };
  const merged = { ...base, ...overrides };
  if (!("playlist" in merged) || merged.playlist === undefined) {
    merged.playlist = videoId;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") {
      params.set(key, value ? "1" : "0");
      continue;
    }
    params.set(key, String(value));
  }

  return params.toString();
}

export default function LazyYoutubeEmbed({
  videoId,
  title,
  className,
  posterUrl,
  host = "youtube-nocookie",
  query,
  discoverable = false,
}: LazyYoutubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [prefersReduceMotion, setPrefersReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isActive || prefersReduceMotion || (discoverable && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsActive(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isActive, prefersReduceMotion, discoverable]);

  const activate = () => {
    setIsActive(true);
  };

  const baseUrl = host === "youtube" ? "https://www.youtube.com/embed/" : "https://www.youtube-nocookie.com/embed/";
  const src = `${baseUrl}${videoId}?${buildQuery(videoId, query)}`;
  const poster = posterUrl ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900/20 shadow-lg",
        className
      )}
    >
      {isActive || discoverable ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={isActive ? src : `${baseUrl}${videoId}?${buildQuery(videoId, { ...query, autoplay: 0 })}`}
          title={title}
          tabIndex={isActive ? undefined : -1}
          aria-hidden={!isActive || undefined}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : null}
      {!isActive ? (
        <>
          <Image
            src={poster}
            alt={`${title} thumbnail`}
            fill
            priority={false}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="absolute inset-0 object-cover"
          />

          <div className="pointer-events-none absolute inset-0 bg-slate-900/35" aria-hidden="true" />

          <button
            type="button"
            onClick={activate}
            className="absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
          >
            <span className="sr-only">Play {title}</span>
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-xl bg-black/70 text-white transition hover:bg-black/80"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>

          {prefersReduceMotion && (
            <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
              Tap to play
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

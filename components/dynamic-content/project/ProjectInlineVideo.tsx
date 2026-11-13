"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Play } from "lucide-react";

type Props = {
  title: string;
  videoId: string;
  posterUrl?: string;
  posterAlt?: string;
};

/** Click-to-play video on the project detail page. */
export default function ProjectInlineVideo({ title, videoId, posterUrl, posterAlt }: Props) {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const poster = posterUrl?.trim() || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  useEffect(() => {
    if (playing) playerRef.current?.focus({ preventScroll: true });
  }, [playing]);

  return (
    <section className="w-full max-w-3xl" aria-label={`Drone video: ${title}`}>
      <h2 className="mb-3 text-2xl leading-tight md:text-3xl">See the finished roof</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="relative aspect-video min-h-[200px] w-full min-w-0 bg-slate-950">
          {playing ? (
            <iframe
              ref={playerRef}
              className="absolute inset-0 h-full w-full border-0"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&fs=1&playsinline=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button
              type="button"
              className="group absolute inset-0 block h-full w-full overflow-hidden text-white focus-visible:outline-none"
              aria-label={`Play drone video: ${title}`}
              onClick={() => setPlaying(true)}
            >
              <Image
                src={poster}
                alt={posterAlt?.trim() || title}
                fill
                sizes="(max-width: 1023px) 100vw, 768px"
                className="object-cover"
              />
              <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/30 via-transparent to-transparent" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
                <span className="grid size-14 place-items-center rounded-xl border border-white bg-white/95 text-(--brand-blue) shadow-md motion-safe:transition-transform motion-safe:group-hover:scale-105 md:size-16">
                  <Play className="ml-1 size-6 fill-current" />
                </span>
              </span>
              <span className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/20 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold" aria-hidden="true">
                Play drone video
              </span>
              <span className="pointer-events-none absolute inset-0 group-focus-visible:ring-4 group-focus-visible:ring-inset group-focus-visible:ring-(--brand-orange)" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">Drone video · SonShine Roofing</p>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-medium text-(--brand-blue) hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--brand-blue)"
            aria-label={`Watch ${title} on YouTube (opens in a new tab)`}
          >
            Watch on YouTube
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

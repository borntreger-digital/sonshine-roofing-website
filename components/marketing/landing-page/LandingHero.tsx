'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';
import SmartLink from '@/components/utils/SmartLink';
import { renderHighlight } from '@/components/utils/renderHighlight';
import Image from 'next/image';
import LeadForm from '@/components/lead-capture/lead-form/LeadForm';
import { LeadFormFallback } from '@/components/lead-capture/lead-form/Fallback';
import {
  restoreLeadSuccessState,
  type LeadSuccessRestore,
} from '@/components/lead-capture/lead-form/config';
import { useSiteSettings } from '@/lib/content/site-settings-context';
import ReviewSummary from '@/components/reviews-widget/ReviewSummary';

type HeroProps = {
  scriptFontClassName: string;
  title?: string;
  highlightText?: string | readonly string[];
  description?: string;
};

export default function Hero({
  scriptFontClassName,
  title = 'The BEST Roofing Company in Sarasota, Manatee, and Charlotte Counties for over 39 years',
  highlightText = ['BEST', 'over 39 years'],
  description,
}: HeroProps) {
  const { heroImage, heroVideo, licenseNumber, licenseUrl } = useSiteSettings();
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [allowsMotion, setAllowsMotion] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const restoredSuccess = useMemo<LeadSuccessRestore | null>(() => restoreLeadSuccessState(), []);
  const renderedTitle = renderHighlight(title, highlightText, 'text-(--brand-cyan)');
  const shouldMountVideo = allowsMotion && isNearViewport && Boolean(heroVideo?.url);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setAllowsMotion(!media.matches);

    updateMotionPreference();
    media.addEventListener('change', updateMotionPreference);
    return () => media.removeEventListener('change', updateMotionPreference);
  }, []);

  const [previousMotion, setPreviousMotion] = useState(allowsMotion);
  if (previousMotion !== allowsMotion) {
    setPreviousMotion(allowsMotion);
    if (!allowsMotion) {
      setIsNearViewport(false);
      setIsVideoPlaying(false);
    }
  }

  useEffect(() => {
    if (!allowsMotion) return;

    const target = sectionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [allowsMotion]);

  useEffect(() => {
    if (!shouldMountVideo) return;

    const el = videoRef.current;
    if (!el) return;

    el.play().catch(() => {
      setIsVideoPlaying(false);
    });
    return () => el.pause();
  }, [shouldMountVideo]);

  return (
    <section
      ref={sectionRef}
      className={`${scriptFontClassName} relative isolate h-auto overflow-hidden bg-black text-white`}
    >
      {heroImage ? (
        <Image
          src={heroImage.url}
          alt={heroImage.description}
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
      ) : null}

      {shouldMountVideo && heroVideo ? (
        <video
          ref={videoRef}
          className={`pointer-events-none absolute inset-0 z-10 h-full w-full object-cover ${
            isVideoPlaying ? 'opacity-100' : 'opacity-0'
          }`}
          src={heroVideo.url}
          autoPlay
          muted
          loop
          preload="none"
          playsInline
          aria-hidden="true"
          onPlaying={() => setIsVideoPlaying(true)}
          onError={() => setIsVideoPlaying(false)}
        />
      ) : null}

      <div aria-hidden="true" className="absolute inset-0 z-20 bg-black/70" />

      {/* Content */}
      <div className="relative z-30 mx-auto max-w-360 px-4 pb-32 pt-24 md:pt-32 not-prose">
        <div className="grid gap-10 items-start lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
          <div className="max-w-3xl mx-auto text-center lg:pb-8 lg:text-left">
            <div>
              <p className="font-script text-2xl font-semibold text-(--brand-cyan) sm:text-4xl">
                Since 1987, we&apos;ve got you covered.
              </p>
              {licenseNumber && licenseUrl ? (
                <SmartLink
                  href={licenseUrl}
                  showExternalIcon
                  className="mt-4 font-semibold text-xs md:text-sm tracking-wider text-orange-300"
                >
                  <ShieldCheck className="mr-1 inline h-3 w-3 text-orange-300" />
                  INSURED | LICENSE #{licenseNumber}
                </SmartLink>
              ) : null}
            </div>

            <h1 className="my-8 text-3xl sm:text-4xl leading-12 text-blue-50 md:leading-20 md:text-7xl lg:leading-28">
              {renderedTitle}
            </h1>
            {description ? (
              <p className="text-lg leading-relaxed text-blue-50 md:text-xl">{description}</p>
            ) : null}

            <ReviewSummary tone="inverse" className="mt-6 justify-center lg:justify-start" />

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <SmartLink
                className="inline-flex items-center gap-2 rounded-xl border border-blue-100/50 bg-(--brand-blue) px-6 py-4 text-xl sm:text-3xl font-semibold tracking-wide text-white transition hover:bg-white/18 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 phone-affordance"
                href="/contact-us"
                title="Contact SonShine Roofing"
                aria-label="Contact SonShine Roofing"
              >
                <Smartphone className="h-4 w-4 sm:h-6 sm:w-6 inline mr-1 phone-affordance-icon" />
                Contact Us
              </SmartLink>
              <SmartLink
                className="backdrop-blur-xs inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-4 text-xl sm:text-3xl font-semibold tracking-wide text-white transition hover:bg-white/18 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 phone-affordance"
                href="/about-sonshine-roofing"
                title="About SonShine Roofing"
                aria-label="About SonShine Roofing"
                data-icon-affordance="right"
              >
                Learn More
                <ArrowRight className="h-4 w-4 sm:h-6 sm:w-6 inline ml-1 icon-affordance" />
              </SmartLink>
            </div>
          </div>

          <div className="mx-auto w-full lg:mx-0 lg:justify-self-end">
            <Suspense fallback={<LeadFormFallback />}>
              <LeadForm restoredSuccess={restoredSuccess} variant="heroEmbedded" />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

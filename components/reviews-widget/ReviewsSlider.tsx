'use client';

import AutoScroll from 'embla-carousel-auto-scroll';
import EmblaCarousel, { type EmblaCarouselType } from 'embla-carousel';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, Quote, X } from 'lucide-react';
import SmartLink from '../utils/SmartLink';
import ReviewAttribution from './ReviewAttribution';
import type { ReviewsSliderProps } from './types';

const CONTROL_CLASS = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-default disabled:opacity-40';

function lockReviewScroll() {
  const body = document.body;
  const html = document.documentElement;
  const scrollY = window.scrollY || html.scrollTop || 0;
  const previous = {
    position: body.style.position, top: body.style.top, left: body.style.left,
    right: body.style.right, width: body.style.width, overflow: body.style.overflow,
    paddingRight: body.style.paddingRight, scrollBehavior: html.style.scrollBehavior,
    scrollLock: html.dataset.scrollLock, scrollLockOffset: html.style.getPropertyValue('--scroll-lock-offset'),
  };
  const scrollbar = window.innerWidth - html.clientWidth;
  Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
  if (scrollbar > 0) body.style.setProperty('padding-right', `${scrollbar}px`);
  html.setAttribute('data-scroll-lock', 'true');
  html.style.setProperty('--scroll-lock-offset', `${scrollbar}px`);
  return () => {
    html.style.scrollBehavior = 'auto';
    Object.assign(body.style, {
      position: previous.position, top: previous.top, left: previous.left, right: previous.right,
      width: previous.width, overflow: previous.overflow, paddingRight: previous.paddingRight,
    });
    if (previous.scrollLock === undefined) delete html.dataset.scrollLock;
    else html.dataset.scrollLock = previous.scrollLock;
    if (previous.scrollLockOffset) html.style.setProperty('--scroll-lock-offset', previous.scrollLockOffset);
    else html.style.removeProperty('--scroll-lock-offset');
    window.scrollTo(0, scrollY);
    html.style.scrollBehavior = previous.scrollBehavior;
  };
}

export default function ReviewsSlider({ reviews, onReady, onError }: ReviewsSliderProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const emblaRef = useRef<EmblaCarouselType | null>(null);
  const autoScrollRef = useRef<ReturnType<typeof AutoScroll> | null>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [carouselVersion, setCarouselVersion] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const modalTitleId = useId();
  const modalOpen = modalIndex !== null;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!viewportRef.current || !reviews.length) return;
    let carousel: EmblaCarouselType | undefined;
    try {
      const autoScroll = AutoScroll({
        speed: 1, startDelay: 0, playOnInit: false,
        stopOnInteraction: true, stopOnMouseEnter: false, stopOnFocusIn: false,
      });
      autoScrollRef.current = autoScroll;
      carousel = EmblaCarousel(viewportRef.current, {
        align: 'start', loop: reviews.length > 1, containScroll: 'keepSnaps', dragFree: true,
        breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } },
      }, [autoScroll]);
      emblaRef.current = carousel;
      const update = () => {
        const previous = carousel?.canScrollPrev() ?? false;
        const next = carousel?.canScrollNext() ?? false;
        setCanGoBack(previous);
        setCanGoForward(next);
        setCanScroll(previous || next);
      };
      update();
      carousel.on('select', update);
      carousel.on('reInit', () => {
        update();
        // Embla resets plugin playback after resizing; reapply the current pause preference.
        setCarouselVersion(version => version + 1);
      });
      // Dragging is deliberate interaction; keep scrolling stopped until Resume is chosen.
      carousel.on('pointerDown', () => setPaused(true));
      onReady?.();
    } catch {
      onError?.();
    }
    return () => {
      autoScrollRef.current = null;
      emblaRef.current = null;
      carousel?.destroy();
    };
  }, [reviews, onReady, onError]);

  useEffect(() => {
    const shouldPlay = canScroll && !reducedMotion && !paused && !hovered && !focusPaused && !modalOpen;
    if (shouldPlay) autoScrollRef.current?.play();
    else autoScrollRef.current?.stop();
  }, [reviews, carouselVersion, canScroll, reducedMotion, paused, hovered, focusPaused, modalOpen]);

  const closeModal = useCallback(() => setModalIndex(null), []);
  const openModal = (index: number, trigger: HTMLButtonElement) => {
    returnFocusRef.current = trigger;
    autoScrollRef.current?.stop();
    setModalIndex(index);
  };
  const moveReview = useCallback((direction: number) => {
    setModalIndex(index => index === null ? null : (index + direction + reviews.length) % reviews.length);
  }, [reviews.length]);

  useEffect(() => {
    if (!modalOpen) return;
    const restoreScroll = lockReviewScroll();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); }
      if (reviews.length > 1 && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        moveReview(event.key === 'ArrowRight' ? 1 : -1);
      }
      if (event.key === 'Tab' && modalRef.current) {
        const nodes = modalRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]');
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || !modalRef.current.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !modalRef.current.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !modalRef.current?.contains(event.target)) closeBtnRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', containFocus);
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', containFocus);
      restoreScroll();
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true });
    };
  }, [modalOpen, reviews.length, closeModal, moveReview]);

  const selected = modalIndex === null ? null : reviews[modalIndex];
  if (!reviews.length) return null;
  return (
    <div className="relative isolate w-full" role="region" aria-roledescription="carousel" aria-label="Customer reviews"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusPaused(true)} onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusPaused(false);
      }}>
      <div ref={viewportRef} className="overflow-hidden px-5 py-3" data-review-viewport
        style={canScroll ? {
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
          maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
        } : undefined}>
        <div className="-ml-4 flex flex-nowrap items-start" aria-live="off">
          {reviews.map((review, index) => (
            <div key={review.id} className="min-w-0 shrink-0 basis-[80%] pl-4 md:basis-1/3 lg:basis-1/4"
              role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${reviews.length}`}>
              <button type="button" onClick={event => openModal(index, event.currentTarget)}
                aria-label={`Open full review by ${review.authorName}`} aria-haspopup="dialog"
                className="my-4 block w-full appearance-none rounded-3xl border border-blue-300 bg-cyan-50 p-5 text-left shadow-md transition motion-safe:duration-300 hover:border-[#fb9216] hover:shadow-xl motion-safe:hover:-translate-y-0.5 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                <span className="flex items-start justify-between gap-3">
                  <ReviewAttribution review={review} inButton starVariant="icon" />
                  <Quote className="mt-1 h-10 w-10 flex-none text-(--brand-cyan)" aria-hidden="true" />
                </span>
                <span className="mt-4 block text-base text-slate-700 md:text-lg">{review.text.length > 250 ? `${review.text.slice(0, 250)}…` : review.text}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      {canScroll ? (
        <div className="mb-4 flex flex-wrap justify-center gap-2" aria-label="Review carousel controls">
          <button type="button" className={CONTROL_CLASS} aria-label="Previous reviews" disabled={!canGoBack}
            onClick={() => { setPaused(true); emblaRef.current?.scrollPrev(reducedMotion); }}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Previous reviews</span>
          </button>
          {!reducedMotion ? (
            <button type="button" className={CONTROL_CLASS} onClick={() => {
              // Honor an explicit Resume without moving keyboard focus. The next focus event pauses again.
              if (paused) setFocusPaused(false);
              setPaused(value => !value);
            }}
              aria-label={paused ? 'Resume automatic scrolling' : 'Pause automatic scrolling'}>
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
          ) : null}
          <button type="button" className={CONTROL_CLASS} aria-label="Next reviews" disabled={!canGoForward}
            onClick={() => { setPaused(true); emblaRef.current?.scrollNext(reducedMotion); }}>
            <ArrowRight className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Next reviews</span>
          </button>
        </div>
      ) : null}
      {selected && createPortal(
        <div className="fixed inset-0 z-2147483647 grid cursor-pointer place-items-center bg-black/45 px-4 py-8 md:p-16"
          onClick={event => { if (event.target === event.currentTarget) closeModal(); }}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={modalTitleId}
            className="relative mx-auto flex max-h-[85dvh] w-full max-w-[720px] cursor-auto flex-col overflow-hidden rounded-3xl border border-blue-300 bg-white shadow-2xl">
            <button ref={closeBtnRef} type="button" aria-label="Close review" onClick={closeModal}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-red-600 hover:bg-white focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-brand-blue">
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="border-b border-blue-200 bg-blue-50 px-5 pb-4 pr-16 pt-5">
              <ReviewAttribution review={selected} titleId={modalTitleId} starVariant="icon" starClassName="h-7 w-7" />
              {selected.sourceUrl ? (
                <SmartLink href={selected.sourceUrl} target="_blank" rel="noopener noreferrer nofollow"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue underline underline-offset-4">
                  {selected.sourceLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </SmartLink>
              ) : null}
            </div>
            <div className="overflow-auto bg-amber-50/50 px-5 py-4">
              <blockquote className="m-0 whitespace-pre-wrap text-base text-slate-700 md:text-lg">{selected.text}</blockquote>
            </div>
            {reviews.length > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-blue-100 px-5 py-3">
                <button type="button" className={CONTROL_CLASS} aria-label="Previous review" onClick={() => moveReview(-1)}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Previous</button>
                <span className="text-sm text-slate-500" aria-live="polite">{modalIndex! + 1} of {reviews.length}</span>
                <button type="button" className={CONTROL_CLASS} aria-label="Next review" onClick={() => moveReview(1)}>Next<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            ) : null}
          </div>
        </div>, document.body,
      )}
    </div>
  );
}

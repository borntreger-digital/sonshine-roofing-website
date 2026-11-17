"use client";

import { useEffect, useRef } from "react";

type GestureStart = { id: number; x: number; y: number; cancelled?: boolean };

/** Swipe supplements buttons; zoom, vertical panning and multi-touch stay native. */
export function useGalleryGestures(canNavigate: boolean, onPrevious: () => void, onNext: () => void, onClose: () => void) {
  const stageRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const backdrop = backdropRef.current;
    if (!stage || !backdrop) return;

    const contacts = new Set<number>();
    let swipe: GestureStart | null = null;
    let backdropTap: GestureStart | null = null;
    let suppressClickUntil = 0;
    const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;
    const reset = () => { swipe = null; backdropTap = null; };
    const interrupt = () => { reset(); contacts.clear(); };
    const updateViewport = () => {
      interrupt();
      stage.style.touchAction = canNavigate && !isZoomed() ? "pan-y pinch-zoom" : "auto";
    };
    const onContactStart = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        contacts.add(event.pointerId);
        if (contacts.size > 1) reset();
      }
    };
    const onContactEnd = (event: PointerEvent) => { contacts.delete(event.pointerId); };
    const onStageDown = (event: PointerEvent) => {
      if (!canNavigate || isZoomed() || !event.isPrimary || contacts.size !== 1 || !["touch", "pen"].includes(event.pointerType)) return;
      if (event.target instanceof Element && event.target.closest("button")) return;
      swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
      try { stage.setPointerCapture(event.pointerId); } catch { swipe = null; }
    };
    const onStageMove = (event: PointerEvent) => {
      if (!swipe || swipe.id !== event.pointerId) return;
      const dx = Math.abs(event.clientX - swipe.x);
      const dy = Math.abs(event.clientY - swipe.y);
      if (dy > 12 && dy > dx) swipe.cancelled = true;
    };
    const onStageUp = (event: PointerEvent) => {
      const candidate = swipe;
      swipe = null;
      if (!candidate || candidate.id !== event.pointerId || candidate.cancelled || isZoomed()) return;
      const dx = event.clientX - candidate.x;
      const dy = event.clientY - candidate.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      suppressClickUntil = performance.now() + 450;
      event.preventDefault();
      if (dx < 0) onNext();
      else onPrevious();
    };
    const onStageClick = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onBackdropDown = (event: PointerEvent) => {
      backdropTap = event.target === backdrop && event.isPrimary && event.button === 0 && contacts.size <= 1
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : null;
    };
    const onBackdropUp = (event: PointerEvent) => {
      const candidate = backdropTap;
      backdropTap = null;
      if (candidate && candidate.id === event.pointerId && event.target === backdrop && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) < 8) onClose();
    };
    document.addEventListener("pointerdown", onContactStart, true);
    document.addEventListener("pointerup", onContactEnd, true);
    document.addEventListener("pointercancel", onContactEnd, true);
    stage.addEventListener("pointerdown", onStageDown);
    stage.addEventListener("pointermove", onStageMove);
    stage.addEventListener("pointerup", onStageUp);
    stage.addEventListener("pointercancel", reset);
    stage.addEventListener("lostpointercapture", reset);
    stage.addEventListener("click", onStageClick, true);
    backdrop.addEventListener("pointerdown", onBackdropDown);
    backdrop.addEventListener("pointerup", onBackdropUp);
    backdrop.addEventListener("pointercancel", reset);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", interrupt);
    window.visualViewport?.addEventListener("resize", updateViewport);
    updateViewport();

    return () => {
      document.removeEventListener("pointerdown", onContactStart, true);
      document.removeEventListener("pointerup", onContactEnd, true);
      document.removeEventListener("pointercancel", onContactEnd, true);
      stage.removeEventListener("pointerdown", onStageDown);
      stage.removeEventListener("pointermove", onStageMove);
      stage.removeEventListener("pointerup", onStageUp);
      stage.removeEventListener("pointercancel", reset);
      stage.removeEventListener("lostpointercapture", reset);
      stage.removeEventListener("click", onStageClick, true);
      backdrop.removeEventListener("pointerdown", onBackdropDown);
      backdrop.removeEventListener("pointerup", onBackdropUp);
      backdrop.removeEventListener("pointercancel", reset);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", interrupt);
      window.visualViewport?.removeEventListener("resize", updateViewport);
    };
  }, [canNavigate, onPrevious, onNext, onClose]);

  return { stageRef, backdropRef };
}

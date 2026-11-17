"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Own focus, background interaction and scroll only while this viewer is mounted. */
export function useGalleryModal(
  opener: RefObject<HTMLElement | null>,
  onClose: () => void,
  onPrevious: () => void,
  onNext: () => void,
) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const returnFocus = opener.current;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const properties = ["position", "top", "left", "right", "width", "overflow", "padding-right"];
    const savedStyles = properties.map((property) => ({
      property,
      value: body.style.getPropertyValue(property),
      priority: body.style.getPropertyPriority(property),
    }));
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const paddingRight = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
    Object.assign(body.style, {
      position: "fixed", top: `-${scrollY}px`, left: "0", right: "0", width: "100%", overflow: "hidden",
    });
    if (scrollbarWidth > 0) body.style.paddingRight = `${paddingRight + scrollbarWidth}px`;

    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");

    const focusClose = () => (closeRef.current ?? dialog).focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (!event.altKey && !event.ctrlKey && !event.metaKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        if (event.key === "ArrowLeft") onPrevious();
        else onNext();
      } else if (event.key === "Tab") {
        const controls = focusables();
        const index = controls.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        if (!controls.length) dialog.focus({ preventScroll: true });
        else controls[index < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus({ preventScroll: true });
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusClose();
    };

    focusClose();
    // The portal is a direct body child. Preserve prior inert values, including
    // background nodes mounted later by the site shell or third-party widgets.
    const inertStates = new Map<HTMLElement, boolean>();
    const makeBackgroundInert = () => {
      for (const child of body.children) {
        if (!(child instanceof HTMLElement) || child === dialog || child.contains(dialog)) continue;
        if (!inertStates.has(child)) inertStates.set(child, child.inert);
        child.inert = true;
      }
    };
    makeBackgroundInert();
    const observer = new MutationObserver(makeBackgroundInert);
    observer.observe(body, { childList: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", containFocus);

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", containFocus);
      inertStates.forEach((wasInert, element) => { element.inert = wasInert; });
      savedStyles.forEach(({ property, value, priority }) => {
        if (value) body.style.setProperty(property, value, priority);
        else body.style.removeProperty(property);
      });
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [opener, onClose, onPrevious, onNext]);

  return { dialogRef, closeRef };
}

"use client";

import { forwardRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalCloseButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  ariaLabel?: string;
  iconClassName?: string;
};

const BASE_CLASSES =
  "fixed z-50 top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] md:top-[max(1.25rem,env(safe-area-inset-top))] md:right-[max(1.25rem,env(safe-area-inset-right))] border border-blue-200 rounded-xl hover:bg-white/80 bg-white/40 text-blue-200 hover:text-red-600 p-2.5 shadow-lg backdrop-blur-xs transition-colors focus:outline-hidden focus-visible:ring-2";

const ModalCloseButton = forwardRef<HTMLButtonElement, ModalCloseButtonProps>(
  ({ ariaLabel = "Close", className, iconClassName, type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      className={cn(BASE_CLASSES, className)}
      {...rest}
    >
      <X className={cn("h-5 w-5", iconClassName)} aria-hidden="true" />
    </button>
  )
);

ModalCloseButton.displayName = "ModalCloseButton";

export default ModalCloseButton;

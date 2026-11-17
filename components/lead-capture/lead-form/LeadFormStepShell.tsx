'use client';

import StaticImage from '@/components/media/StaticMediaProvider';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type LeadFormStepShellProps = {
  stepLabel: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  className?: string;
  headerFooter?: ReactNode;
  bottomSlot?: ReactNode;
};

export default function LeadFormStepShell({
  stepLabel,
  title,
  description,
  children,
  className,
  headerFooter,
  bottomSlot,
}: LeadFormStepShellProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1600px] overflow-hidden rounded-xl border border-blue-200 bg-sky-50 shadow-xl', className)}>
      <div className="border-b border-blue-100 bg-linear-to-l from-amber-100 via-amber-50 to-sky-50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-(--brand-blue)">{stepLabel}</p>
            <h3 className="mt-3 mb-4 text-2xl font-semibold text-slate-900 md:text-3xl">{title}</h3>
            <p className="mt-3 text-sm text-slate-600 md:text-base">{description}</p>
          </div>
          <div className="relative mb-4 aspect-21/9 h-[27px] w-[79px] sm:h-[54px] sm:w-[158px] shrink-0">
            <StaticImage
              src="static:sonshine-roofing-wordmark"
              alt="SonShine Roofing"
              width={158}
              height={54}
              className="absolute right-0 top-[20px]"
            />
          </div>
        </div>
        {headerFooter}
      </div>

      <div className="p-6">{children}</div>

      {bottomSlot ? <div className="p-6">{bottomSlot}</div> : null}
    </div>
  );
}

type LeadFormStepControlsProps = {
  start?: ReactNode;
  end?: ReactNode;
  className?: string;
};

export function LeadFormStepControls({ start, end, className }: LeadFormStepControlsProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-3">{start}</div>
      <div className="flex items-center gap-3">{end}</div>
    </div>
  );
}

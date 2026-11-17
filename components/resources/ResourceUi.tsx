import type { InputHTMLAttributes, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ResourceSearchPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-xs md:p-5">
      {children}
    </div>
  );
}

export function ResourceSearchField({
  label,
  clearButton,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  clearButton?: ReactNode;
}) {
  return (
    <div role="search" aria-label={label}>
      <label htmlFor={input.id} className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"
          aria-hidden="true"
        />
        <input
          type="search"
          autoComplete="off"
          {...input}
          className={cn(
            'h-12 w-full min-w-0 rounded-lg border border-blue-200 bg-white pl-11 pr-12 text-base text-slate-800 placeholder:text-slate-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue) [&::-webkit-search-cancel-button]:appearance-none',
            input.className,
          )}
        />
        {clearButton}
      </div>
    </div>
  );
}

export const resourceClearButtonClass =
  '[[hidden]]:hidden absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue)';

export function ResourceGroupHeading({
  title,
  count,
  id,
  countClassName,
}: {
  title: string;
  count: number;
  id?: string;
  countClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/50 px-4 py-4 md:px-5">
      <h2 id={id} className="min-w-0 text-2xl font-semibold leading-tight">
        {title}
      </h2>
      <span
        className={cn(
          'shrink-0 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-slate-600',
          countClassName,
        )}
      >
        {count}
      </span>
    </div>
  );
}

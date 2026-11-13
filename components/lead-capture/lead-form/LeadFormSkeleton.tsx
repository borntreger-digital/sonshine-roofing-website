import Skeleton from '@/components/ui/Skeleton';

function HeaderSkeleton() {
  return (
    <div className="border-b border-blue-100 bg-linear-to-r from-sky-50 via-white to-amber-50 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4">
          <Skeleton className="h-3 w-32 rounded-sm" />
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="relative h-[54px] w-[158px]">
          <Skeleton className="absolute inset-0 h-full w-full rounded-2xl" />
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-blue-100">
        <Skeleton className="h-full w-1/3 rounded-full" />
      </div>
    </div>
  );
}

function NeedStepSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex h-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-xs"
        >
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-6 w-40 rounded-md" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-8 self-end rounded-md" />
        </div>
      ))}
    </div>
  );
}

function ContextStepSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <Skeleton className="h-4 w-64 rounded-lg" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <Skeleton className="h-32 w-full rounded-xl" />
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40 rounded-lg" />
                  <Skeleton className="h-4 w-48 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-48 rounded-lg" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-32 rounded-md" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-56 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      </div>
      <aside className="hidden gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600 lg:flex lg:flex-col">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="mt-1 h-5 w-5 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-lg" />
            </div>
          </div>
        ))}
        <Skeleton className="hidden h-48 w-full rounded-2xl md:block" />
      </aside>
    </div>
  );
}

function ContactStepSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <div className="md:col-span-2 space-y-3">
        <Skeleton className="h-4 w-36 rounded-lg" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-36 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="md:col-span-2 space-y-3">
        <Skeleton className="h-4 w-44 rounded-lg" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-40 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="md:col-span-2 space-y-2">
        <Skeleton className="h-4 w-48 rounded-lg" />
        <Skeleton className="h-28 w-full rounded-3xl" />
      </div>
      <div className="md:col-span-2">
        <Skeleton className="h-12 w-full rounded-3xl" />
      </div>
      <div className="md:col-span-2 space-y-2">
        <Skeleton className="h-4 w-64 rounded-lg" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>
      <div className="md:col-span-2">
        <Skeleton className="h-16 w-full rounded-3xl" />
      </div>
    </div>
  );
}

function FooterSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-4 border-t border-blue-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-48 rounded-md" />
          ))}
        </div>
      </div>
      <div className="mx-8 my-6 flex items-center justify-end gap-3">
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </>
  );
}

export default function LeadFormSkeleton() {
  return (
    <div className="overflow-hidden mx-2 rounded-3xl border border-blue-100 bg-white shadow-md">
      <HeaderSkeleton />
      <div className="p-6 space-y-10">
        <NeedStepSkeleton />
        <ContextStepSkeleton />
        <ContactStepSkeleton />
      </div>
      <FooterSkeleton />
    </div>
  );
}

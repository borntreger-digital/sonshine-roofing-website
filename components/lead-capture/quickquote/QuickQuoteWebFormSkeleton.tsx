import type { CSSProperties } from "react";
import Skeleton from "@/components/ui/Skeleton";

const darkSkeletonStyle = {
  "--skeleton-base": "rgba(255, 255, 255, 0.22)",
  "--skeleton-highlight": "rgba(255, 255, 255, 0.45)",
} as CSSProperties;

const fieldLabelWidths = ["w-24", "w-24", "w-16", "w-28", "w-20", "w-28"];

function FieldSkeleton({ labelWidth }: { labelWidth: string }) {
  return (
    <div className="space-y-[6px]">
      <Skeleton className={`h-[18px] ${labelWidth} rounded-md`} />
      <Skeleton className="h-[38px] w-full rounded-[4px]" />
    </div>
  );
}

export default function QuickQuoteWebFormSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-[16px] bg-white shadow-[0_32px_64px_rgba(0,0,0,0.15)]"
    >
      <div aria-hidden="true">
        <div className="bg-[#434343] p-[15px]">
          <Skeleton className="mx-auto h-[28px] w-4/5 rounded-lg" style={darkSkeletonStyle} />
          <Skeleton className="mx-auto mt-2 h-[18px] w-2/3 rounded-md" style={darkSkeletonStyle} />
        </div>

        <div className="space-y-[10px] px-[15px] py-[15px] min-[481px]:px-[30px]">
          {fieldLabelWidths.map((labelWidth, index) => (
            <FieldSkeleton key={`${labelWidth}-${index}`} labelWidth={labelWidth} />
          ))}

          <div className="pt-1">
            <Skeleton className="mx-auto h-[78px] w-full max-w-[304px] rounded-[4px]" />
          </div>

          <Skeleton className="mx-auto mt-[15px] h-[40px] w-full rounded-xl min-[481px]:w-[240px]" />

          <div className="space-y-2 pt-[10px]">
            <Skeleton className="mx-auto h-3 w-11/12 rounded-md" />
            <Skeleton className="mx-auto h-3 w-4/5 rounded-md" />
            <Skeleton className="mx-auto h-3 w-full rounded-md" />
            <Skeleton className="mx-auto h-3 w-3/4 rounded-md" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[16px] bg-white/70 backdrop-blur-xs">
        <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-(--brand-blue)" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-700">Loading roof estimation tool...</span>
        <span className="text-sm font-medium text-slate-500">(This may take a few seconds)</span>
      </div>
    </div>
  );
}

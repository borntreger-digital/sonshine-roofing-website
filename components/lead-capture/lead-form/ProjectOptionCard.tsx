import StaticImage from '@/components/media/StaticMediaProvider';
import type { LeadNavigationCard, ProjectOption } from '@/components/lead-capture/lead-form/config';

export const PROJECT_OPTION_CARD_BASE_CLASS =
  'group flex h-full flex-col justify-between rounded-xl border bg-white p-3 sm:p-4 text-left shadow-lg transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--brand-blue) focus-visible:ring-offset-2';
export const PROJECT_OPTION_CARD_UNSELECTED_CLASS =
  'border-blue-200 hover:-translate-y-0.5 hover:shadow-xl';
export const PROJECT_OPTION_CARD_SELECTED_CLASS = 'border-(--brand-blue) bg-blue-10 shadow-[0_10px_25px_rgba(15,76,129,0.12)]';

type ProjectOptionCardContentProps = {
  option: Pick<ProjectOption | LeadNavigationCard, 'label' | 'description' | 'imageSrc' | 'imageAlt' | 'eyebrow'>;
};

export function ProjectOptionCardContent({ option }: ProjectOptionCardContentProps) {
  const { label, description, imageSrc, eyebrow } = option;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-7/3 w-full overflow-hidden rounded-lg bg-slate-100">
        <StaticImage
          src={imageSrc}
          alt="" decorative crop
          fill
          sizes="(min-width: 1024px) 320px, 100vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--brand-blue)">
          {eyebrow}
        </p>
      ) : null}
      <h4 className="text-xl leading-none text-slate-800 md:text-2xl">{label}</h4>
      <p className="text-xs sm:text-sm text-slate-500">{description}</p>
    </div>
  );
}

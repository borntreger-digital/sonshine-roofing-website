'use client';

import { ArrowRight, CheckCircle2, Clock4, ExternalLink, ShieldCheck, Star } from 'lucide-react';
import { useMemo } from 'react';
import SmartLink from '@/components/utils/SmartLink';
import { Button } from '@/components/ui/button';
import type { SuccessMeta } from '@/lib/lead-capture/contact-lead';
import { getSuccessLinks } from '@/components/lead-capture/lead-form/config';
import { cn } from '@/lib/utils';
import type { LeadFormLayoutVariant } from './LeadForm';
import SitePhoneLink from '@/components/utils/SitePhoneLink';

type LeadFormSuccessProps = {
  successMeta: SuccessMeta;
  onReset: () => void;
  maxWidthClassName?: string;
  variant?: LeadFormLayoutVariant;
};

const INFO_BADGE_CLASS =
  'inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1';
const SUCCESS_LINK_CARD_CLASS =
  'group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-xs transition hover:-translate-y-0.5 hover:border-(--brand-blue) hover:shadow-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--brand-blue)';
const SUCCESS_LINK_ICON_WRAPPER_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--brand-blue)/10 text-(--brand-blue)';

export default function LeadFormSuccess({
  successMeta,
  onReset,
  maxWidthClassName = 'max-w-3xl',
  variant = 'default',
}: LeadFormSuccessProps) {
  const successLinks = useMemo(
    () => getSuccessLinks(successMeta.projectType),
    [successMeta.projectType],
  );
  const hasSharedDetails =
    Boolean(successMeta.roofAgeLabel) ||
    successMeta.helpTopicLabels.length > 0 ||
    Boolean(successMeta.roofTypeLabel) ||
    Boolean(successMeta.notes);
  const isHeroEmbedded = variant === 'heroEmbedded';

  const outerWrapperClassName = cn(
    'flex justify-center',
    isHeroEmbedded ? 'px-0' : 'px-4',
    variant === 'default' && 'mt-8',
  );
  const panelClassName = cn(
    'w-full mx-auto rounded-3xl p-8',
    isHeroEmbedded
      ? 'border border-white/15 bg-slate-950/72 text-white shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl'
      : 'border border-emerald-200 bg-white/95 shadow-md',
    maxWidthClassName,
  );
  const headingClassName = isHeroEmbedded
    ? 'mt-4 text-3xl font-semibold text-white'
    : 'mt-4 text-3xl font-semibold text-slate-900';
  const paragraphClassName = isHeroEmbedded
    ? 'mt-3 max-w-xl text-sm text-blue-50/85'
    : 'mt-3 max-w-xl text-sm text-slate-600';
  const detailsCardClassName = isHeroEmbedded
    ? 'mt-6 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left'
    : 'mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left';
  const detailsHeadingClassName = isHeroEmbedded
    ? 'text-sm font-semibold uppercase tracking-wide text-blue-100/80'
    : 'text-sm font-semibold uppercase tracking-wide text-slate-600';
  const bodyTextClassName = isHeroEmbedded ? 'text-sm text-blue-50/85' : 'text-sm text-slate-600';
  const labelTextClassName = isHeroEmbedded
    ? 'font-semibold text-white'
    : 'font-semibold text-slate-700';
  const infoBadgeClassName = cn(
    INFO_BADGE_CLASS,
    isHeroEmbedded ? 'border-white/15 bg-white/5 text-blue-100' : 'text-slate-500',
  );
  const nextHeadingClassName = isHeroEmbedded
    ? 'text-lg font-semibold text-white'
    : 'text-lg font-semibold text-slate-900';

  return (
    <div className={outerWrapperClassName}>
      <div className={panelClassName}>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden="true" />
          <h3 className={headingClassName}>We’ve got it — thank you!</h3>
          <p className={paragraphClassName}>
            Your message is already on the way to our project support team. We’ll reach out shortly
            with next steps. If a storm is moving in or water is coming inside, call us right now at{' '}
            <SitePhoneLink className="font-semibold text-(--brand-blue)" />.
          </p>
          {hasSharedDetails && (
            <div className={detailsCardClassName}>
              <h4 className={detailsHeadingClassName}>What you shared</h4>
              {successMeta.roofAgeLabel && (
                <p className={cn('mt-3', bodyTextClassName)}>
                  <span className={labelTextClassName}>Roof age:</span> {successMeta.roofAgeLabel}
                </p>
              )}
              {successMeta.helpTopicLabels.length ? (
                <div className="mt-3">
                  <p className={cn('text-sm', labelTextClassName)}>Your priorities:</p>
                  <ul
                    className={cn(
                      'mt-2 list-disc space-y-1 pl-5 text-sm',
                      isHeroEmbedded ? 'text-blue-50/85' : 'text-slate-600',
                    )}
                  >
                    {successMeta.helpTopicLabels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {successMeta.roofTypeLabel && (
                <p className={cn('mt-3', bodyTextClassName)}>
                  <span className={labelTextClassName}>Roof type:</span> {successMeta.roofTypeLabel}
                </p>
              )}
              {successMeta.notes && (
                <div className="mt-3">
                  <p className={cn('text-sm', labelTextClassName)}>Notes:</p>
                  <p
                    className={cn(
                      'mt-2 whitespace-pre-line text-sm',
                      isHeroEmbedded ? 'text-blue-50/85' : 'text-slate-600',
                    )}
                  >
                    {successMeta.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className={infoBadgeClassName}>
              <ShieldCheck className="h-4 w-4 text-(--brand-blue)" aria-hidden="true" /> Licensed
              &amp; insured
            </span>
            <span className={infoBadgeClassName}>
              <Clock4 className="h-4 w-4 text-(--brand-blue)" aria-hidden="true" /> Typical response
              under 30 minutes
            </span>
            <span className={infoBadgeClassName}>
              <Star className="h-4 w-4 text-amber-500" aria-hidden="true" /> 4.8 rating on Google
            </span>
          </div>
        </div>
        {successLinks.length > 0 && (
          <div className="not-prose mt-10">
            <h4 className={nextHeadingClassName}>What to do next</h4>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {successLinks.map(({ label, description, href, external, icon: Icon }) => (
                <SmartLink
                  key={`${label}-${href}`}
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className={SUCCESS_LINK_CARD_CLASS}
                >
                  <div className="flex gap-3">
                    <span className={SUCCESS_LINK_ICON_WRAPPER_CLASS}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                      <p className="mt-1 text-xs text-slate-500">{description}</p>
                    </div>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-(--brand-blue)">
                    {external ? 'Open link' : 'Continue'}
                    {external ? (
                      <ExternalLink
                        className="h-4 w-4 text-(--brand-blue) transition group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <ArrowRight
                        className="h-4 w-4 text-(--brand-blue) transition group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </SmartLink>
              ))}
            </div>
          </div>
        )}
        <div className="mt-10 flex justify-center">
          <Button type="button" variant="brandBlue" onClick={onReset}>
            Start a new request
          </Button>
        </div>
      </div>
    </div>
  );
}

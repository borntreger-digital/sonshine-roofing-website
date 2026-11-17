'use client';

import { useEffect, useMemo } from 'react';
import { useHydrated } from '@/lib/ui/use-hydrated';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import SmartLink from '@/components/utils/SmartLink';
import {
  fireAdsLeadSubmitOnce,
  readThankYouContext,
  buildAdsLeadDataLayerEvent,
  type ThankYouLeadContext,
} from '@/lib/lead-capture/thank-you';

function getLeadId(searchParams: URLSearchParams | null): string | null {
  return searchParams?.get('sri_lead_id') || searchParams?.get('lead_id') || null;
}

function getHeading(context: ThankYouLeadContext | null): string {
  const landing = getLandingConfirmation(context);
  if (landing) return landing.heading;
  switch (context?.formType) {
    case 'referral':
      return 'Referral received';
    case 'feedback':
      return 'Thanks for telling us';
    case 'financing-calculator':
      return 'Your financing request is in';
    case 'special-offer':
      return 'Your coupon is on the way';
    default:
      return 'Thank you';
  }
}

function getMessage(context: ThankYouLeadContext | null): string {
  const landing = getLandingConfirmation(context);
  if (landing) return landing.message;
  switch (context?.formType) {
    case 'referral':
      return 'We received your referral and will follow up about the roof replacement project.';
    case 'feedback':
      return 'We read every note and will reach out if we need more details.';
    case 'financing-calculator':
      return 'We received your financing information. You can return to the calculator while our team reviews your request.';
    case 'special-offer':
      return 'Check your inbox for an email from SonShine Roofing with your coupon code and offer details. If you don’t see it, check your spam or promotions folder.';
    default:
      return 'We received your request. Our team will follow up shortly.';
  }
}

function getLandingConfirmation(context: ThankYouLeadContext | null) {
  if (context?.formType !== 'contact-lead') return null;
  const response = "We'll contact you within 30 minutes during business hours, or the next business day after hours.";
  switch (context.source.page) {
    case '/landing/roof-replacement':
      return { heading: 'Your replacement estimate request is in', message: `We received your request for a free roof replacement estimate. ${response}` };
    case '/landing/roof-repair':
      return { heading: 'Your repair estimate request is in', message: `We received your request for a free roof repair estimate. ${response}` };
    case '/landing/financing':
      return { heading: 'Your estimate and financing request is in', message: `We received your request for a free roof replacement estimate and information about financing options. ${response} This request is not a credit application or financing approval.` };
    default:
      return null;
  }
}

export default function ThankYouClient() {
  const searchParams = useSearchParams();
  const leadId = getLeadId(searchParams);
  const hydrated = useHydrated();
  const context = useMemo(() => hydrated ? readThankYouContext(leadId) : null, [leadId, hydrated]);
  const debugEvent = context ? buildAdsLeadDataLayerEvent(context) : null;

  useEffect(() => {
    if (!context) return;
    fireAdsLeadSubmitOnce(context);
  }, [context]);

  return (
    <section className="container-edge mx-auto max-w-3xl py-16">
      <div className="rounded-xl border border-emerald-200 bg-white p-8 shadow-xs">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">{getHeading(context)}</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{getMessage(context)}</p>

        {context?.formType === 'special-offer' ? (
          <p className="mt-3 text-base leading-7 text-slate-600">Our team will also follow up about your roofing project.</p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <SmartLink href="/" className="btn btn-brand-blue btn-md justify-center">
            Return Home
          </SmartLink>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-600">
          <ShieldCheck className="h-5 w-5 shrink-0 text-(--brand-blue)" aria-hidden="true" />
          <span>Licensed and insured since 1987. We typically respond quickly during business hours.</span>
        </div>

        {process.env.NODE_ENV !== 'production' && debugEvent ? (
          <pre className="mt-6 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(debugEvent, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}

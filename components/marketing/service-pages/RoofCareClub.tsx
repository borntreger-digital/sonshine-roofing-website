'use client';

import { useMemo, useState } from 'react';
import { Accordion } from '@/components/ui/Accordion';
import SmartLink from '@/components/utils/SmartLink';
import { JsonLd } from '@/lib/seo/json-ld';
import { serviceSchema } from '@/lib/seo/schema';
import { SITE_ORIGIN } from '@/lib/seo/site';
import { ArrowLeftRight, ArrowUpRight, CircleCheck, Smartphone } from 'lucide-react';
import { useSiteSettings } from '@/lib/content/site-settings-context';

// -----------------------------
// Types & Data
// -----------------------------

type Term = 1 | 2 | 3;

type Benefit = {
  id: string;
  label: string;
  why?: string; // short helpful explainer
};

type TermPlan = {
  term: Term;
  annual: number;
  total: number;
  repairDiscount: number;
  inspectionDiscount: number;
};

const BENEFITS: Benefit[] = [
  {
    id: 'annual-checkup',
    label: 'One complimentary Tip Top Roof Check-up per year',
    why: 'Annual inspections catch early warning signs and help extend the life of your roof.',
  },
  {
    id: 'inspection-checklist',
    label: 'Standardized inspection checklist',
    why: 'A consistent checklist keeps each visit thorough and comparable year over year.',
  },
  {
    id: 'photo-docs',
    label: 'Photo documentation stored in your customer record',
    why: 'Visual records help track changes and support insurance documentation.',
  },
  {
    id: 'maintenance-notes',
    label: 'Maintenance notes for planning and insurance reference',
    why: 'Clear notes make upkeep decisions easier and keep records claim-ready.',
  },
  {
    id: 'giftable-inspection',
    label: 'One complimentary giftable roof inspection per year',
    why: 'Use for family, neighbors, or friends to create referral opportunities without pressure.',
  },
];

const TERM_PLANS: TermPlan[] = [
  {
    term: 1,
    annual: 189,
    total: 189,
    repairDiscount: 0,
    inspectionDiscount: 0,
  },
  {
    term: 2,
    annual: 179,
    total: 358,
    repairDiscount: 5,
    inspectionDiscount: 50,
  },
  {
    term: 3,
    annual: 169,
    total: 507,
    repairDiscount: 10,
    inspectionDiscount: 100,
  },
];

const TERMS_URL = '/roof-maintenance/roof-care-club-terms-and-conditions';

// -----------------------------
// Helpers
// -----------------------------

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function savingsVsOneYear(plans: TermPlan[], term: Term) {
  if (term === 1) return null;
  const base = plans.find((plan) => plan.term === 1);
  const chosen = plans.find((plan) => plan.term === term);
  if (!base || !chosen) return null;
  const baseline = base.annual * term;
  const saved = baseline - chosen.total;
  const pct = saved > 0 ? Math.round((saved / baseline) * 100) : 0;
  return { saved, pct };
}

function formatDiscount(value: number) {
  if (value === 0) return 'No discount';
  if (value === 100) return 'Free';
  return `${value}% off`;
}

// -----------------------------
// Component
// -----------------------------

type RoofCareClubProps = {
  origin?: string;
};

export default function RoofCareClub({ origin }: RoofCareClubProps = {}) {
  const { phone, phoneHref } = useSiteSettings();
  // Default term: 3 years
  const [term, setTerm] = useState<Term>(3);

  const resolvedOrigin = origin ?? SITE_ORIGIN;

  const providerId = `${resolvedOrigin}/#roofingcontractor`;

  const offerItems = useMemo(
    () =>
      TERM_PLANS.map((plan) => ({
        '@type': 'Offer' as const,
        name: `Roof Care Club - ${plan.term}-Year Membership`,
        category: 'Roof Care Club Membership',
        price: plan.total,
        priceCurrency: 'USD',
        offeredBy: { '@id': providerId },
        itemOffered: { '@type': 'Service', name: 'Roof Maintenance (Membership)' },
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: 'Included future annual inspections',
            value: `${plan.term}`,
          },
          { '@type': 'PropertyValue', name: 'Annual price', value: plan.annual },
          { '@type': 'PropertyValue', name: 'Total price', value: plan.total },
        ],
      })),
    [providerId],
  );

  const serviceLd = useMemo(
    () =>
      serviceSchema({
        name: 'Roof Care Club',
        description:
          'Membership maintenance plan with scheduled inspections, discounts, and member benefits.',
        url: '/roof-maintenance',
        origin: resolvedOrigin,
        provider: providerId,
        areaServed: ['Sarasota County, FL', 'Manatee County, FL', 'Charlotte County, FL'],
        offers: offerItems,
        serviceType: 'Roof Maintenance',
        id: `${resolvedOrigin}/#roof-care-club`,
      }),
    [offerItems, providerId, resolvedOrigin],
  );

  return (
    <div aria-labelledby="roof-care-club" className="mt-2 mb-12 not-prose" id="roof-care-club">
      <JsonLd data={serviceLd} />
      {/* Cards */}
      <div className="not-prose max-w-4xl mx-auto">
        {(() => {
          const selected = TERM_PLANS.find((plan) => plan.term === term) ?? TERM_PLANS[0];
          const savings = savingsVsOneYear(TERM_PLANS, term);
          return (
            <div className="relative flex flex-col overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xs z-0">
              {/* Header */}
              <div className="not-prose px-6 py-5 bg-[#0045d7] text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="justify-center text-center sm:text-left sm:justify-start mx-auto sm:mx-0">
                    <h3 className="text-3xl md:text-4xl font-semibold leading-tight text-white">
                      The Roof Care Club
                    </h3>
                    <p className="italic justify-center md:justify-start mx-auto md:mx-0 leading-tight text-slate-200 align-middle">
                      The Proactive Side of Home-Ownership
                    </p>
                  </div>
                  {/* Toggles */}
                  <div className="flex flex-col mx-auto md:mx-0 items-center gap-3">
                    <p className="uppercase font-semibold text-slate-200 text-sm md:text-lg">
                      Select Term
                      <ArrowLeftRight className="inline ml-2 text-white h-4 md:h-5 w-4 md:w-5" />
                    </p>

                    {/* Duration */}
                    <div className="inline-flex justify-center overflow-hidden rounded-lg bg-cyan-50 shadow-xs">
                      {[1, 2, 3].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTerm(t as Term)}
                          aria-pressed={term === t}
                          className={[
                            'px-4 py-1.5 text-sm md:text-lg transition duration-300',
                            term === t
                              ? 'bg-(--brand-orange) text-white font-semibold'
                              : 'hover:bg-[#fb9216]/20 font-semibold text-slate-800',
                          ].join(' ')}
                        >
                          {t}-year
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="px-6 pt-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-4xl font-semibold tracking-tight">
                        {currency(selected.annual)}/yr
                      </span>
                      <span className="text-slate-500 text-lg">
                        {currency(selected.total)} total for {selected.term} future annual inspection
                        {selected.term > 1 ? 's' : ''}
                      </span>
                    </div>
                    {term > 1 && savings && savings.saved > 0 && (
                      <div className="mt-1 text-emerald-600">
                        Save {currency(savings.saved)} ({savings.pct}%) versus renewing annually
                      </div>
                    )}
                  </div>
                </div>
                <SmartLink className="phone-affordance mt-4 w-full not-prose" href={phoneHref}>
                  <div className="btn btn-md btn-brand-blue w-full">
                    <Smartphone className="phone-affordance-icon inline h-4 w-4 mr-2" />
                    Call {phone}
                  </div>
                </SmartLink>
                <p className="mt-3 text-sm text-slate-500">
                  Billed upfront. Membership applies to one property.{' '}
                  <SmartLink data-icon-affordance="up-right" href={TERMS_URL}>
                    See terms
                    <ArrowUpRight className="icon-affordance inline h-3 w-3 ml-1" />
                  </SmartLink>
                </p>
              </div>

              {/* Benefits */}
              <div className="mt-6 border-t border-slate-200 px-6 pt-5">
                <h4 className="text-lg font-semibold uppercase tracking-wide text-slate-700">
                  Included with every membership
                </h4>
                <ul className="mt-3 space-y-3 list-none">
                  {BENEFITS.map((benefit) => (
                    <li key={benefit.id}>
                      <Accordion
                        summary={
                          <h5 className="text-lg">
                            <CircleCheck className="inline mr-2 text-green-600 h-5 w-5" />
                            {benefit.label}
                          </h5>
                        }
                        radius="xl"
                        tone="soft"
                        size="md"
                        proseBody={false}
                      >
                        {benefit.why ? (
                          <div className="m-0">
                            <span className="font-semibold text-slate-700">Why it matters: </span>
                            {benefit.why}
                          </div>
                        ) : null}
                      </Accordion>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Discounts */}
              <div className="my-6 border-t border-slate-200 px-6 pt-5">
                <h4 className="text-lg font-semibold uppercase tracking-wide text-slate-700">
                  Term-based discounts
                </h4>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 text-lg">
                  <div className="grid grid-cols-3 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <div className="px-3 py-2">Term</div>
                    <div className="px-3 py-2">Repair discount</div>
                    <div className="px-3 py-2">Additional inspections</div>
                  </div>
                  {TERM_PLANS.map((plan) => (
                    <div
                      key={plan.term}
                      className={[
                        'grid grid-cols-3 border-t border-slate-200',
                        plan.term === term ? 'bg-blue-50' : 'bg-white',
                      ].join(' ')}
                    >
                      <div className="px-3 py-2">{plan.term}-year</div>
                      <div className="px-3 py-2">{formatDiscount(plan.repairDiscount)}</div>
                      <div className="px-3 py-2">{formatDiscount(plan.inspectionDiscount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

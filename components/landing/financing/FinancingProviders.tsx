import StaticImage from '@/components/media/StaticImage';
import { FINANCING_TERMS } from '@/components/marketing/financing/financing-programs';
import { Accordion } from '@/components/ui/Accordion';
import SmartLink from '@/components/utils/SmartLink';

const providers = [
  {
    name: 'Ygrene',
    logo: 'static:ygrene-logo',
    type: 'Property/lien-based PACE Financing',
    borderClassName: 'from-(--brand-orange) to-amber-400',
    tintClassName: 'bg-orange-50',
    description:
      'Eligible roof improvements can be financed through a voluntary property-tax assessment.',
    figuresLabel: 'Current provider illustration and payment timing',
    figures: [
      { value: FINANCING_TERMS.ygrene.rateLabel, label: 'Illustrative fixed interest rate' },
      { value: `Up to ${FINANCING_TERMS.ygrene.maxFirstPaymentDelayMonths} months`, label: 'Before the first payment, based on funding date' },
    ],
    terms: FINANCING_TERMS.ygrene.disclosure,
    points: [
      'Repayment is collected with your property taxes. If you use mortgage escrow, the assessment can increase that payment.',
      'Your property secures the financing through a first-priority lien, ahead of a mortgage.',
      'Eligibility depends on your property location, home equity, ability to repay and other provider requirements. Ygrene uses a soft credit inquiry.',
    ],
    eligibility: FINANCING_TERMS.ygrene.eligibility,
    source: 'https://ygrene.com/how-it-works/',
    sourceLabel: 'How Ygrene financing works',
    cta: 'Ask SonShine about Ygrene',
  },
  {
    name: 'Service Finance',
    logo: 'static:service-finance-logo',
    type: 'Home Improvement Credit-based Financing',
    borderClassName: 'from-(--brand-cyan) to-sky-400',
    tintClassName: 'bg-cyan-50',
    description:
      'Roofing financing is offered through participating contractors for a fixed financed amount and term.',
    figuresLabel: 'Program examples advertised by SonShine',
    figures: [
      { value: `0% for ${FINANCING_TERMS.serviceFinance.promotionMonths} months`, label: 'Promotional program, subject to availability' },
      { value: `From ${FINANCING_TERMS.serviceFinance.rateLabel} fixed`, label: 'Fixed-rate program, subject to approval' },
    ],
    terms: FINANCING_TERMS.serviceFinance.disclosure,
    points: [
      'Repay the loan through installments under the agreement you choose.',
      'Available programs and terms are provided through the contractor. Review the financing documents for costs, payment terms and any security requirements.',
      'Financing requires a separate application and lender approval. Your available options depend on the provider’s requirements.',
    ],
    eligibility: FINANCING_TERMS.serviceFinance.eligibility,
    source: 'https://www.svcfin.com/faqs',
    sourceLabel: 'Service Finance program information',
    cta: 'Ask SonShine about Service Finance',
  },
] as const;

export default function FinancingProviders() {
  return (
    <>
      <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600">
        We can explain the next steps for either provider after
        learning about your roof. The provider determines eligibility, approval and financing terms.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        {providers.map((provider) => (
          <article
            key={provider.name}
            className={`min-w-0 rounded-xl bg-linear-to-r p-[2px] shadow-xs ${provider.borderClassName}`}
          >
            <div className="flex h-full flex-col rounded-xl bg-white">
              <div className={`rounded-t-xl p-6 md:px-8 ${provider.tintClassName}`}>
                <div className="mb-6 flex h-16 items-center">
                  <StaticImage
                    src={provider.logo}
                    alt={`${provider.name} logo`}
                    width={240}
                    height={64}
                    sizes="240px"
                    className="h-16 w-auto max-w-full object-contain object-left"
                  />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">{provider.name}</h3>
                <p className="mt-2 font-semibold text-(--brand-blue)">{provider.type}</p>
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-8">
                <p className="leading-relaxed text-slate-600">{provider.description}</p>
                <div className={`mt-5 rounded-xl p-4 ${provider.tintClassName}`}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {provider.figuresLabel}
                  </p>
                  <dl className="grid grid-cols-2 gap-4">
                    {provider.figures.map((figure) => (
                      <div key={figure.label} className="flex min-w-0 flex-col">
                        <dt className="mt-2 text-sm leading-snug text-slate-700">{figure.label}</dt>
                        <dd className="order-first text-2xl font-bold leading-tight text-slate-900">
                          {figure.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{provider.terms}</p>
                <ul className="mt-5 list-disc space-y-3 pl-5 leading-relaxed text-slate-700">
                  {provider.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Accordion
                  summary="How eligibility works"
                  className="mt-5 border-slate-300"
                  size="sm"
                  tone="medium"
                  radius="xl"
                  proseBody={false}
                  summaryClassName="text-sm font-medium text-slate-900"
                  chevronClassName="h-4 w-4 text-slate-500"
                >
                  <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                    {provider.eligibility.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                </Accordion>
                <div className="mt-auto pt-6">
                  <SmartLink
                    href={provider.source}
                    className="text-sm text-(--brand-blue) underline underline-offset-4"
                    showExternalIcon
                  >
                    {provider.sourceLabel}
                  </SmartLink>
                  <SmartLink
                    href="#book-an-appointment"
                    className="btn btn-brand-blue mt-6 min-h-12 w-full whitespace-normal px-4 py-3 text-center text-base"
                    proseGuard
                  >
                    {provider.cta}
                  </SmartLink>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-slate-600">
        Availability and terms vary. Compare the full cost, payment schedule and obligations before
        signing. Requesting an estimate here does not submit a financing application or authorize a
        credit inquiry.
      </p>
    </>
  );
}

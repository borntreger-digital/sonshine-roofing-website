import SmartLink from "@/components/utils/SmartLink";
import { ListChecks, ListOrdered, HelpCircle, Smartphone, Percent, CheckCircle, ArrowLeftRight, ChevronRight, DollarSign, ArrowRight } from "lucide-react";
import ProgramCard from '@/components/marketing/financing/ProgramCard';
import { FINANCING_TERMS, monthlyPayment } from '@/components/marketing/financing/financing-programs';
import MonthlyEstimator from '@/components/lead-capture/financing/MonthlyEstimator';
import type { Metadata } from 'next';
import { Suspense } from "react";
import StaticImage from "@/components/media/StaticImage";
import FaqInlineList from "@/components/dynamic-content/faq/FaqInlineList";
import { listFaqs } from "@/lib/content/directus-faqs";
import { getWebsitePageMetadata } from "@/lib/content/directus-site";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbSchema, serviceSchema, webPageSchema } from "@/lib/seo/schema";
import { getServicePageConfig } from "@/lib/seo/service-pages";
import { SITE_ORIGIN } from "@/lib/seo/site";
import Hero from "@/components/ui/Hero";

const SERVICE_PATH = "/financing";
const SERVICE_CONFIG = getServicePageConfig(SERVICE_PATH);

export async function generateMetadata(): Promise<Metadata> {
  const config = SERVICE_CONFIG;

  if (!config) {
    return getWebsitePageMetadata({
      title: "Roof Financing | SonShine Roofing",
      description: "Roof financing options from SonShine Roofing.",
      path: SERVICE_PATH,
    });
  }

  return getWebsitePageMetadata({
    title: config.title,
    description: config.description,
    path: SERVICE_PATH,
    image: config.image,
  });
}

const h2 = 'mb-16 mt-24 text-3xl md:text-4xl text-center font-semibold text-slate-900';
const h2Icon = "inline mr-4 h-7 w-7 md:h-10 md:w-10 text-(--brand-blue)";
const h3 = 'text-xl md:text-2xl font-semibold text-slate-900 flex items-center';

const checkList = "flex items-start gap-2";
const checkIconYgrene = 'mt-0.5 h-4 w-4 text-(--brand-orange) flex-none';
const checkIconServiceFinance = 'mt-0.5 h-4 w-4 text-(--brand-cyan) flex-none';
// Icon style for section headings (fits me / expect / questions)
const sectionIcon = 'inline mr-2 h-5 w-5 text-(--brand-blue)';
const ctaSecondary = 'btn w-full btn-brand-blue btn-lg phone-affordance';

export default async function FinancingPage() {
  const faqs = await listFaqs({ pagePath: "/financing", limit: 8 }).catch(() => []);
  const origin = SITE_ORIGIN;
  const config = SERVICE_CONFIG;

  const breadcrumbsConfig =
    config?.breadcrumbs ?? [
      { name: "Home", path: "/" },
      { name: "Financing", path: SERVICE_PATH },
    ];

  const webPageLd = webPageSchema({
    name: config?.title ?? "Roof Financing",
    description: config?.description,
    url: SERVICE_PATH,
    origin,
    primaryImage: config?.image?.url ?? "/og-default.png?v=20260818",
    isPartOf: { "@type": "WebSite", name: "SonShine Roofing", url: origin },
  });

  const breadcrumbsLd = breadcrumbSchema(
    breadcrumbsConfig.map((crumb) => ({
      name: crumb.name,
      item: crumb.path,
    })),
    { origin },
  );

  const serviceLd = serviceSchema({
    name: "Flexible Roof Financing | Free Monthly Payment Estimator",
    description:
      config?.description ??
      "Get flexible roof financing with clear, no-nonsense numbers. After taking a short quiz, use our free roof financing monthly payment calculator to estimate costs, compare options, and finance your roof replacement or roof repair with confidence.",
    url: SERVICE_PATH,
    origin,
    provider: {
      "@type": "Organization",
      name: "SonShine Roofing",
      url: origin,
      logo: { "@type": "ImageObject", url: `${origin}/icon.png` },
    },
    areaServed: [
      "Sarasota County, FL",
      "Manatee County, FL",
      "Charlotte County, FL",
    ],
    offers: [
      { "@type": "Offer", name: "YGrene (PACE, equity‑based)", url: "https://prequalification.ygrene.com/ContractorApply/XYFMHC" },
      { "@type": "Offer", name: "Service Finance (credit‑based)", url: SERVICE_PATH },
    ],
    serviceType: "Roof Financing",
  });
  // The same amortization calculation drives the estimator and these examples.
  const currency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const monthlyCurrency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ratePercent = (rate: number) => (rate * 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const { ygrene, serviceFinance } = FINANCING_TERMS;
  const defaultAmount = 15000;
  const exampleTermMonths = 180;
  const sampleMonthlyService = monthlyCurrency(monthlyPayment(defaultAmount, serviceFinance.annualInterestRate, exampleTermMonths));
  const sampleMonthlyYgrene = monthlyCurrency(monthlyPayment(defaultAmount, ygrene.annualInterestRate, exampleTermMonths));
  const per10kService = monthlyCurrency(monthlyPayment(10000, serviceFinance.annualInterestRate, exampleTermMonths));
  const per10kYgrene = monthlyCurrency(monthlyPayment(10000, ygrene.annualInterestRate, exampleTermMonths));

  return (
    <>
      <Hero
        title="Roof Financing Made Simple"
        subtitle="Explore roof financing options for your needs and budget. Compare property-based PACE financing with credit-based installment programs, each subject to provider approval. Our roofing specialists can explain the next steps after learning about your project."
        badges={[
          { icon: CheckCircle, label: "Free Roof Estimate" },
          { icon: Percent, label: "Equity-based Options" },
          { icon: DollarSign, label: "Credit-based Options" },
        ]}
        imageSrc="static:financing-options-couple-wide"
      >
        <div className="flex justify-center gap-6 flex-wrap mx-auto max-w-3xl">
          <div>
            <p className="italic text-sm text-slate-300">Advertised promotional example</p>
            <p className="text-blue-400 mt-2 text-4xl">0%</p>
            <p className="mt-1 text-slate-200">for {serviceFinance.promotionMonths} months, if available</p>
          </div>
          <div>
            <p className="italic text-sm text-slate-300">Illustrative fixed-rate payment</p>
            <p className="text-blue-400 mt-2 text-4xl">{per10kService}<span className="text-2xl">/mo</span></p>
            <p className="mt-1 text-slate-200">per $10,000 at {ratePercent(serviceFinance.annualInterestRate)}% interest for 15 years</p>
          </div>
        </div>
        <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-relaxed text-slate-300">
          These are separate program examples, not financing offers. Availability and approval vary.
          The payment example excludes fees and interest accrued during any deferral. Confirm the
          actual APR, total cost and promotional conditions in your financing documents.
        </p>
      </Hero>

      <section className="mx-auto max-w-8xl">
        <div className="container-edge py-10 md:py-16">
          <h2 id="get-started" className='mb-4 mt-6 text-3xl md:text-4xl text-center font-semibold text-slate-900'>
            Free <span className="text-(--brand-blue)">Roof Financing</span> Monthly Payment Estimator
          </h2>
          <p className="text-center mx-auto max-w-3xl text-slate-600 mb-8 text-sm md:text-base">Get flexible roof financing with clear, no-nonsense numbers. After taking a short quiz, use our free roof financing monthly payment calculator to estimate costs, compare options, and finance your roof replacement or roof repair with confidence.</p>
          <Suspense
            fallback={
              <div className="rounded-xl border border-blue-100 bg-white/90 p-6 text-center text-sm text-slate-600 shadow-xs">
                Loading estimator...
              </div>
            }
          >
            <MonthlyEstimator />
          </Suspense>

          {/* Two programs (plan cards) */}
          <h2 className={h2} id="pick-a-plan">
            <ArrowLeftRight className={h2Icon} />
            Choose a Roof Financing Plan
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgramCard
              id="ygrene-program-card"
              theme="orange"
              title="YGrene PACE Financing (Equity‑based)"
              subtitle="House‑secured. Payments typically included in your property‑tax bill."
              logoUrl="static:ygrene-logo"
              chips={["Soft credit inquiry", "Tax‑bill payments", "Equity and income reviewed"]}
              keyFigures={[`${ygrene.rateLabel} interest-rate illustration`, `Up to ${ygrene.maxFirstPaymentDelayMonths} months before first payment`, `${per10kYgrene}/mo per $10k example`]}
              sampleMonthly={`${sampleMonthlyYgrene}/mo on ${currency(defaultAmount)} at ${ratePercent(ygrene.annualInterestRate)}% interest for 15 years, before fees and deferral interest`}
              bullets={[
                "Fixed rate throughout the term",
                "Repaid through property taxes; mortgage escrow payments may increase",
                "Interest accrues after funding, including before payments begin",
                "Secured by a first-priority property lien, ahead of a mortgage",
              ]}
              eligibility={[...ygrene.eligibility]}
              finePrint={`${ygrene.disclosure} Payment examples use 180 monthly payments and exclude fees and interest accrued before payments begin. PACE repayment is collected with property taxes; this monthly equivalent is not a billing schedule or approval guarantee.`}
              eyelash="Takes you to Ygrene.com"
              cta={{ href: "https://prequalification.ygrene.com/ContractorApply/XYFMHC", label: "Get pre-approved", title: "Ask about YGrene", className: "btn-brand-blue" }}
            />

            <ProgramCard
              id="service-finance-program-card"
              theme="cyan"
              title="Service Finance (Credit‑based)"
              subtitle="Installment financing for a fixed amount and term, subject to a separate application and lender approval."
              logoUrl="static:service-finance-logo"
              chips={["Installment loan", "Fixed term", "Credit application"]}
              keyFigures={[`Advertised 0% for ${serviceFinance.promotionMonths} months, if available`, `${serviceFinance.rateLabel} fixed-rate example`, `${per10kService}/mo per $10k example`]}
              sampleMonthly={`${sampleMonthlyService}/mo on ${currency(defaultAmount)} at ${ratePercent(serviceFinance.annualInterestRate)}% interest for 15 years, before fees and deferral interest`}
              bullets={[
                "No-interest, deferred-interest and fixed-term programs may be available through the contractor",
                "Deferred-interest offers may charge accrued interest if their payoff conditions are not met",
                "Available rates, terms and any security requirements are defined in the financing documents",
                "Separate credit application and lender approval required",
              ]}
              eligibility={[...serviceFinance.eligibility]}
              finePrint={`${serviceFinance.disclosure} The 15-year payment illustration uses 180 monthly payments, excludes fees and deferral interest, and does not guarantee a rate, payment or approval.`}
              cta={{ href: "/contact-us", label: "Contact us for details", title: "Contact us for details", className: "btn-outline" }}
            />
          </div>

          {/* Comparison / how it works (custom panels with icons) */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Which option fits me? */}
            <section className="rounded-xl shadow-xs border border-blue-300 bg-white p-4">
              <h3 className={h3}>
                <ListChecks className={sectionIcon} aria-hidden="true" />
                Which option fits me?
              </h3>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-slate-700">
                <li>
                  <strong>Considering property-based financing?</strong> Ygrene reviews home equity,
                  income and payment history. Its soft credit inquiry does not affect your credit score.
                </li>
                <li>
                  <strong>Prefer an installment loan?</strong> Ask which Service Finance promotional
                  and fixed-term programs are currently available, then compare the full costs.
                </li>
                <li>
                  <strong>Need time before payments start?</strong> Ygrene states up to {ygrene.maxFirstPaymentDelayMonths} months,
                  depending on the funding date. Interest accrues after funding.
                </li>
              </ul>
            </section>

            {/* What&rsquo;s Next */}
            <section id="whats-next" className="rounded-xl border shadow-xs border-blue-300 bg-white p-4">
              <h3 className={h3}>
                <ListOrdered className={sectionIcon} aria-hidden="true" />
                What&rsquo;s next?
              </h3>
              <ol className="mt-3 list-decimal pl-5 space-y-2 text-slate-700">
                <li>
                  <SmartLink
                    href="#get-started"
                    className="text-(--brand-blue)"
                    data-icon-affordance="right"
                    proseGuard
                  >
                    Take our free Roof Financing Quiz to discover the ideal plan for you.
                    <ChevronRight className="icon-affordance h-4 w-4 inline ml-1 text-slate-600" />
                  </SmartLink>
                </li>
                <li>
                  <SmartLink
                    href="/contact-us#book-an-appointment"
                    className="text-(--brand-blue)"
                    data-icon-affordance="right"
                    proseGuard
                  >
                    Know what documents you&rsquo;ll need
                    <ChevronRight className="icon-affordance h-4 w-4 inline ml-1 text-slate-600" />
                  </SmartLink>
                </li>
                <li>We&rsquo;ll reach out same day or next (if after hours) and schedule a time to meet. Check your email after taking the quiz for additional personalized resources.</li>
              </ol>
            </section>

            {/* Questions? */}
            <section className="rounded-xl border shadow-xs border-blue-300 bg-white p-4 h-full flex flex-col">
              <h3 className={h3}>
                <HelpCircle className={sectionIcon} aria-hidden="true" />
                Questions?
              </h3>
              <p className="mt-3 text-slate-700 flex-1">
                Our team has helped Sarasota homeowners finance roofs for decades. We’ll walk you
                through monthly payments, timelines, and total costs — candidly and clearly. Just give us a call and we&rsquo;ll sort it out.
              </p>
              <div className="pt-2">
                <SmartLink
                  href="/contact-us"
                  className={ctaSecondary}
                  title="Call SonShine Roofing"
                  proseGuard
                  data-icon-affordance="right"
                >
                  <Smartphone className="phone-affordance-icon inline mr-2 h-4 w-4" />
                  Contact Us
                  <ArrowRight className="icon-affordance h-4 w-4 inline ml-2" />
                </SmartLink>
              </div>
            </section>
          </div>

          {/* Documents checklist (non-interactive) */}
          <h2 className={h2} id="docs">
            <ListChecks className={h2Icon} />
            Documents You&rsquo;ll Need
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section
              aria-labelledby="ygrene-docs"
              className="rounded-xl shadow-md border border-(--brand-orange) bg-white p-4">
              <div className="flex justify-between">
                <h3
                  id="ygrene-docs"
                  className="text-xl font-semibold text-slate-900">YGrene PACE Financing (Equity‑based)
                </h3>
                <StaticImage
                  src="static:ygrene-logo"
                  title="Ygrene Financing Logo"
                  alt="" decorative
                  className="h-6 w-auto opacity-70"
                  width={160}
                  height={48}
                />
              </div>
              <ul className="mt-3 space-y-2 text-slate-700">
                <li className={checkList}>
                  <CheckCircle className={checkIconYgrene} aria-hidden="true" />
                  <span>Driver’s license (all property owners)</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconYgrene} aria-hidden="true" />
                  <span>Property address &amp; parcel details</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconYgrene} aria-hidden="true" />
                  <span>Mortgage/escrow info (if applicable)</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconYgrene} aria-hidden="true" />
                  <span>Property-tax history showing taxes paid current for at least the past three years</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconYgrene} aria-hidden="true" />
                  <span>Confirmation of at least 10% home equity</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconYgrene} aria-hidden="true" />
                  <span>Household income information for the ability-to-repay review</span>
                </li>
              </ul>
            </section>

            <section
              aria-labelledby="service-docs"
              className="rounded-xl shadow-md border border-(--brand-cyan) bg-white p-4">
              <div className="flex justify-between">
                <h3
                  id="service-docs"
                  className="text-xl font-semibold text-slate-900"
                >
                  Service Finance (Credit‑based)
                </h3>
                <StaticImage
                  src="static:service-finance-logo"
                  title="Service Finance Logo"
                  alt="" decorative
                  className="h-8 w-auto opacity-70"
                  width={180}
                  height={64}
                />
              </div>
              <ul className="mt-3 space-y-2 text-slate-700">
                <li className={checkList}>
                  <CheckCircle className={checkIconServiceFinance} aria-hidden="true" />
                  <span>Driver’s license</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconServiceFinance} aria-hidden="true" />
                  <span>SSN (for credit application)</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconServiceFinance} aria-hidden="true" />
                  <span>Estimated project total</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconServiceFinance} aria-hidden="true" />
                  <span>Income / employment information for lender review</span>
                </li>
                <li className={checkList}>
                  <CheckCircle className={checkIconServiceFinance} aria-hidden="true" />
                  <span>Email + mobile for e‑docs</span>
                </li>
              </ul>
            </section>
          </div>

          {/* Compliance */}
          <p className="mt-10 text-sm leading-relaxed text-slate-600">
            SonShine Roofing is not a lender. Rates, terms, promotional availability and eligibility
            depend on the provider and may change. Ygrene availability also depends on your property
            and municipality. Examples exclude fees and interest accrued during deferral and do not
            guarantee approval. Before signing, review your actual APR, total cost, payment schedule,
            promotional payoff conditions and any property-security requirements in the financing documents.
          </p>

          <FaqInlineList
            heading="Financing FAQs"
            pagePath="/financing"
            limit={8}
            initialItems={faqs}
            seeMoreHref="/faq"
          />

          <JsonLd data={serviceLd} />
          <JsonLd data={breadcrumbsLd} />
          <JsonLd data={webPageLd} />
        </div>
      </section>
    </>
  );
}

export const revalidate = false;

export const dynamic = 'force-static';

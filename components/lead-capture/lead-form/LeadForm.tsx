'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteCookie } from '@/lib/telemetry/client-cookies';
import {
  DEFAULT_PREFERRED_CONTACT,
  LEAD_SUCCESS_COOKIE,
  buildContactLeadForwardPayload,
  buildContactLeadSuccessPayload,
  formatPhoneExample,
  mapLeadApiFieldErrors,
  persistLeadSuccessCookie,
  sanitizePhoneInput,
  submitLead,
  type SmsConsentFieldValue,
  validateContactIdentityDraft,
  validateSmsConsentDraft,
} from '@/lib/lead-capture/contact-lead';
import { useUtmParams } from '@/components/lead-capture/useUtmParams';
import { type LeadSuccessRestore } from '@/components/lead-capture/lead-form/config';
import { redirectToThankYou } from '@/lib/lead-capture/thank-you';
import LeadFormStepShell from '@/components/lead-capture/lead-form/LeadFormStepShell';
import LeadFormEnding from '@/components/lead-capture/shared/LeadFormEnding';
import { useLeadFormErrorFocus } from '@/components/lead-capture/shared/useLeadFormErrorFocus';
import { renderHighlight } from '@/components/utils/renderHighlight';
import { cn } from '@/lib/utils';
import { useSiteSettings } from '@/lib/content/site-settings-context';

const Turnstile = dynamic(() => import('@/components/lead-capture/Turnstile'), { ssr: false });
const LeadFormSuccess = dynamic(
  () => import('@/components/lead-capture/lead-form/LeadFormSuccess'),
  {
    ssr: false,
    loading: () => null,
  },
);

const INPUT_BASE_CLASS =
  'mt-2 w-full rounded-xl border border-blue-100 px-4 py-2 text-base shadow-lg focus:border-(--brand-blue) focus:ring-2 focus:ring-(--brand-orange)/30';
const HERO_INPUT_BASE_CLASS =
  'mt-2 w-full rounded-xl border border-white/12 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-none placeholder:text-slate-500 focus:border-(--brand-orange) focus:ring-4 focus:ring-(--brand-orange)/15';
const INPUT_ERROR_CLASS = 'border-red-300 focus:border-red-400 focus:ring-red-200';
const HERO_PANEL_CLASS =
  'mt-8 sm:mt-0 rounded-3xl border border-blue-100/50 bg-[#0045d7]/5 p-5 shadow-none ring-1 ring-white/5 backdrop-blur-xl sm:p-6';
const HERO_SMS_CLASS_NAMES = {
  root: 'space-y-5',
  cards: 'space-y-3',
  card: 'p-0 border-none bg-transparent',
  cardError: 'border-red-400/50',
  label: 'text-sm font-semibold leading-6 text-slate-300',
  options: 'mt-4 flex flex-wrap gap-3',
  optionLabel:
    'inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/4 px-4 py-2.5 text-slate-300 focus-within:ring-2 focus-within:ring-(--brand-orange)',
  optionLabelSelected: 'border-slate-200 bg-(--brand-orange) text-slate-200',
  radio: 'sr-only',
  optionText: 'text-sm font-semibold leading-none',
  optionTextSelected: 'text-slate-900',
  sharedDisclosure: 'text-xs leading-5 text-slate-400',
  error: 'mt-2 text-sm font-medium text-red-200',
  footer: 'border-none pt-0 text-sm text-blue-100/70',
  footerText: 'max-w-136 text-xs leading-6',
  footerLinks: 'mt-3 font-semibold text-slate-300',
  footerLink: 'transition hover:text-(--brand-cyan)',
} as const;

export type LeadFormLayoutVariant = 'default' | 'heroEmbedded' | 'heroOverlap';

type LeadFormProps = {
  restoredSuccess?: LeadSuccessRestore | null;
  variant?: LeadFormLayoutVariant;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';
type LeadFormTone = 'default' | 'hero';
type FormErrors = Record<string, string>;
type SetFormField = <K extends keyof FormState>(field: K, value: FormState[K]) => void;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsProjectConsent: SmsConsentFieldValue;
  smsMarketingConsent: SmsConsentFieldValue;
};

const INITIAL_STATE: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  smsProjectConsent: '',
  smsMarketingConsent: '',
};

type LeadFormAlertProps = {
  tone: LeadFormTone;
  message: string | null;
};

function LeadFormAlert({ tone, message }: LeadFormAlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      tabIndex={-1}
      className={
        tone === 'hero'
          ? 'mt-5 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100'
          : 'mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700'
      }
    >
      {message}
    </div>
  );
}

type LeadFormContactFieldsProps = {
  tone: LeadFormTone;
  form: FormState;
  errors: FormErrors;
  onFieldChange: SetFormField;
};

function LeadFormContactFields({ tone, form, errors, onFieldChange }: LeadFormContactFieldsProps) {
  const isHero = tone === 'hero';
  const labelClassName = isHero
    ? 'block text-sm font-semibold text-slate-300'
    : 'block font-medium text-slate-700';
  const phoneLabelClassName = isHero
    ? 'mt-4 block text-sm font-semibold text-slate-300'
    : 'mt-4 block font-medium text-slate-700';
  const inputClassName = isHero ? HERO_INPUT_BASE_CLASS : INPUT_BASE_CLASS;
  const errorClassName = isHero ? 'mt-1 text-xs text-red-200' : 'mt-1 text-xs text-red-600';

  const content = (
    <>
      <div className={isHero ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 md:grid-cols-2'}>
        <label className={labelClassName}>
          First Name*
          <input
            type="text"
            name="firstName"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            autoComplete="given-name"
            value={form.firstName}
            onChange={(event) => onFieldChange('firstName', event.target.value)}
            className={cn(inputClassName, errors.firstName && INPUT_ERROR_CLASS)}
            placeholder="First Name"
          />
          {errors.firstName ? <span id="firstName-error" className={errorClassName}>{errors.firstName}</span> : null}
        </label>

        <label className={labelClassName}>
          Last Name*
          <input
            type="text"
            name="lastName"
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => onFieldChange('lastName', event.target.value)}
            className={cn(inputClassName, errors.lastName && INPUT_ERROR_CLASS)}
            placeholder="Last Name"
          />
          {errors.lastName ? <span id="lastName-error" className={errorClassName}>{errors.lastName}</span> : null}
        </label>
      </div>

      <label className={phoneLabelClassName}>
        Email*
        <input
          type="email"
          name="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          autoComplete="email"
          value={form.email}
          onChange={(event) => onFieldChange('email', event.target.value)}
          className={cn(inputClassName, errors.email && INPUT_ERROR_CLASS)}
          placeholder="example@domain.com"
        />
        {errors.email ? <span id="email-error" className={errorClassName}>{errors.email}</span> : null}
      </label>

      <label className={phoneLabelClassName}>
        Phone Number*
        <input
          type="tel"
          name="phone"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
          autoComplete="tel"
          value={form.phone}
          onChange={(event) => onFieldChange('phone', sanitizePhoneInput(event.target.value))}
          className={cn(inputClassName, errors.phone && INPUT_ERROR_CLASS)}
          inputMode="tel"
          placeholder={`Example: ${formatPhoneExample(form.phone)}`}
        />
        {errors.phone ? <span id="phone-error" className={errorClassName}>{errors.phone}</span> : null}
      </label>
    </>
  );

  return isHero ? <div className="mt-6">{content}</div> : content;
}

type LeadFormTurnstileSectionProps = {
  tone: LeadFormTone;
  errors: FormErrors;
};

function LeadFormTurnstileSection({ tone, errors }: LeadFormTurnstileSectionProps) {
  return (
    <div>
      <Turnstile action="contact-lead" />
      {errors.cfToken ? (
        <p
          className={
            tone === 'hero'
              ? 'mt-2 text-sm font-medium text-red-200'
              : 'mt-2 text-sm font-medium text-red-600'
          }
        >
          {errors.cfToken}
        </p>
      ) : null}
    </div>
  );
}

type LeadFormSubmitSectionProps = {
  tone: LeadFormTone;
  status: Status;
};

function LeadFormSubmitSection({ tone, status }: LeadFormSubmitSectionProps) {
  const isSubmitting = status === 'submitting';

  if (tone === 'hero') {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          size="xl"
          variant="brandOrange"
          disabled={isSubmitting}
          className="w-full justify-center"
          data-icon-affordance="right"
        >
          {isSubmitting ? 'Sending…' : 'Submit'}
          {!isSubmitting ? (
            <ArrowRight className="ml-2 h-4 w-4 icon-affordance" aria-hidden="true" />
          ) : null}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button
        data-icon-affordance="right"
        type="submit"
        size="xl"
        variant="brandOrange"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending…' : 'Submit my free estimate request'}
        {!isSubmitting ? (
          <ArrowRight className="ml-2 h-4 w-4 icon-affordance" aria-hidden="true" />
        ) : null}
      </Button>
    </div>
  );
}

export default function LeadForm({ restoredSuccess, variant = 'default' }: LeadFormProps = {}) {
  const { phone, phoneHref } = useSiteSettings();
  const pathname = usePathname() || '/';
  const utm = useUtmParams();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { formRef, focusErrors } = useLeadFormErrorFocus();
  const [status, setStatus] = useState<Status>('idle');
  const [successMeta, setSuccessMeta] = useState(() => restoredSuccess?.meta ?? null);

  const isHeroEmbedded = variant === 'heroEmbedded';
  const formSpacingClassName = variant === 'heroOverlap' ? 'px-4' : 'px-4 py-16';
  const formHeading = 'Get a FREE Estimate';
  const renderedFormHeading = renderHighlight(formHeading, 'FREE', 'text-(--brand-cyan)');

  const setField: SetFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const handleResetSuccess = () => {
    deleteCookie(LEAD_SUCCESS_COOKIE);
    setSuccessMeta(null);
    setStatus('idle');
    setGlobalError(null);
    setErrors({});
    setForm(INITIAL_STATE);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;
    setErrors({});

    const identityErrors = validateContactIdentityDraft(
      {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
      },
      { emailRequired: true, phoneRequired: true },
    );
    const smsErrors = validateSmsConsentDraft({
      smsProjectConsent: form.smsProjectConsent,
      smsMarketingConsent: form.smsMarketingConsent,
    });
    const validation = { ...identityErrors, ...smsErrors };

    if (Object.keys(validation).length) {
      focusErrors();
      setErrors(validation);
      setGlobalError('Please complete the highlighted fields so we can follow up.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const cfToken = String(formData.get('cfToken') || '');
    const honeypot = String(formData.get('company') || '');

    if (!cfToken) {
      focusErrors();
      setErrors((prev) => ({ ...prev, cfToken: 'Verification required.' }));
      setGlobalError('Please complete the verification to continue.');
      return;
    }

    setStatus('submitting');
    setGlobalError(null);
    const payload = buildContactLeadForwardPayload({
      submittedAt: new Date().toISOString(),
      source: {
        page: pathname,
        utm_source: utm.source || undefined,
        utm_medium: utm.medium || undefined,
        utm_campaign: utm.campaign || undefined,
      },
      contact: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
      },
      smsConsent: {
        smsProjectConsent: form.smsProjectConsent,
        smsMarketingConsent: form.smsMarketingConsent,
      },
      preferredContact: DEFAULT_PREFERRED_CONTACT,
      formVariant: isHeroEmbedded ? 'heroEmbedded' : undefined,
      antiSpam: {
        cfToken,
        hp_field: honeypot || undefined,
      },
    });

    const result = await submitLead(payload, {
      gtmEvent: {
        event: 'lead_form_submitted',
        projectType: 'contact',
        helpTopics: '',
        intent: 'free-estimate',
      },
      metaPixelEvents: ['Lead', 'Contact'],
    });

    if (!result.ok) {
      focusErrors();
      if (process.env.NODE_ENV !== 'production') {
        console.error('Lead submission failed', result);
      }
      setStatus('error');
      setGlobalError(result.error || `We could not send your request. Please call us at ${phone}.`);
      if (result.fieldErrors) {
        const serverErrors = mapLeadApiFieldErrors(result.fieldErrors);
        if (Object.keys(serverErrors).length) {
          setErrors(serverErrors);
        }
      }
      return;
    }

    persistLeadSuccessCookie(buildContactLeadSuccessPayload({ projectType: 'contact' }));
    redirectToThankYou(payload);
  };

  if (status === 'success' && successMeta) {
    return (
      <LeadFormSuccess
        successMeta={successMeta}
        onReset={handleResetSuccess}
        maxWidthClassName="max-w-none"
        variant={variant}
      />
    );
  }

  if (isHeroEmbedded) {
    return (
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

        <div className={HERO_PANEL_CLASS}>
          <div>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-blue-50 sm:text-3xl">
              {renderedFormHeading}
            </h2>
            <p className="mt-1 max-w-lg leading-6 text-slate-300 text-lg">
              Tell us how to contact you and we&apos;ll reach out shortly.
            </p>
            <div className="mt-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
                  Need help right now?
                </p>
                <p className="mt-1 text-lg text-slate-300">
                  Call{' '}
                  <a href={phoneHref} className="font-semibold text-blue-200">
                    {phone}
                  </a>{' '}
                  to reach our office.
                </p>
              </div>
            </div>
          </div>

          <LeadFormAlert tone="hero" message={globalError} />
          <LeadFormContactFields tone="hero" form={form} errors={errors} onFieldChange={setField} />
          <LeadFormEnding
            className="mt-6"
            verification={<LeadFormTurnstileSection tone="hero" errors={errors} />}
            actions={<LeadFormSubmitSection tone="hero" status={status} />}
            consent={{
              classNames: HERO_SMS_CLASS_NAMES,
              disclosureMode: 'shared',
              smsProjectConsent: form.smsProjectConsent,
              smsMarketingConsent: form.smsMarketingConsent,
              onChange: (field, value) => setField(field, value),
              errors: {
                smsProjectConsent: errors.smsProjectConsent,
                smsMarketingConsent: errors.smsMarketingConsent,
              },
            }}
          />
        </div>
      </form>
    );
  }

  return (
    <div className={formSpacingClassName}>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

        <LeadFormStepShell
          stepLabel="Free Estimate"
          title={renderedFormHeading}
          description="FREE ESTIMATE"
          headerFooter={
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-white/70 px-4 py-4">
              <div>
                <p className="font-semibold text-slate-800">Need help right now?</p>
                <p className="mt-1 text-sm text-slate-600">
                  Call{' '}
                  <a href={phoneHref} className="font-semibold text-(--brand-blue)">
                    {phone}
                  </a>{' '}
                  if a storm is moving in or water is coming inside.
                </p>
              </div>
            </div>
          }
        >
          <LeadFormAlert tone="default" message={globalError} />
          <LeadFormContactFields
            tone="default"
            form={form}
            errors={errors}
            onFieldChange={setField}
          />
          <LeadFormEnding
            className="mt-6"
            verification={<LeadFormTurnstileSection tone="default" errors={errors} />}
            actions={<LeadFormSubmitSection tone="default" status={status} />}
            consent={{
              smsProjectConsent: form.smsProjectConsent,
              smsMarketingConsent: form.smsMarketingConsent,
              onChange: (field, value) => setField(field, value),
              errors: {
                smsProjectConsent: errors.smsProjectConsent,
                smsMarketingConsent: errors.smsMarketingConsent,
              },
            }}
          />
        </LeadFormStepShell>
      </form>
    </div>
  );
}

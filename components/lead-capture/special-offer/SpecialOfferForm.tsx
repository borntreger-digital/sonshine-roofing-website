'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Turnstile from '@/components/lead-capture/Turnstile';
import LeadFormEnding from '@/components/lead-capture/shared/LeadFormEnding';
import { useLeadFormErrorFocus } from '@/components/lead-capture/shared/useLeadFormErrorFocus';
import { Button } from '@/components/ui/button';
import {
  buildN8nLeadPayload,
  mapLeadApiFieldErrors,
  type SmsConsentFieldValue,
  validateSmsConsentDraft,
  sanitizePhoneInput,
  isUsPhoneComplete,
  formatPhoneExample,
  submitLead,
} from '@/lib/lead-capture/contact-lead';
import { redirectToThankYou } from '@/lib/lead-capture/thank-you';
import { endOfDay, parseSpecialOfferDate } from '@/lib/lead-capture/specialOfferDates';
import { cn } from '@/lib/utils';
import { pushToDataLayer } from '@/lib/telemetry/gtm';
import isExpired from '@/lib/lead-capture/isExpired';

type Props = {
  offerCode: string;
  offerSlug: string;
  offerTitle?: string | null;
  offerDiscount?: string | null;
  offerExpiration?: string | null;
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsProjectConsent: SmsConsentFieldValue;
  smsMarketingConsent: SmsConsentFieldValue;
};

type Submission = 'idle' | 'submitting' | 'error';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INPUT_BASE_CLASS =
  'mt-2 w-full rounded-lg border border-blue-100 px-4 py-2 text-base shadow-xs focus:border-(--brand-blue) focus:ring-2 focus:ring-(--brand-blue)/30';
const INPUT_ERROR_CLASS = 'border-red-300 focus:border-red-400 focus:ring-red-200';
const FIELD_ERROR_CLASS = 'mt-1 block text-xs text-red-600';

function parseExpirationDate(raw?: string | null): Date {
  const parsed = parseSpecialOfferDate(raw);
  if (parsed) {
    return endOfDay(parsed);
  }

  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() + 1);
  return fallback;
}

function writeOfferCookie(name: string, code: string, expiration?: string | null) {
  if (typeof document === 'undefined') return;
  const expiresDate = parseExpirationDate(expiration);
  const payload = { code, exp: expiresDate.toISOString() };
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(payload))}; expires=${expiresDate.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

function readOfferCookie(name: string): { code: string; exp?: string } | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  const rawValue = match.split('=').slice(1).join('=');
  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed.code !== 'string') return null;
    if (parsed.exp) {
      const expDate = new Date(parsed.exp);
      if (Number.isNaN(expDate.getTime()) || expDate.getTime() < Date.now()) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function SpecialOfferForm({
  offerCode,
  offerSlug,
  offerTitle,
  offerDiscount,
  offerExpiration,
}: Props) {
  const searchParams = useSearchParams();
  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    smsProjectConsent: '',
    smsMarketingConsent: '',
  });
  const [submission, setSubmission] = useState<Submission>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { formRef, focusErrors } = useLeadFormErrorFocus();
  const viewed = useRef(false);
  const started = useRef(false);

  const trackStart = () => {
    if (started.current) return;
    started.current = true;
    pushToDataLayer({ event: 'special_offer_form_start', offer_slug: offerSlug });
  };

  const reportError = (
    errorType: 'validation' | 'verification' | 'submission' | 'expired',
    errors: Record<string, string> = {},
  ) => {
    focusErrors();
    // Field names are an allowlist; messages and entered values never enter analytics.
    const errorFields = Object.keys(values).filter((field) => Object.hasOwn(errors, field));
    pushToDataLayer({
      event: 'special_offer_form_error',
      offer_slug: offerSlug,
      error_type: errorType,
      error_fields: errorFields,
    });
  };

  useEffect(() => {
    const form = formRef.current;
    if (!form || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (viewed.current || !entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.1)) return;
        viewed.current = true;
        pushToDataLayer({ event: 'special_offer_form_view', offer_slug: offerSlug });
        observer.disconnect();
      },
      { threshold: 0.1 },
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, [offerSlug, formRef]);

  const resetErrors = () => {
    setFieldErrors({});
    setGlobalError(null);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!values.firstName.trim()) next.firstName = 'Enter your first name';
    if (!values.lastName.trim()) next.lastName = 'Enter your last name';
    const email = values.email.trim();
    if (!email) {
      next.email = 'Enter your email address';
    } else if (!emailRegex.test(email)) {
      next.email = 'Enter a valid email (example@domain.com)';
    }
    const hasPhone = values.phone.trim().length > 0;
    if (!hasPhone) {
      next.phone = 'Enter your phone number';
    } else if (!isUsPhoneComplete(values.phone)) {
      next.phone = 'Enter a valid US phone number (10 digits).';
    }
    Object.assign(
      next,
      validateSmsConsentDraft({
        smsProjectConsent: values.smsProjectConsent,
        smsMarketingConsent: values.smsMarketingConsent,
      }),
    );
    return next;
  };

  const handleChange = (key: keyof FormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const nextValue = key === 'phone' ? sanitizePhoneInput(value) : value;
    setValues((prev) => ({ ...prev, [key]: nextValue }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const clone = { ...prev };
        delete clone[key];
        return clone;
      });
    }
    if (globalError) setGlobalError(null);
  };

  const cookieName = useMemo(() => `ss_offer_${offerSlug}`, [offerSlug]);

  useEffect(() => {
    const stored = readOfferCookie(cookieName);
    if (stored && stored.code === offerCode) {
      writeOfferCookie(cookieName, stored.code, offerExpiration);
    }
  }, [submission, cookieName, offerCode, offerExpiration]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submission === 'submitting') return;

    resetErrors();
    trackStart();
    if (isExpired(offerExpiration)) {
      reportError('expired');
      setGlobalError('This offer has expired. Please call our team for current roofing offers.');
      return;
    }
    const errors = validate();
    if (Object.keys(errors).length) {
      reportError('validation', errors);
      setFieldErrors(errors);
      setGlobalError('Please complete the highlighted fields.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const cfToken = String(formData.get('cfToken') || '');
    const honeypot = String(formData.get('company') || '');

    if (!cfToken) {
      reportError('verification');
      setGlobalError('Please complete the verification.');
      return;
    }

    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');

    const payload = buildN8nLeadPayload({
      formType: 'special-offer',
      submittedAt: new Date().toISOString(),
      source: {
        page: `/special-offers/${offerSlug}`,
        utm_source: utmSource?.trim() || undefined,
        utm_medium: utmMedium?.trim() || undefined,
        utm_campaign: utmCampaign?.trim() || undefined,
      },
      contact: {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
      },
      smsConsent: {
        smsProjectConsent: values.smsProjectConsent,
        smsMarketingConsent: values.smsMarketingConsent,
      },
      details: {
        offerCode,
        offerSlug,
        offerTitle: offerTitle ?? undefined,
        discount: offerDiscount ?? undefined,
      },
      antiSpam: {
        cfToken,
        hp_field: honeypot || undefined,
      },
    });

    setSubmission('submitting');

    const result = await submitLead(payload, {
      gtmEvent: {
        event: 'special_offer_claimed',
        offer_slug: offerSlug,
        offer_code: offerCode,
      },
      metaPixelEvents: 'Lead',
      contactReadyCookie: false,
    });

    if (!result.ok) {
      reportError(
        'submission',
        result.fieldErrors ? mapLeadApiFieldErrors(result.fieldErrors) : {},
      );
      setSubmission('error');
      setGlobalError(result.error || 'We could not send your request. Please try again.');
      if (result.fieldErrors) {
        const serverErrors = mapLeadApiFieldErrors(result.fieldErrors);
        if (Object.keys(serverErrors).length) {
          setFieldErrors(serverErrors);
        }
      }
      return;
    }

    setGlobalError(null);
    writeOfferCookie(cookieName, offerCode, offerExpiration);
    redirectToThankYou(payload);
  };

  return (
    <div className="not-prose rounded-xl border border-blue-100 bg-white p-6 shadow-xs print:hidden sm:p-8">
      <h2 className="text-2xl font-semibold text-slate-800">Redeem Offer</h2>
      <p className="mt-4 text-sm text-slate-600">
        Enter your details and we’ll email your coupon code and offer details. Our team will also
        follow up about your roofing project.
      </p>

      <form
        ref={formRef}
        className="mt-6 space-y-6"
        onChangeCapture={trackStart}
        onSubmit={handleSubmit}
        noValidate
      >
        <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="firstName">
            First name*
            <input
              id="firstName"
              name="firstName"
              required
              className={cn(INPUT_BASE_CLASS, fieldErrors.firstName && INPUT_ERROR_CLASS)}
              value={values.firstName}
              onChange={handleChange('firstName')}
              autoComplete="given-name"
              aria-invalid={Boolean(fieldErrors.firstName)}
              aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
            />
            {fieldErrors.firstName && (
              <span id="firstName-error" className={FIELD_ERROR_CLASS}>
                {fieldErrors.firstName}
              </span>
            )}
          </label>

          <label className="block text-sm font-medium text-slate-700" htmlFor="lastName">
            Last name*
            <input
              id="lastName"
              name="lastName"
              required
              className={cn(INPUT_BASE_CLASS, fieldErrors.lastName && INPUT_ERROR_CLASS)}
              value={values.lastName}
              onChange={handleChange('lastName')}
              autoComplete="family-name"
              aria-invalid={Boolean(fieldErrors.lastName)}
              aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
            />
            {fieldErrors.lastName && (
              <span id="lastName-error" className={FIELD_ERROR_CLASS}>
                {fieldErrors.lastName}
              </span>
            )}
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700" htmlFor="email">
          Email*
          <input
            id="email"
            name="email"
            required
            type="email"
            className={cn(INPUT_BASE_CLASS, fieldErrors.email && INPUT_ERROR_CLASS)}
            value={values.email}
            onChange={handleChange('email')}
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
          {fieldErrors.email && (
            <span id="email-error" className={FIELD_ERROR_CLASS}>
              {fieldErrors.email}
            </span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700" htmlFor="phone">
          Phone*
          <input
            id="phone"
            name="phone"
            required
            type="tel"
            inputMode="tel"
            className={cn(INPUT_BASE_CLASS, fieldErrors.phone && INPUT_ERROR_CLASS)}
            value={values.phone}
            onChange={handleChange('phone')}
            autoComplete="tel"
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? 'phone-help phone-error' : 'phone-help'}
          />
          {fieldErrors.phone && (
            <span id="phone-error" className={FIELD_ERROR_CLASS}>
              {fieldErrors.phone}
            </span>
          )}
          <p id="phone-help" className="mt-1 text-xs text-slate-500">
            US phone number for follow-up. Example: {formatPhoneExample(values.phone)}
          </p>
        </label>

        <LeadFormEnding
          verification={<Turnstile />}
          feedback={
            globalError && (
              <div
                role="alert"
                tabIndex={-1}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {globalError}
              </div>
            )
          }
          actions={
            <Button
              type="submit"
              variant="brandOrange"
              size="xl"
              className="w-full justify-center"
              data-icon-affordance="right"
              disabled={submission === 'submitting'}
            >
              {submission === 'submitting' ? 'Sending…' : 'Email Me My Coupon'}
              {submission !== 'submitting' ? (
                <ArrowRight className="icon-affordance ml-2 h-4 w-4" aria-hidden="true" />
              ) : null}
            </Button>
          }
          consent={{
            disclosureMode: 'shared',
            sectionIntro: 'Choose Yes or No for each option. You can receive your coupon with either choice.',
            smsProjectConsent: values.smsProjectConsent,
            smsMarketingConsent: values.smsMarketingConsent,
            onChange: (field, value) => {
              setValues((prev) => ({ ...prev, [field]: value }));
              if (fieldErrors[field]) {
                setFieldErrors((prev) => {
                  const clone = { ...prev };
                  delete clone[field];
                  return clone;
                });
              }
              if (globalError) setGlobalError(null);
            },
            errors: {
              smsProjectConsent: fieldErrors.smsProjectConsent,
              smsMarketingConsent: fieldErrors.smsMarketingConsent,
            },
          }}
        />
      </form>
    </div>
  );
}

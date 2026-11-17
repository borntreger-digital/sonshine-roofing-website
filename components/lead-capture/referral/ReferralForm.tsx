'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, Contact } from 'lucide-react';
import Turnstile from '@/components/lead-capture/Turnstile';
import { useUtmParams } from '@/components/lead-capture/useUtmParams';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CONTACT_LEAD_NOT_PROVIDED,
  buildN8nLeadPayload,
  formatPhoneExample,
  isUsPhoneComplete,
  isValidState,
  isValidZip,
  mapLeadApiFieldErrors,
  normalizePhoneForSubmit,
  normalizeState,
  normalizeZip,
  sanitizePhoneInput,
  submitLead,
  validateEmail,
} from '@/lib/lead-capture/contact-lead';
import { redirectToThankYou } from '@/lib/lead-capture/thank-you';

type Status = 'idle' | 'submitting' | 'success' | 'error';

type ReferralFormState = {
  referrerFirstName: string;
  referrerLastName: string;
  referrerEmail: string;
  referrerPhone: string;
  homeownerFirstName: string;
  homeownerLastName: string;
  homeownerPhone: string;
  homeownerAddress1: string;
  homeownerAddress2: string;
  homeownerCity: string;
  homeownerState: string;
  homeownerZip: string;
  notes: string;
};

const INITIAL_FORM: ReferralFormState = {
  referrerFirstName: '',
  referrerLastName: '',
  referrerEmail: '',
  referrerPhone: '',
  homeownerFirstName: '',
  homeownerLastName: '',
  homeownerPhone: '',
  homeownerAddress1: '',
  homeownerAddress2: '',
  homeownerCity: '',
  homeownerState: 'FL',
  homeownerZip: '',
  notes: '',
};

const INPUT_CLASS =
  'mt-2 w-full rounded-lg border border-blue-100 px-4 py-2 text-base shadow-xs focus:border-(--brand-blue) focus:ring-2 focus:ring-(--brand-blue)/30';
const INPUT_ERROR_CLASS = 'border-red-300 focus:border-red-400 focus:ring-red-200';
const SUCCESS_MESSAGE =
  'Thanks. We received your referral. Check your email for confirmation and details on how you can earn your reward';

function trim(value: string): string {
  return value.trim();
}

function hasAddressContext(form: ReferralFormState): boolean {
  const normalizedState = normalizeState(form.homeownerState);
  return Boolean(
    trim(form.homeownerAddress1) ||
      trim(form.homeownerAddress2) ||
      trim(form.homeownerCity) ||
      trim(form.homeownerZip) ||
      (normalizedState && normalizedState !== 'FL'),
  );
}

function buildReferredHomeownerDetails(form: ReferralFormState) {
  const addressContext = hasAddressContext(form);
  const address2 = trim(form.homeownerAddress2);
  const state = normalizeState(form.homeownerState);
  const zip = normalizeZip(form.homeownerZip);

  return {
    firstName: trim(form.homeownerFirstName),
    lastName: trim(form.homeownerLastName),
    phone: normalizePhoneForSubmit(form.homeownerPhone),
    address1: trim(form.homeownerAddress1) || CONTACT_LEAD_NOT_PROVIDED,
    ...(address2 ? { address2 } : {}),
    city: trim(form.homeownerCity) || CONTACT_LEAD_NOT_PROVIDED,
    state: addressContext ? state || CONTACT_LEAD_NOT_PROVIDED : CONTACT_LEAD_NOT_PROVIDED,
    zip: zip || CONTACT_LEAD_NOT_PROVIDED,
  };
}

function mapReferralServerErrors(fieldErrors?: Record<string, string[]>): Record<string, string> {
  const mapped = mapLeadApiFieldErrors(fieldErrors);
  const next: Record<string, string> = {};

  for (const [key, message] of Object.entries(mapped)) {
    if (key === 'firstName') next.referrerFirstName = message;
    else if (key === 'lastName') next.referrerLastName = message;
    else if (key === 'email') next.referrerEmail = message;
    else if (key === 'phone') next.referrerPhone = message;
    else next[key] = message;
  }

  return next;
}

export default function ReferralForm() {
  const [form, setForm] = useState<ReferralFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const utmParams = useUtmParams();

  const setField = <K extends keyof ReferralFormState>(field: K, value: ReferralFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (globalError) setGlobalError(null);
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!trim(form.referrerFirstName)) next.referrerFirstName = 'Enter your first name.';
    if (!trim(form.referrerLastName)) next.referrerLastName = 'Enter your last name.';
    if (!validateEmail(form.referrerEmail)) next.referrerEmail = 'Enter a valid email address.';
    if (!isUsPhoneComplete(form.referrerPhone)) next.referrerPhone = 'Enter your 10-digit phone number.';

    if (!trim(form.homeownerFirstName)) next.homeownerFirstName = 'Enter the homeowner first name.';
    if (!trim(form.homeownerLastName)) next.homeownerLastName = 'Enter the homeowner last name.';
    if (!isUsPhoneComplete(form.homeownerPhone)) next.homeownerPhone = 'Enter the homeowner 10-digit phone number.';

    if (trim(form.homeownerState) && !isValidState(form.homeownerState)) {
      next.homeownerState = 'Use the two-letter state code.';
    }
    if (trim(form.homeownerZip) && !isValidZip(form.homeownerZip)) {
      next.homeownerZip = 'ZIP should be 5 digits.';
    }

    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    setGlobalError(null);
    const validation = validate();
    if (Object.keys(validation).length) {
      setErrors(validation);
      setGlobalError('Please double-check the highlighted fields.');
      setStatus('error');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const cfToken = String(formData.get('cfToken') || '');
    const honeypot = String(formData.get('company') || '');

    if (!cfToken) {
      setErrors({ cfToken: 'Verification required.' });
      setGlobalError('Please complete the verification to continue.');
      setStatus('error');
      return;
    }

    setErrors({});
    const referrerPhone = normalizePhoneForSubmit(form.referrerPhone);
    const referredHomeowner = buildReferredHomeownerDetails(form);
    const notes = trim(form.notes);

    const payload = buildN8nLeadPayload({
      formType: 'referral',
      submittedAt: new Date().toISOString(),
      source: {
        page: '/homeowner-referral-program',
        utm_source: utmParams.source,
        utm_medium: utmParams.medium,
        utm_campaign: utmParams.campaign,
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        tz: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
      },
      contact: {
        firstName: form.referrerFirstName,
        lastName: form.referrerLastName,
        email: form.referrerEmail,
        phone: form.referrerPhone,
      },
      smsConsent: {
        smsProjectConsent: 'no',
        smsMarketingConsent: 'no',
      },
      details: {
        referralProgram: 'homeowner-referral-program',
        referrer: {
          firstName: trim(form.referrerFirstName),
          lastName: trim(form.referrerLastName),
          email: trim(form.referrerEmail),
          phone: referrerPhone,
        },
        referredHomeowner,
        project: {
          type: 'full-roof-replacement',
        },
        notes: notes || undefined,
      },
      antiSpam: {
        cfToken,
        hp_field: honeypot || undefined,
      },
    });

    setStatus('submitting');
    setGlobalError(null);

    const result = await submitLead(payload, {
      contactReadyCookie: false,
      gtmEvent: {
        event: 'referral_submitted',
        page: '/homeowner-referral-program',
      },
      metaPixelEvents: 'Lead',
    });

    if (!result.ok) {
      setStatus('error');
      setGlobalError(result.error || 'We could not send your referral. Please try again.');
      const serverErrors = mapReferralServerErrors(result.fieldErrors);
      if (Object.keys(serverErrors).length) setErrors(serverErrors);
      return;
    }

    setErrors({});
    setGlobalError(null);
    redirectToThankYou(payload);
  };

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Referral received</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{SUCCESS_MESSAGE}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="not-prose" onSubmit={handleSubmit} noValidate>
      <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="rounded-xl border border-blue-100 bg-white shadow-md">
        <div className="border-b border-blue-100 bg-linear-to-r from-sky-50 via-white to-amber-50 p-6">
          <div className="flex items-center gap-3">
            <Contact className="h-6 w-6 text-(--brand-blue)" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Submit a Referral</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Share the homeowner details with SonShine, and we will follow up about the roof replacement project.
          </p>
        </div>

        <div className="space-y-8 p-4 sm:p-6">
          {globalError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {globalError}
            </div>
          )}

          <section>
            <h3 className="text-xl font-semibold text-slate-800">Your information</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block font-medium text-slate-700">
                First name*
                <input
                  type="text"
                  name="referrerFirstName"
                  autoComplete="given-name"
                  value={form.referrerFirstName}
                  onChange={(event) => setField('referrerFirstName', event.target.value)}
                  className={cn(INPUT_CLASS, errors.referrerFirstName && INPUT_ERROR_CLASS)}
                  aria-invalid={Boolean(errors.referrerFirstName)}
                />
                {errors.referrerFirstName && <span className="mt-1 block text-xs text-red-600">{errors.referrerFirstName}</span>}
              </label>

              <label className="block font-medium text-slate-700">
                Last name*
                <input
                  type="text"
                  name="referrerLastName"
                  autoComplete="family-name"
                  value={form.referrerLastName}
                  onChange={(event) => setField('referrerLastName', event.target.value)}
                  className={cn(INPUT_CLASS, errors.referrerLastName && INPUT_ERROR_CLASS)}
                  aria-invalid={Boolean(errors.referrerLastName)}
                />
                {errors.referrerLastName && <span className="mt-1 block text-xs text-red-600">{errors.referrerLastName}</span>}
              </label>

              <label className="block font-medium text-slate-700">
                Email*
                <input
                  type="email"
                  name="referrerEmail"
                  autoComplete="email"
                  value={form.referrerEmail}
                  onChange={(event) => setField('referrerEmail', event.target.value)}
                  className={cn(INPUT_CLASS, errors.referrerEmail && INPUT_ERROR_CLASS)}
                  aria-invalid={Boolean(errors.referrerEmail)}
                />
                {errors.referrerEmail && <span className="mt-1 block text-xs text-red-600">{errors.referrerEmail}</span>}
              </label>

              <label className="block font-medium text-slate-700">
                Phone*
                <input
                  type="tel"
                  name="referrerPhone"
                  autoComplete="tel"
                  inputMode="tel"
                  value={form.referrerPhone}
                  onChange={(event) => setField('referrerPhone', sanitizePhoneInput(event.target.value))}
                  className={cn(INPUT_CLASS, errors.referrerPhone && INPUT_ERROR_CLASS)}
                  aria-invalid={Boolean(errors.referrerPhone)}
                  placeholder={`Example: ${formatPhoneExample(form.referrerPhone)}`}
                />
                {errors.referrerPhone && <span className="mt-1 block text-xs text-red-600">{errors.referrerPhone}</span>}
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-800">Referred homeowner</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block font-medium text-slate-700">
                First name*
                <input
                  type="text"
                  name="homeownerFirstName"
                  autoComplete="off"
                  value={form.homeownerFirstName}
                  onChange={(event) => setField('homeownerFirstName', event.target.value)}
                  className={cn(INPUT_CLASS, errors.homeownerFirstName && INPUT_ERROR_CLASS)}
                  aria-invalid={Boolean(errors.homeownerFirstName)}
                />
                {errors.homeownerFirstName && <span className="mt-1 block text-xs text-red-600">{errors.homeownerFirstName}</span>}
              </label>

              <label className="block font-medium text-slate-700">
                Last name*
                <input
                  type="text"
                  name="homeownerLastName"
                  autoComplete="off"
                  value={form.homeownerLastName}
                  onChange={(event) => setField('homeownerLastName', event.target.value)}
                  className={cn(INPUT_CLASS, errors.homeownerLastName && INPUT_ERROR_CLASS)}
                  aria-invalid={Boolean(errors.homeownerLastName)}
                />
                {errors.homeownerLastName && <span className="mt-1 block text-xs text-red-600">{errors.homeownerLastName}</span>}
              </label>

              <label className="block font-medium text-slate-700 md:col-span-2">
                Phone number*
                <input
                  type="tel"
                  name="homeownerPhone"
                  autoComplete="off"
                  inputMode="tel"
                  value={form.homeownerPhone}
                  onChange={(event) => setField('homeownerPhone', sanitizePhoneInput(event.target.value))}
                  className={cn(INPUT_CLASS, errors.homeownerPhone && INPUT_ERROR_CLASS)}
                  aria-invalid={Boolean(errors.homeownerPhone)}
                  placeholder={`Example: ${formatPhoneExample(form.homeownerPhone)}`}
                />
                {errors.homeownerPhone && <span className="mt-1 block text-xs text-red-600">{errors.homeownerPhone}</span>}
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-800">Property address</h3>
            <p className="mt-1 text-sm text-slate-500">Optional, but helpful if you have it.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block font-medium text-slate-700">
                Address
                <input
                  type="text"
                  name="homeownerAddress1"
                  autoComplete="off"
                  value={form.homeownerAddress1}
                  onChange={(event) => setField('homeownerAddress1', event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block font-medium text-slate-700">
                Apt/suite/etc.
                <input
                  type="text"
                  name="homeownerAddress2"
                  autoComplete="off"
                  value={form.homeownerAddress2}
                  onChange={(event) => setField('homeownerAddress2', event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block font-medium text-slate-700">
                City
                <input
                  type="text"
                  name="homeownerCity"
                  autoComplete="off"
                  value={form.homeownerCity}
                  onChange={(event) => setField('homeownerCity', event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
                <label className="block font-medium text-slate-700">
                  State
                  <input
                    type="text"
                    name="homeownerState"
                    autoComplete="off"
                    maxLength={2}
                    value={form.homeownerState}
                    onChange={(event) => setField('homeownerState', normalizeState(event.target.value))}
                    className={cn(INPUT_CLASS, errors.homeownerState && INPUT_ERROR_CLASS)}
                    aria-invalid={Boolean(errors.homeownerState)}
                  />
                  {errors.homeownerState && <span className="mt-1 block text-xs text-red-600">{errors.homeownerState}</span>}
                </label>

                <label className="block font-medium text-slate-700">
                  ZIP
                  <input
                    type="text"
                    name="homeownerZip"
                    autoComplete="off"
                    inputMode="numeric"
                    value={form.homeownerZip}
                    onChange={(event) => setField('homeownerZip', normalizeZip(event.target.value))}
                    className={cn(INPUT_CLASS, errors.homeownerZip && INPUT_ERROR_CLASS)}
                    aria-invalid={Boolean(errors.homeownerZip)}
                  />
                  {errors.homeownerZip && <span className="mt-1 block text-xs text-red-600">{errors.homeownerZip}</span>}
                </label>
              </div>
            </div>
          </section>

          <section>
            <label className="block font-medium text-slate-700">
              Anything else we should know?
              <textarea
                name="notes"
                rows={4}
                autoComplete="off"
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base shadow-xs focus:border-(--brand-blue) focus:ring-2 focus:ring-(--brand-blue)/30"
              />
            </label>
          </section>

          <section>
            <Turnstile className="pt-1" action="referral" />
            {errors.cfToken && <p className="mt-2 text-sm font-medium text-red-600">{errors.cfToken}</p>}
          </section>

          <div className="flex justify-end">
            <Button type="submit" size="xl" variant="brandOrange" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending...' : 'Submit Referral'}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

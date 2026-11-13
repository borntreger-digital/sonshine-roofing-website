'use client';

import dynamic from 'next/dynamic';
import StaticImage from '@/components/media/StaticMediaProvider';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteCookie } from '@/lib/telemetry/client-cookies';
import {
  DEFAULT_PREFERRED_CONTACT,
  LEAD_SUCCESS_COOKIE,
  LeadSuccessCookiePayload,
  SuccessMeta,
  buildContactLeadForwardPayload,
  buildContactLeadSuccessPayload,
  formatPhoneExample,
  mapLeadApiFieldErrors,
  normalizeState,
  normalizeZip,
  parseLeadSuccessCookie,
  persistLeadSuccessCookie,
  sanitizePhoneInput,
  submitLead,
  type SmsConsentFieldValue,
  validateContactAddressDraft,
  validateContactIdentityDraft,
  validateSmsConsentDraft,
} from '@/lib/lead-capture/contact-lead';
import { cn } from '@/lib/utils';
import { useSiteSettings } from '@/lib/content/site-settings-context';
import {
  PROJECT_OPTIONS,
  STANDARD_ROOF_AGE_OPTIONS,
  isJourneyKey,
  type JourneyKey,
  type ProjectOption,
  getRoofAgeLabelForDisplay,
} from '@/components/lead-capture/lead-form/config';
import { useUtmParams } from '@/components/lead-capture/useUtmParams';
import { renderHighlight } from '@/components/utils/renderHighlight';
import {
  PROJECT_OPTION_CARD_BASE_CLASS,
  PROJECT_OPTION_CARD_SELECTED_CLASS,
  PROJECT_OPTION_CARD_UNSELECTED_CLASS,
  ProjectOptionCardContent,
} from '@/components/lead-capture/lead-form/ProjectOptionCard';
import { redirectToThankYou } from '@/lib/lead-capture/thank-you';
import LeadFormEnding from '@/components/lead-capture/shared/LeadFormEnding';
import { useLeadFormErrorFocus } from '@/components/lead-capture/shared/useLeadFormErrorFocus';

// STYLES
const INPUT_BASE_CLASS =
  'mt-2 w-full rounded-xl border border-blue-100 px-4 py-2 text-base shadow-xs focus:border-(--brand-blue) focus:ring-2 focus:ring-(--brand-blue)/30';
const INPUT_ERROR_CLASS = 'border-red-300 focus:border-red-400 focus:ring-red-200';
const SECTION_TITLE_BASE_CLASS = 'text-xl sm:text-2xl font-semibold tracking-wide text-slate-700';
const SECTION_EYELASH = 'text-sm my-1 text-slate-500';

const Turnstile = dynamic(() => import('@/components/lead-capture/Turnstile'), { ssr: false });
const LeadFormSuccess = dynamic(
  () => import('@/components/lead-capture/lead-form/LeadFormSuccess'),
  {
    ssr: false,
    loading: () => null,
  },
);

type Status = 'idle' | 'submitting' | 'success' | 'error';

type FormState = {
  projectType: JourneyKey | '';
  roofAge: string;
  notes: string;
  roofType: RoofTypeValue | '';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  smsProjectConsent: SmsConsentFieldValue;
  smsMarketingConsent: SmsConsentFieldValue;
};

const INITIAL_STATE: FormState = {
  projectType: '',
  roofAge: '',
  notes: '',
  roofType: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: 'FL',
  zip: '',
  smsProjectConsent: '',
  smsMarketingConsent: '',
};

const DEFAULT_SELECTABLE_PROJECT_TYPES = PROJECT_OPTIONS.reduce<JourneyKey[]>((acc, option) => {
  if (option.action === 'advance' && isJourneyKey(option.value)) {
    acc.push(option.value);
  }
  return acc;
}, []);

function getSelectableProjectOptions(
  selectableProjectTypes: readonly JourneyKey[],
): Array<ProjectOption & { value: JourneyKey }> {
  const allowedProjectTypes = new Set(selectableProjectTypes);

  return PROJECT_OPTIONS.filter(
    (option): option is ProjectOption & { value: JourneyKey } =>
      isJourneyKey(option.value) && allowedProjectTypes.has(option.value),
  );
}

type SimpleLeadFormProps = {
  selectableProjectTypes?: readonly JourneyKey[];
};

type RoofTypeValue = 'shingle' | 'metal' | 'tile' | 'flat';

type RoofTypeOption = {
  value: RoofTypeValue;
  label: string;
  imageSrc: string;
  imageAlt: string;
};

const ROOF_TYPE_OPTIONS: RoofTypeOption[] = [
  {
    value: 'shingle',
    label: 'Shingle',
    imageSrc: 'static:dark-shingle-roof-home',
    imageAlt: 'Close-up of a shingle roof',
  },
  {
    value: 'metal',
    label: 'Metal',
    imageSrc: 'static:standing-seam-metal-roof-home',
    imageAlt: 'Modern home with metal roofing panels',
  },
  {
    value: 'tile',
    label: 'Tile',
    imageSrc: 'static:red-tile-roof-home',
    imageAlt: 'Clay tile roof on a Florida home',
  },
  {
    value: 'flat',
    label: 'Flat',
    imageSrc: 'static:light-colored-flat-roof',
    imageAlt: 'Flat commercial roof with HVAC equipment',
  },
];

function getRoofTypeLabel(value: RoofTypeValue | ''): string | null {
  if (!value) return null;
  const option = ROOF_TYPE_OPTIONS.find((item) => item.value === value);
  return option?.label ?? null;
}

function buildSuccessMetaFromPayload(payload: LeadSuccessCookiePayload): SuccessMeta {
  const helpTopicLabels = Array.isArray(payload.helpTopicLabels)
    ? payload.helpTopicLabels.filter((item): item is string => typeof item === 'string')
    : [];
  const roofAgeLabel =
    typeof payload.roofAgeLabel === 'string' && payload.roofAgeLabel
      ? payload.roofAgeLabel
      : getRoofAgeLabelForDisplay(payload.projectType, payload.roofAge || '') || null;
  const notes = typeof payload.notes === 'string' ? payload.notes : null;
  const roofTypeLabel =
    typeof payload.roofTypeLabel === 'string' && payload.roofTypeLabel
      ? payload.roofTypeLabel
      : null;

  return {
    projectType: payload.projectType,
    helpTopicLabels,
    roofAgeLabel,
    notes,
    roofTypeLabel,
  };
}

export default function SimpleLeadForm({
  selectableProjectTypes = DEFAULT_SELECTABLE_PROJECT_TYPES,
}: SimpleLeadFormProps = {}) {
  const { phone } = useSiteSettings();
  const parsedCookie = useMemo(() => parseLeadSuccessCookie(), []);
  const projectOptions = useMemo(
    () => getSelectableProjectOptions(selectableProjectTypes),
    [selectableProjectTypes],
  );
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { formRef, focusErrors } = useLeadFormErrorFocus();
  const [status, setStatus] = useState<Status>('idle');
  const [successMeta, setSuccessMeta] = useState<SuccessMeta | null>(
    parsedCookie ? buildSuccessMetaFromPayload(parsedCookie) : null,
  );

  const utmParams = useUtmParams();

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;
    setErrors({});

    const validation: Record<string, string> = {};
    const identityErrors = validateContactIdentityDraft(
      {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
      },
      { phoneRequired: true, emailRequired: true },
    );
    const addressErrors = validateContactAddressDraft({
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      state: form.state,
      zip: form.zip,
    });
    const smsErrors = validateSmsConsentDraft({
      smsProjectConsent: form.smsProjectConsent,
      smsMarketingConsent: form.smsMarketingConsent,
    });

    Object.assign(validation, identityErrors, addressErrors, smsErrors);

    if (Object.keys(validation).length) {
      focusErrors();
      setErrors(validation);
      setGlobalError('Please complete the highlighted fields.');
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

    const roofAgeLabel = getRoofAgeLabelForDisplay(form.projectType, form.roofAge) || form.roofAge;
    const notes = form.notes.trim();
    const roofTypeLabel = getRoofTypeLabel(form.roofType);
    const combinedNotes = roofTypeLabel
      ? [notes, `Roof type: ${roofTypeLabel}`]
          .filter((value) => Boolean(value && value.trim()))
          .join('\n\n')
      : notes;
    const preferredContact = DEFAULT_PREFERRED_CONTACT;
    const payload = buildContactLeadForwardPayload({
      submittedAt: new Date().toISOString(),
      source: {
        page: '/contact-us',
        utm_source: utmParams.source || undefined,
        utm_medium: utmParams.medium || undefined,
        utm_campaign: utmParams.campaign || undefined,
      },
      contact: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
      },
      address: {
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        zip: form.zip,
      },
      smsConsent: {
        smsProjectConsent: form.smsProjectConsent,
        smsMarketingConsent: form.smsMarketingConsent,
      },
      details: {
        projectType: form.projectType,
        roofAge: form.roofAge,
        roofAgeLabel,
        roofType: form.roofType,
        notes: combinedNotes.trim(),
        roofTypeLabel,
        preferredContact,
        bestTime: 'No preference',
      },
      preferredContact,
      antiSpam: {
        cfToken,
        hp_field: honeypot || undefined,
      },
    });

    const result = await submitLead(payload, {
      gtmEvent: {
        event: 'lead_form_submitted',
        projectType: form.projectType,
        helpTopics: '',
      },
      metaPixelEvents: ['Lead', 'Contact'],
    });

    if (!result.ok) {
      focusErrors();
      if (process.env.NODE_ENV !== 'production') {
        console.error('Lead submission failed', result);
      }
      setStatus('error');
      setGlobalError(result.error || `We could not send your message. Please call us at ${phone}.`);
      if (result.fieldErrors) {
        const serverErrors = mapLeadApiFieldErrors(result.fieldErrors);
        if (Object.keys(serverErrors).length) {
          setErrors(serverErrors);
        }
      }
      return;
    }

    const successPayload = buildContactLeadSuccessPayload({
      projectType: form.projectType || 'contact',
      helpTopics: [],
      helpTopicLabels: [],
      roofAge: form.roofAge,
      roofAgeLabel,
      notes,
      roofTypeLabel,
    });
    persistLeadSuccessCookie(successPayload);
    redirectToThankYou(payload);
  };

  const handleResetSuccess = () => {
    deleteCookie(LEAD_SUCCESS_COOKIE);
    setSuccessMeta(null);
    setStatus('idle');
    setGlobalError(null);
    setForm(INITIAL_STATE);
  };

  if (status === 'success' && successMeta) {
    return (
      <>
        <div id="book-an-appointment" className="h-0" aria-hidden="true" />
        <LeadFormSuccess
          successMeta={successMeta}
          onReset={handleResetSuccess}
          maxWidthClassName="max-w-5xl"
        />
      </>
    );
  }

  return (
    <>
      <div id="book-an-appointment" className="h-0" aria-hidden="true" />
      <form ref={formRef} className="not-prose" onSubmit={handleSubmit} noValidate>
        {/* SECRET CIA HONEYPOT */}
        <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />
        {/* OK, BACK TO THE SHOW */}
        <div className="mx-auto w-full rounded-3xl border border-blue-100 bg-white shadow-md">
          <div className="border-b rounded-t-3xl border-blue-100 bg-linear-to-r from-sky-50 via-white to-amber-50 p-6">
            <h2 className="flex items-center text-3xl font-bold gap-2">
              <Mail className="h-6 w-6 text-(--brand-blue)" aria-hidden="true" />
              <span>{renderHighlight('Contact Our Office', 'Our Office')}</span>
            </h2>
            <p className="text-slate-500 mt-1 text-sm md:text-base pb-2">
              We respond within 30 minutes during business hours. After hours, we&apos;ll contact
              you in the next business day.
            </p>
          </div>

          <div className="p-4 sm:p-6">
            {globalError && (
              <div role="alert" tabIndex={-1} className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {globalError}
              </div>
            )}

            <div className="grid gap-8">
              <section>
                <div className="grid my-4 gap-4 md:grid-cols-2">
                  <label className="block font-medium text-slate-700">
                    First Name*
                    <input
                      type="text"
                      name="firstName"
                      aria-invalid={Boolean(errors.firstName)}
                      aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(event) => setField('firstName', event.target.value)}
                      className={cn(INPUT_BASE_CLASS, errors.firstName && INPUT_ERROR_CLASS)}
                      placeholder="First Name"
                    />
                    {errors.firstName && (
                      <span id="firstName-error" className="mt-1 text-xs text-red-600">{errors.firstName}</span>
                    )}
                  </label>
                  <label className="block font-medium text-slate-700">
                    Last Name*
                    <input
                      type="text"
                      name="lastName"
                      aria-invalid={Boolean(errors.lastName)}
                      aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(event) => setField('lastName', event.target.value)}
                      className={cn(INPUT_BASE_CLASS, errors.lastName && INPUT_ERROR_CLASS)}
                      placeholder="Last Name"
                    />
                    {errors.lastName && (
                      <span id="lastName-error" className="mt-1 text-xs text-red-600">{errors.lastName}</span>
                    )}
                  </label>
                </div>

                <section className="grid gap-4 md:grid-cols-2">
                  <label className="block font-medium text-slate-700">
                    Email*
                    <input
                      type="email"
                      name="email"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) => setField('email', event.target.value)}
                      className={cn(INPUT_BASE_CLASS, errors.email && INPUT_ERROR_CLASS)}
                      placeholder="example@domain.com"
                    />
                    {errors.email && (
                      <span id="email-error" className="mt-1 text-xs text-red-600">{errors.email}</span>
                    )}
                  </label>
                  <label className="block font-medium text-slate-700">
                    Phone*
                    <input
                      type="tel"
                      name="phone"
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? 'phone-error' : undefined}
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) =>
                        setField('phone', sanitizePhoneInput(event.target.value))
                      }
                      className={cn(INPUT_BASE_CLASS, errors.phone && INPUT_ERROR_CLASS)}
                      inputMode="tel"
                      placeholder={`Example: ${formatPhoneExample(form.phone)}`}
                    />
                    {errors.phone && (
                      <span id="phone-error" className="mt-1 text-xs text-red-600">{errors.phone}</span>
                    )}
                  </label>
                </section>

                <section className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block font-medium text-slate-700">
                    Address*
                    <input
                      type="text"
                      name="address1"
                      aria-invalid={Boolean(errors.address1)}
                      aria-describedby={errors.address1 ? 'address1-error' : undefined}
                      autoComplete="address-line1"
                      value={form.address1}
                      onChange={(event) => setField('address1', event.target.value)}
                      className={cn(INPUT_BASE_CLASS, errors.address1 && INPUT_ERROR_CLASS)}
                      placeholder="123 Sesame St."
                    />
                    {errors.address1 && (
                      <span id="address1-error" className="mt-1 text-xs text-red-600">{errors.address1}</span>
                    )}
                  </label>
                  <label className="block text-slate-500">
                    Apt, suite, etc. (optional)
                    <input
                      type="text"
                      name="address2"
                      autoComplete="address-line2"
                      value={form.address2}
                      onChange={(event) => setField('address2', event.target.value)}
                      className={cn(INPUT_BASE_CLASS)}
                    />
                  </label>
                </section>
                <section className="mt-4 flex flex-row w-full gap-2">
                  <label className="block font-medium text-slate-700">
                    City*
                    <input
                      type="text"
                      name="city"
                      aria-invalid={Boolean(errors.city)}
                      aria-describedby={errors.city ? 'city-error' : undefined}
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(event) => setField('city', event.target.value)}
                      className={cn(INPUT_BASE_CLASS, errors.city && INPUT_ERROR_CLASS)}
                      placeholder="City"
                    />
                    {errors.city && (
                      <span id="city-error" className="mt-1 text-xs text-red-600">{errors.city}</span>
                    )}
                  </label>
                  <label className="block font-medium text-slate-700">
                    State*
                    <input
                      type="text"
                      name="state"
                      aria-invalid={Boolean(errors.state)}
                      aria-describedby={errors.state ? 'state-error' : undefined}
                      autoComplete="address-level1"
                      value={form.state}
                      onChange={(event) => setField('state', normalizeState(event.target.value))}
                      className={cn(INPUT_BASE_CLASS, errors.state && INPUT_ERROR_CLASS)}
                      maxLength={2}
                    />
                    {errors.state && (
                      <span id="state-error" className="mt-1 text-xs text-red-600">{errors.state}</span>
                    )}
                  </label>
                  <label className="block font-medium text-slate-700">
                    ZIP*
                    <input
                      type="text"
                      name="zip"
                      aria-invalid={Boolean(errors.zip)}
                      aria-describedby={errors.zip ? 'zip-error' : undefined}
                      autoComplete="postal-code"
                      value={form.zip}
                      onChange={(event) => setField('zip', normalizeZip(event.target.value))}
                      className={cn(INPUT_BASE_CLASS, errors.zip && INPUT_ERROR_CLASS)}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="ZIP"
                    />
                    {errors.zip && <span id="zip-error" className="mt-1 text-xs text-red-600">{errors.zip}</span>}
                  </label>
                </section>
              </section>
              <section>
                <h3 className={SECTION_TITLE_BASE_CLASS}>How can we help?</h3>
                <p className={SECTION_EYELASH}>Helps us route you faster</p>
                <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {projectOptions.map((option) => {
                    const selected = form.projectType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setField('projectType', option.value)}
                        className={cn(
                          PROJECT_OPTION_CARD_BASE_CLASS,
                          selected
                            ? PROJECT_OPTION_CARD_SELECTED_CLASS
                            : PROJECT_OPTION_CARD_UNSELECTED_CLASS,
                        )}
                        aria-pressed={selected}
                      >
                        <ProjectOptionCardContent option={option} />
                      </button>
                    );
                  })}
                  {errors.projectType && (
                    <p className="md:col-span-2 text-sm font-medium text-red-600">
                      {errors.projectType}
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h3 className={SECTION_TITLE_BASE_CLASS}>How old is your roof?</h3>
                <p className={SECTION_EYELASH}>
                  Share your roof&apos;s age or click &quot;Not sure.&quot;
                </p>
                <div className="mt-3 grid gap-3 grid-cols-3 sm:grid-cols-6">
                  {STANDARD_ROOF_AGE_OPTIONS.map(({ value, label }) => {
                    const selected = form.roofAge === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setField('roofAge', value)}
                        className={cn(
                          'font-medium text-slate-600 rounded-xl border px-4 py-2 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
                          selected
                            ? 'border-(--brand-blue) bg-(--brand-blue) text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                        )}
                        aria-pressed={selected}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {errors.roofAge && (
                  <p className="mt-2 text-sm font-medium text-red-600">{errors.roofAge}</p>
                )}
              </section>

              <section>
                <h3 className={SECTION_TITLE_BASE_CLASS}>
                  What type of roof do you currently have?
                </h3>
                <p className={SECTION_EYELASH}>Helps us prep for your project</p>
                <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {ROOF_TYPE_OPTIONS.map(({ value, label, imageSrc }) => {
                    const selected = form.roofType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setField('roofType', value)}
                        className={cn(
                          'group flex flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
                          selected
                            ? 'border-(--brand-blue) bg-(--brand-blue)/5 shadow-[0_8px_20px_rgba(15,76,129,0.12)]'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
                        )}
                        aria-pressed={selected}
                      >
                        <div className="relative w-full overflow-hidden rounded-xl bg-slate-100 aspect-5/2">
                          <StaticImage
                            src={imageSrc}
                            alt="" decorative crop
                            fill
                            sizes="(min-width: 768px) 320px, 100vw"
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{label}</p>
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white shadow-inner">
                            <Check
                              className={cn(
                                'h-4 w-4',
                                selected ? 'text-(--brand-blue)' : 'text-slate-300',
                              )}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <label className="block ">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-600">
                    Anything else you’d like us to know? (optional){' '}
                  </h3>
                  <textarea
                    name="notes"
                    rows={4}
                    autoComplete="off"
                    value={form.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base shadow-xs focus:border-(--brand-blue) focus:ring-2 focus:ring-(--brand-blue)/30"
                  />
                </label>
              </section>

              <LeadFormEnding
                className="[--lead-form-gap:2rem]"
                verification={
                  <section>
                    <Turnstile action="contact-lead" />
                    {errors.cfToken && (
                      <p className="mt-2 text-sm font-medium text-red-600">{errors.cfToken}</p>
                    )}
                  </section>
                }
                actions={
                  <div className="flex w-full">
                    <Button
                      className="w-full"
                      data-icon-affordance="right"
                      type="submit"
                      size="xl"
                      variant="brandOrange"
                      disabled={status === 'submitting'}
                    >
                      {status === 'submitting' ? 'Sending…' : 'Submit Request'}
                      <ArrowRight className="ml-2 h-4 w-4 inline icon-affordance" />
                    </Button>
                  </div>
                }
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
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

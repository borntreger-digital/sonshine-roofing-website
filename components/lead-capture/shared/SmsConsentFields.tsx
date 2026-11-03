'use client';

import SmartLink from '@/components/utils/SmartLink';
import { cn } from '@/lib/utils';
import type { SmsConsentFieldValue } from '@/lib/lead-capture/contact-lead';

type SmsConsentFieldName = 'smsProjectConsent' | 'smsMarketingConsent';

type SmsConsentErrors = Partial<Record<SmsConsentFieldName, string>>;

export type SmsConsentFieldsClassNames = {
  root: string;
  cards: string;
  card: string;
  cardError: string;
  sectionEyebrow: string;
  sectionTitle: string;
  sectionIntro: string;
  label: string;
  options: string;
  optionLabel: string;
  optionLabelSelected: string;
  radio: string;
  optionText: string;
  optionTextSelected: string;
  disclosure: string;
  sharedDisclosure: string;
  error: string;
  footer: string;
  footerText: string;
  footerLinks: string;
  footerLink: string;
};

type Props = {
  smsProjectConsent: SmsConsentFieldValue;
  smsMarketingConsent: SmsConsentFieldValue;
  onChange: (field: SmsConsentFieldName, value: SmsConsentFieldValue) => void;
  errors?: SmsConsentErrors;
  className?: string;
  classNames?: Partial<SmsConsentFieldsClassNames>;
  companyName?: string;
  sectionEyebrow?: string;
  sectionTitle?: string;
  sectionIntro?: string;
  disclosureMode?: 'perCard' | 'shared';
  showFooter?: boolean;
};

const DISCLOSURE_TEXT =
  'Messaging rates vary based on your project needs. You can opt out at any time by replying STOP. Reply HELP if you are experiencing issues. Message/data rates apply.';

const DEFAULT_CLASS_NAMES: SmsConsentFieldsClassNames = {
  root: 'space-y-4',
  cards: 'space-y-4',
  card: 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4',
  cardError: 'border-red-300',
  sectionEyebrow: 'text-xs font-semibold uppercase tracking-[0.18em] text-(--brand-blue)',
  sectionTitle: 'text-lg font-semibold text-slate-900',
  sectionIntro: 'mt-1 text-sm text-slate-600',
  label: 'text-base font-semibold text-slate-700',
  options: 'mt-2 flex items-center gap-8',
  optionLabel: 'pointer-events-auto inline-flex items-center gap-2 text-slate-700',
  optionLabelSelected: '',
  radio: 'h-4 w-4 border-slate-300 text-(--brand-blue) focus:ring-(--brand-blue)',
  optionText: 'text-sm leading-none',
  optionTextSelected: '',
  disclosure: 'mt-3 text-xs text-slate-500',
  sharedDisclosure: 'text-xs text-slate-500',
  error: 'mt-2 text-sm font-medium text-red-600',
  footer: 'border-t border-slate-200 pt-4 text-sm text-slate-600',
  footerText: '',
  footerLinks: 'mt-2 font-semibold text-(--brand-blue)',
  footerLink: '',
};

function ConsentCard({
  name,
  label,
  value,
  onChange,
  error,
  classNames,
  showDisclosure,
}: {
  name: SmsConsentFieldName;
  label: string;
  value: SmsConsentFieldValue;
  onChange: (field: SmsConsentFieldName, value: SmsConsentFieldValue) => void;
  error?: string;
  classNames: Partial<SmsConsentFieldsClassNames>;
  showDisclosure: boolean;
}) {
  const errorId = `${name}-error`;

  return (
    <fieldset
      className={cn(
        DEFAULT_CLASS_NAMES.card,
        classNames.card,
        error && cn(DEFAULT_CLASS_NAMES.cardError, classNames.cardError)
      )}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      aria-labelledby={`${name}-label`}
    >
      <div id={`${name}-label`} className={cn(DEFAULT_CLASS_NAMES.label, classNames.label)}>{label}</div>
      <div className={cn(DEFAULT_CLASS_NAMES.options, classNames.options)}>
        <label
          data-choice-label
          className={cn(
            DEFAULT_CLASS_NAMES.optionLabel,
            classNames.optionLabel,
            value === 'yes' && cn(DEFAULT_CLASS_NAMES.optionLabelSelected, classNames.optionLabelSelected)
          )}
        >
          <input
            type="radio"
            name={name}
            value="yes"
            aria-describedby={error ? errorId : undefined}
            checked={value === 'yes'}
            onChange={() => onChange(name, 'yes')}
            className={cn(DEFAULT_CLASS_NAMES.radio, classNames.radio)}
          />
          <span
            className={cn(
              DEFAULT_CLASS_NAMES.optionText,
              classNames.optionText,
              value === 'yes' && cn(DEFAULT_CLASS_NAMES.optionTextSelected, classNames.optionTextSelected)
            )}
          >
            Yes
          </span>
        </label>
        <label
          data-choice-label
          className={cn(
            DEFAULT_CLASS_NAMES.optionLabel,
            classNames.optionLabel,
            value === 'no' && cn(DEFAULT_CLASS_NAMES.optionLabelSelected, classNames.optionLabelSelected)
          )}
        >
          <input
            type="radio"
            name={name}
            value="no"
            aria-describedby={error ? errorId : undefined}
            checked={value === 'no'}
            onChange={() => onChange(name, 'no')}
            className={cn(DEFAULT_CLASS_NAMES.radio, classNames.radio)}
          />
          <span
            className={cn(
              DEFAULT_CLASS_NAMES.optionText,
              classNames.optionText,
              value === 'no' && cn(DEFAULT_CLASS_NAMES.optionTextSelected, classNames.optionTextSelected)
            )}
          >
            No
          </span>
        </label>
      </div>
      {showDisclosure ? (
        <p className={cn(DEFAULT_CLASS_NAMES.disclosure, classNames.disclosure)}>{DISCLOSURE_TEXT}</p>
      ) : null}
      {error && (
        <p id={errorId} className={cn(DEFAULT_CLASS_NAMES.error, classNames.error)}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

type SmsConsentFooterProps = {
  className?: string;
  classNames?: Partial<SmsConsentFieldsClassNames>;
  companyName?: string;
};

export function SmsConsentFooter({
  className,
  classNames,
  companyName = 'SonShine Roofing',
}: SmsConsentFooterProps) {
  return (
    <div className={cn(DEFAULT_CLASS_NAMES.footer, className, classNames?.footer)}>
      <p className={cn(DEFAULT_CLASS_NAMES.footerText, classNames?.footerText)}>
        By submitting this form, you authorize {companyName} to reach out to you about your
        project. We will never share your personal information with third parties for marketing
        purposes. You can opt out at any time. Consent is not a condition of purchase.
      </p>
      <p className={cn(DEFAULT_CLASS_NAMES.footerLinks, classNames?.footerLinks)}>
        <SmartLink href="/sms-terms-and-conditions" className={classNames?.footerLink}>
          Terms &amp; Conditions
        </SmartLink>
        {' | '}
        <SmartLink href="/privacy-policy" className={classNames?.footerLink}>
          Privacy Policy
        </SmartLink>
      </p>
    </div>
  );
}

export default function SmsConsentFields({
  smsProjectConsent,
  smsMarketingConsent,
  onChange,
  errors,
  className,
  classNames,
  companyName = 'SonShine Roofing',
  sectionEyebrow,
  sectionTitle,
  sectionIntro,
  disclosureMode = 'perCard',
  showFooter = true,
}: Props) {
  return (
    <section className={cn(DEFAULT_CLASS_NAMES.root, className, classNames?.root)}>
      {sectionEyebrow || sectionTitle || sectionIntro ? (
        <div>
          {sectionEyebrow ? (
            <p className={cn(DEFAULT_CLASS_NAMES.sectionEyebrow, classNames?.sectionEyebrow)}>
              {sectionEyebrow}
            </p>
          ) : null}
          {sectionTitle ? (
            <h3 className={cn(DEFAULT_CLASS_NAMES.sectionTitle, classNames?.sectionTitle)}>{sectionTitle}</h3>
          ) : null}
          {sectionIntro ? (
            <p className={cn(DEFAULT_CLASS_NAMES.sectionIntro, classNames?.sectionIntro)}>{sectionIntro}</p>
          ) : null}
        </div>
      ) : null}

      <div className={cn(DEFAULT_CLASS_NAMES.cards, classNames?.cards)}>
        <ConsentCard
          name="smsProjectConsent"
          label="I'd like to receive SMS messages about my project.*"
          value={smsProjectConsent}
          onChange={onChange}
          error={errors?.smsProjectConsent}
          classNames={classNames ?? {}}
          showDisclosure={disclosureMode === 'perCard'}
        />
        <ConsentCard
          name="smsMarketingConsent"
          label={`I'd like to receive SMS marketing messages from ${companyName}.*`}
          value={smsMarketingConsent}
          onChange={onChange}
          error={errors?.smsMarketingConsent}
          classNames={classNames ?? {}}
          showDisclosure={disclosureMode === 'perCard'}
        />
      </div>

      {disclosureMode === 'shared' ? (
        <p className={cn(DEFAULT_CLASS_NAMES.sharedDisclosure, classNames?.sharedDisclosure)}>{DISCLOSURE_TEXT}</p>
      ) : null}

      {showFooter ? <SmsConsentFooter classNames={classNames} companyName={companyName} /> : null}
    </section>
  );
}

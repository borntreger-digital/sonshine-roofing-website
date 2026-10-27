import { NextRequest, NextResponse } from 'next/server';
import type { N8nLeadPayloadV2 as LeadForwardPayloadV2 } from '@/lib/lead-capture/contact-lead';
import { readBoundedJsonBody } from '@/lib/http/read-json-body';
import { isEmailComplete } from '@/lib/lead-capture/email';
import { isUsPhoneComplete, normalizePhoneForSubmit } from '@/lib/lead-capture/phone';
import { isProdEnv, requireEnv, SITE_ORIGIN } from '@/lib/seo/site';

type UnknownRecord = Record<string, unknown>;
type FieldErrors = Record<string, string[]>;

const TURNSTILE_SECRET = requireEnv('TURNSTILE_SECRET_KEY', { prodOnly: true });
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

const FORM_TYPES = new Set<LeadForwardPayloadV2['formType']>([
  'contact-lead',
  'financing-calculator',
  'special-offer',
  'feedback',
  'referral',
]);

const SMS_CHOICES = new Set<LeadForwardPayloadV2['smsConsent']['projectSms']>(['yes', 'no']);

if ((!N8N_WEBHOOK_URL || !N8N_WEBHOOK_SECRET) && isProdEnv()) {
  console.error('[env] Missing N8N_WEBHOOK_URL/N8N_WEBHOOK_SECRET.');
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveRequestOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const referer = req.headers.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function getClientIp(req: NextRequest): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || null;
  const xr = req.headers.get('x-real-ip');
  if (xr) return xr.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return null;
}

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function addFieldError(errors: FieldErrors, key: string, message: string) {
  (errors[key] ||= []).push(message);
}

function getOptionalTrimmed(record: UnknownRecord, key: string): string | undefined {
  const value = trimString(record[key]);
  return value || undefined;
}

function getRequiredTrimmed(record: UnknownRecord, key: string, path: string, errors: FieldErrors): string {
  const value = trimString(record[key]);
  if (!value) addFieldError(errors, path, 'Required');
  return value;
}

function isHoneypotTrippedV2(raw: UnknownRecord): boolean {
  const directHp = trimString(raw.hp_field);
  const company = trimString(raw.company);
  const website = trimString(raw.website);
  const fax = trimString(raw.fax);

  if (directHp || company || website || fax) return true;
  if (!isRecord(raw.antiSpam)) return false;
  return trimString(raw.antiSpam.hp_field).length > 0;
}

function normalizeDetails(raw: unknown): Record<string, unknown> {
  return isRecord(raw) ? raw : {};
}

function validateLeadForwardPayload(input: unknown):
  | { ok: true; data: LeadForwardPayloadV2 }
  | { ok: false; message: string; fieldErrors: FieldErrors } {
  const errors: FieldErrors = {};

  if (!isRecord(input)) {
    return {
      ok: false,
      message: 'Validation failed',
      fieldErrors: { _: ['Expected object payload'] },
    };
  }

  const versionRaw = trimString(input.version);
  if (versionRaw !== 'v2') addFieldError(errors, 'version', 'Expected "v2".');

  const formTypeRaw = trimString(input.formType);
  if (!FORM_TYPES.has(formTypeRaw as LeadForwardPayloadV2['formType'])) {
    addFieldError(errors, 'formType', 'Unsupported formType.');
  }

  const sri_lead_id = getRequiredTrimmed(input, 'sri_lead_id', 'sri_lead_id', errors);
  const submittedAt = getRequiredTrimmed(input, 'submittedAt', 'submittedAt', errors);

  const sourceRaw = isRecord(input.source) ? input.source : {};
  const page = getRequiredTrimmed(sourceRaw, 'page', 'source.page', errors);
  const gclid = getOptionalTrimmed(sourceRaw, 'gclid');
  const gbraid = getOptionalTrimmed(sourceRaw, 'gbraid');
  const wbraid = getOptionalTrimmed(sourceRaw, 'wbraid');
  const utm_source = getOptionalTrimmed(sourceRaw, 'utm_source');
  const utm_medium = getOptionalTrimmed(sourceRaw, 'utm_medium');
  const utm_campaign = getOptionalTrimmed(sourceRaw, 'utm_campaign');
  const utm_term = getOptionalTrimmed(sourceRaw, 'utm_term');
  const utm_content = getOptionalTrimmed(sourceRaw, 'utm_content');
  const landing_page = getOptionalTrimmed(sourceRaw, 'landing_page');
  const referrer = getOptionalTrimmed(sourceRaw, 'referrer');
  const ua = getOptionalTrimmed(sourceRaw, 'ua');
  const tz = getOptionalTrimmed(sourceRaw, 'tz');
  let details = normalizeDetails(input.details);
  const feedbackMessage = trimString(details.message);
  if (formTypeRaw === 'feedback') {
    if (!feedbackMessage) {
      addFieldError(errors, 'details.message', 'Message is required.');
    } else {
      details = { ...details, message: feedbackMessage };
    }
  }
  if (formTypeRaw === 'referral') {
    const referredHomeownerRaw = isRecord(details.referredHomeowner) ? details.referredHomeowner : {};
    const referredHomeownerPhone = getOptionalTrimmed(referredHomeownerRaw, 'phone');
    if (!referredHomeownerPhone) {
      addFieldError(errors, 'details.referredHomeowner.phone', 'Homeowner phone is required.');
    } else if (!isUsPhoneComplete(referredHomeownerPhone)) {
      addFieldError(errors, 'details.referredHomeowner.phone', 'Homeowner phone must include 10 digits (US only).');
    } else {
      details = {
        ...details,
        referredHomeowner: {
          ...referredHomeownerRaw,
          phone: normalizePhoneForSubmit(referredHomeownerPhone),
        },
      };
    }
  }

  const contactRaw = isRecord(input.contact) ? input.contact : {};
  const firstName = getRequiredTrimmed(contactRaw, 'firstName', 'contact.firstName', errors);
  const lastName = getRequiredTrimmed(contactRaw, 'lastName', 'contact.lastName', errors);
  const email = getRequiredTrimmed(contactRaw, 'email', 'contact.email', errors);
  if (email && !isEmailComplete(email)) {
    addFieldError(errors, 'contact.email', 'Email must be valid.');
  }
  let phone = getOptionalTrimmed(contactRaw, 'phone');
  if (!phone) {
    addFieldError(errors, 'contact.phone', 'Phone is required.');
  } else if (!isUsPhoneComplete(phone)) {
    addFieldError(errors, 'contact.phone', 'Phone must include 10 digits (US only).');
  } else {
    phone = normalizePhoneForSubmit(phone);
  }

  const smsRaw = isRecord(input.smsConsent) ? input.smsConsent : {};
  const projectSmsRaw = trimString(smsRaw.projectSms);
  const marketingSmsRaw = trimString(smsRaw.marketingSms);
  if (!SMS_CHOICES.has(projectSmsRaw as LeadForwardPayloadV2['smsConsent']['projectSms'])) {
    addFieldError(errors, 'smsConsent.projectSms', 'Expected "yes" or "no".');
  }
  if (!SMS_CHOICES.has(marketingSmsRaw as LeadForwardPayloadV2['smsConsent']['marketingSms'])) {
    addFieldError(errors, 'smsConsent.marketingSms', 'Expected "yes" or "no".');
  }

  const antiSpamRaw = isRecord(input.antiSpam) ? input.antiSpam : {};
  const cfToken = getRequiredTrimmed(antiSpamRaw, 'cfToken', 'antiSpam.cfToken', errors);
  const hp_field = getOptionalTrimmed(antiSpamRaw, 'hp_field');

  const addressRaw = isRecord(input.address) ? input.address : null;
  const address1 = addressRaw ? getOptionalTrimmed(addressRaw, 'address1') : undefined;
  const address2 = addressRaw ? getOptionalTrimmed(addressRaw, 'address2') : undefined;
  const city = addressRaw ? getOptionalTrimmed(addressRaw, 'city') : undefined;
  const state = addressRaw ? getOptionalTrimmed(addressRaw, 'state') : undefined;
  const zip = addressRaw ? getOptionalTrimmed(addressRaw, 'zip') : undefined;

  if (Object.keys(errors).length) {
    return { ok: false, message: 'Validation failed', fieldErrors: errors };
  }

  const payload: LeadForwardPayloadV2 = {
    version: 'v2',
    sri_lead_id,
    lead_source: gclid || gbraid || wbraid ? 'google_ads' : 'seo',
    formType: formTypeRaw as LeadForwardPayloadV2['formType'],
    submittedAt,
    source: {
      page,
      ...(gclid ? { gclid } : {}),
      ...(gbraid ? { gbraid } : {}),
      ...(wbraid ? { wbraid } : {}),
      ...(utm_source ? { utm_source } : {}),
      ...(utm_medium ? { utm_medium } : {}),
      ...(utm_campaign ? { utm_campaign } : {}),
      ...(utm_term ? { utm_term } : {}),
      ...(utm_content ? { utm_content } : {}),
      ...(landing_page ? { landing_page } : {}),
      ...(referrer ? { referrer } : {}),
      ...(ua ? { ua } : {}),
      ...(tz ? { tz } : {}),
    },
    contact: {
      firstName,
      lastName,
      email,
      phone: phone || '',
    },
    smsConsent: {
      projectSms: projectSmsRaw as LeadForwardPayloadV2['smsConsent']['projectSms'],
      marketingSms: marketingSmsRaw as LeadForwardPayloadV2['smsConsent']['marketingSms'],
      disclosureVersion: 'sms-consent-v1',
    },
    details,
    antiSpam: {
      cfToken,
      ...(hp_field ? { hp_field } : {}),
    },
  };

  const hasAddress = Boolean(address1 || address2 || city || state || zip);
  if (hasAddress) {
    payload.address = {
      ...(address1 ? { address1 } : {}),
      ...(address2 ? { address2 } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(zip ? { zip } : {}),
    };
  }

  return { ok: true, data: payload };
}

type TurnstileResponse = { success: boolean; 'error-codes'?: string[] };

async function verifyTurnstile(token: string, remoteip?: string | null) {
  const secret = TURNSTILE_SECRET || process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, error: 'Server misconfigured (Turnstile secret)' } as const;

  const body = new URLSearchParams();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteip) body.append('remoteip', remoteip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    cache: 'no-store',
  });

  if (!res.ok) return { ok: false, error: `Turnstile verify failed (${res.status})` } as const;

  let data: TurnstileResponse;
  try {
    data = (await res.json()) as TurnstileResponse;
  } catch {
    return { ok: false, error: 'Turnstile: invalid response' } as const;
  }

  if (!data.success) {
    return { ok: false, error: `Turnstile: ${data['error-codes']?.join(', ') || 'unknown'}` } as const;
  }
  return { ok: true } as const;
}

async function forwardToN8n(payload: LeadForwardPayloadV2) {
  // Preview delivery requires matching build/runtime switches and the exact
  // sandbox receiver. It can never fall back to the production lead router.
  if (process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === '1' && !isProdEnv()) {
    if (process.env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS === '1') {
      if (process.env.SONSHINE_PREVIEW_DELIVERY !== 'sandbox' ||
        N8N_WEBHOOK_URL !== 'https://n8n.borntregerdigital.com/webhook/sonshine-workers-preview') {
        return { ok: false, status: 503, error: 'Preview sandbox delivery is not configured' } as const;
      }
    } else {
      if (process.env.SONSHINE_PREVIEW_DISCARD_LEADS !== '1') {
        return { ok: false, status: 503, error: 'Preview submissions are disabled' } as const;
      }
      return { ok: true } as const;
    }
  }
  if (!N8N_WEBHOOK_URL || !N8N_WEBHOOK_SECRET) {
    console.error('forwardToN8n: missing webhook configuration');
    return { ok: false, status: 500, error: 'Server misconfigured (n8n webhook)' } as const;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ss-secret': N8N_WEBHOOK_SECRET,
        origin: SITE_ORIGIN,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    const dataRecord = isRecord(data) ? data : {};
    const explicitFailure = dataRecord.ok === false;
    const errorMessage =
      typeof dataRecord.error === 'string'
        ? dataRecord.error
        : `Upstream send failed (${res.status})`;

    if (!res.ok || explicitFailure) {
      console.error('forwardToN8n: upstream rejected lead', {
        status: res.status,
        explicitFailure,
        error: errorMessage,
      });
      return { ok: false, status: res.status || 502, error: errorMessage } as const;
    }
    return { ok: true } as const;
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('forwardToN8n: upstream timeout');
      return { ok: false, status: 504, error: 'Upstream timeout' } as const;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('Lead forward error', err);
    }
    return { ok: false, status: 502, error: 'Upstream error' } as const;
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = resolveRequestOrigin(req);
  const allow = getAllowedOrigins();
  const allowOrigin = origin && allow.includes(origin) ? origin : allow[0] || '*';

  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': allowOrigin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '600',
    },
  });
}

export async function POST(req: NextRequest) {
  const allow = getAllowedOrigins();
  if (allow.length) {
    const origin = resolveRequestOrigin(req);
    if (origin && !allow.includes(origin)) {
      return json(403, { ok: false, error: 'Forbidden origin' });
    }
  }

  const body = await readBoundedJsonBody(req);
  if (!body.ok) {
    if (body.reason === 'too_large') {
      return json(413, { ok: false, error: 'Payload too large' });
    }
    return json(400, { ok: false, error: 'Invalid JSON' });
  }
  const raw = body.value;

  if (isRecord(raw) && isHoneypotTrippedV2(raw)) {
    return json(200, { ok: true });
  }

  const parsed = validateLeadForwardPayload(raw);
  if (!parsed.ok) {
    return json(400, { ok: false, error: parsed.message, fieldErrors: parsed.fieldErrors });
  }

  const verify = await verifyTurnstile(parsed.data.antiSpam.cfToken, getClientIp(req));
  if (!verify.ok) {
    return json(400, { ok: false, error: verify.error || 'Turnstile verification failed' });
  }

  const forwarded = await forwardToN8n(parsed.data);
  if (!forwarded.ok) {
    return json(forwarded.status, { ok: false, error: forwarded.error });
  }

  return json(200, { ok: true });
}

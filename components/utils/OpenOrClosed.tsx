'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { CONTACT_TIME_ZONE, OFFICE_HOURS, type WeeklyHours } from "@/lib/contact-hours";

// STYLES
  const baseStyles =
    'inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1 font-medium';
  const openStyles =
    'border-green-200 bg-green-50 text-green-700';
  const closedStyles =
    'border-red-200 bg-red-50 text-red-700';
  const helperTextStyles = 
    'block my-1 text-sm text-slate-500';

type OpenOrClosedProps = {
  /**
   * Weekly schedule, keyed by weekday number (0 = Sunday ... 6 = Saturday).
   * Times are 24h "HH:mm" strings in the given timeZone.
   */
  hours?: WeeklyHours;
  /**
   * IANA time zone for business location. Sarasota uses America/New_York.
   */
  timeZone?: string;
  /**
   * YYYY-MM-DD dates that should be treated as closed, in the given timeZone.
   */
  holidayClosures?: string[];
  /**
   * MM-DD dates that should be treated as closed every year, in the given timeZone.
   */
  recurringClosures?: string[];
  /**
   * Optional wrapper className.
   */
  className?: string;
  /**
   * Hide helper text so only the status pill renders.
   */
  hideHelperText?: boolean;
};

const subscribeClock = (notify: () => void) => {
  const timer = setInterval(notify, 1000);
  return () => clearInterval(timer);
};
const clockSnapshot = () => Math.floor(Date.now() / 60_000);
const serverClockSnapshot = () => null;


function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return h * 60 + (m || 0);
}

function formatTime(d: Date, tz: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(d);
}

function withTime(d: Date, tz: string, hhmm: string) {
  // Build a Date corresponding to the same calendar day as `d` in tz,
  // but at the provided HH:mm time (tz-local).
  const base = new Date(d.toLocaleString('en-US', { timeZone: tz }));
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  base.setHours(h, m || 0, 0, 0);
  return base;
}

function dateKey(d: Date, tz: string) {
  // YYYY-MM-DD string for the calendar date in the target timezone.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

type Status =
  | { kind: 'open'; closesAt: Date }
  | { kind: 'closed'; nextOpensAt: Date | null };

function isHolidayClosed(now: Date, tz: string, holidayClosures: string[]) {
  if (!holidayClosures || holidayClosures.length === 0) return false;
  return holidayClosures.includes(dateKey(now, tz));
}

function monthDayKey(d: Date, tz: string) {
  // MM-DD string for the calendar date in the target timezone.
  const base = new Date(d.toLocaleString('en-US', { timeZone: tz }));
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${m}-${day}`;
}

function isRecurringClosed(now: Date, tz: string, recurringClosures: string[]) {
  if (!recurringClosures || recurringClosures.length === 0) return false;
  return recurringClosures.includes(monthDayKey(now, tz));
}

function computeStatus(
  now: Date,
  tz: string,
  hours: WeeklyHours,
  holidayClosures: string[],
  recurringClosures: string[],
): Status {
  const day = now.getDay();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const isClosedToday =
    isHolidayClosed(now, tz, holidayClosures) ||
    isRecurringClosed(now, tz, recurringClosures);

  // 1) Check today's intervals
  const todays = isClosedToday ? [] : (hours[day] || []);
  if (!isClosedToday) {
    for (const itv of todays) {
      const start = toMinutes(itv.open);
      const end = toMinutes(itv.close);
      if (minutesNow >= start && minutesNow < end) {
        return { kind: 'open', closesAt: withTime(now, tz, itv.close) };
      }
      if (minutesNow < start) {
        // still closed but opens later today
        return { kind: 'closed', nextOpensAt: withTime(now, tz, itv.open) };
      }
    }
  }

  // 2) Find next opening within the next 7 days
  for (let i = 1; i <= 7; i++) {
    const future = new Date(now);
    future.setDate(now.getDate() + i);
    const wd = future.getDay();
    const list = hours[wd] || [];
    const isFutureClosed =
      isHolidayClosed(future, tz, holidayClosures) ||
      isRecurringClosed(future, tz, recurringClosures);
    if (!isFutureClosed && list.length > 0) {
      return { kind: 'closed', nextOpensAt: withTime(future, tz, list[0].open) };
    }
  }

  return { kind: 'closed', nextOpensAt: null }; // no hours configured
}

export default function OpenOrClosed({
  hours = OFFICE_HOURS,
  timeZone = CONTACT_TIME_ZONE,
  holidayClosures = [],
  recurringClosures = [],
  className = '',
  hideHelperText = false,
}: OpenOrClosedProps) {
  // A stable minute snapshot preserves the server placeholder and updates at minute boundaries.
  const minute = useSyncExternalStore(subscribeClock, clockSnapshot, serverClockSnapshot);
  const now = useMemo(() => minute === null ? null : new Date(
    new Date(minute * 60_000).toLocaleString('en-US', { timeZone }),
  ), [minute, timeZone]);

  const status: Status | null = useMemo(() => {
    if (!now) return null;
    return computeStatus(now, timeZone, hours, holidayClosures, recurringClosures);
  }, [now, timeZone, hours, holidayClosures, recurringClosures]);

  if (!status) {
    return (
      <div
        className={`grid items-center gap-3 ${className}`}
        aria-live="polite"
      >
        <span
          className={`${baseStyles} border-slate-200 bg-slate-50 text-slate-600`}
        >
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Checking hours…
        </span>
      </div>
    );
  }

  if (status.kind === 'open') {
    const closes = formatTime(status.closesAt, timeZone);
    return (
      <div
        className={`text-[1.05rem] grid items-center gap-x-3 gap-y-2 ${className}`}
        aria-live="polite"
      >
        <span
          className={`${baseStyles} ${openStyles}`}
          aria-label={`We are in the office and ready to take your call! Open until ${closes}.`}
        >
          <span className="h-2 w-2 rounded-full bg-green-500 open-or-closed__dot" />
          <span>Open now</span>
          <span className="text-green-600/70">·</span>
          <span className="text-green-700/80">until {closes}</span>
        </span>
        {!hideHelperText && (
          <span className={helperTextStyles}>
            We are in the office and ready to take your call!
          </span>
        )}
        <style jsx>{`
          @keyframes open-or-closed-blink {
            0%, 55% {
              opacity: 1;
            }
            65%, 100% {
              opacity: 0.2;
            }
          }

          .open-or-closed__dot {
            animation: open-or-closed-blink 1.8s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  const next = status.nextOpensAt;
  const nextText = next
    ? `Opens ${new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone,
      }).format(next)}`
    : 'Closed';

  return (
    <div
      className={`grid items-center gap-x-3 gap-y-2 ${className}`}
      aria-live="polite"
    >
      <span
        className={`${baseStyles} ${closedStyles}`}
        aria-label={`Closed now. ${next ? nextText + '. ' : ''}Fill out the form below and we will get back to you ASAP.`}
      >
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span>Closed</span>
        {next && (
          <>
            <span className="text-red-600/70">·</span>
            <span className="text-red-700/80">{nextText}</span>
          </>
        )}
      </span>
      {!hideHelperText && (
        <span className={helperTextStyles}>
          Fill out the form below and we will get back to you ASAP
        </span>
      )}
    </div>
  );
}

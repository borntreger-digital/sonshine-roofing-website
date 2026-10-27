'use client';

import { useEffect } from 'react';
import { useHydrated } from '@/lib/ui/use-hydrated';
import Script from 'next/script';
import { isProdEnv, isSiteHost } from '@/lib/seo/site';
import type { GtmWindow } from '@/lib/telemetry/gtm';

const GTM = (process.env.NEXT_PUBLIC_GTM_ID || '').trim();
const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();
// Client environment values need static references for both Next and Vite.
const PREVIEW_ENABLED = ['true', '1', 'yes'].includes(
  (process.env.NEXT_PUBLIC_ENABLE_GTM_PREVIEW || '').toLowerCase(),
);

if (isProdEnv() && typeof console !== 'undefined' && typeof console.error === 'function') {
  if (!GTM) console.error('[env] Missing required environment variable: NEXT_PUBLIC_GTM_ID');
  if (!META_PIXEL_ID)
    console.error('[env] Missing required environment variable: NEXT_PUBLIC_META_PIXEL_ID');
}

function ensureGtmGlobals(win: GtmWindow) {
  win.dataLayer = win.dataLayer ?? [];
  win.__gtmQueue = win.__gtmQueue ?? [];
  if (typeof win.__gtmLoaded !== 'boolean') {
    win.__gtmLoaded = false;
  }
}

export function flushQueuedEvents(win: GtmWindow) {
  if (!win.dataLayer) {
    win.dataLayer = [];
  }
  const queue = win.__gtmQueue;
  if (!queue || queue.length === 0) return;

  while (queue.length > 0) {
    const event = queue.shift();
    if (event) {
      win.dataLayer.push(event);
    }
  }
}

export default function AnalyticsScripts({ enabled }: { enabled: boolean }) {
  // Enable only in production by default; allow preview on staging if explicitly toggled and host is allowed
  // Static HTML cannot know its eventual browser hostname. Hydrate the same
  // empty boundary first, then enable tracking only on the actual allowed host.
  const hydrated = useHydrated();
  const previewOrigin = process.env.NEXT_PUBLIC_PREVIEW_ORIGIN;
  const previewAllowed = process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === '1' &&
    process.env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS === '1' &&
    hydrated && window.location.origin === previewOrigin;
  const HOST_ALLOWED = hydrated && (isSiteHost(window.location.hostname) || previewAllowed);
  const ENABLED =
    enabled && HOST_ALLOWED && (isProdEnv() || PREVIEW_ENABLED);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as GtmWindow;
    ensureGtmGlobals(win);
  }, []);

  if (!GTM || !META_PIXEL_ID || !ENABLED) return null;

  return (
    <>
      {/* Google Tag Manager – head snippet (lazyOnload) */}
      <Script
        id="gtm-init"
        strategy="lazyOnload"
        onLoad={() => {
          if (typeof window === 'undefined') return;
          const win = window as GtmWindow;
          ensureGtmGlobals(win);
          win.__gtmLoaded = true;
          flushQueuedEvents(win);
        }}
        onReady={() => {
          if (typeof window === 'undefined') return;
          const win = window as GtmWindow;
          ensureGtmGlobals(win);
          win.__gtmLoaded = true;
          flushQueuedEvents(win);
        }}
      >
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM}');
        `}
      </Script>
      {/* Meta Pixel */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView', {value: 100.00, currency: 'USD'});
        `}
      </Script>
      {/* Google Tag Manager (noscript) – place near start of body */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
      <noscript>
        {/* eslint-disable-next-line */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

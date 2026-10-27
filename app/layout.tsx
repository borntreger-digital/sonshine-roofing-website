import "./globals.css";
import { inter, candara } from "@/lib/ui/fonts";
import HashAnchorScroller from "@/components/utils/HashAnchorScroller";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${candara.variable}`}
    >
      <body className={`min-h-svh bg-white text-slate-900 antialiased${process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === '1' ? ' pb-16' : ''}`}>
        {process.env.NEXT_PUBLIC_ISOLATED_PREVIEW === '1' ? (
          <aside className="fixed inset-x-0 bottom-0 z-50 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950" aria-label="Preview notice">
            {process.env.NEXT_PUBLIC_PREVIEW_INTEGRATIONS === '1'
              ? 'Preview: website forms go to the n8n sandbox. QuickQuote is live; do not submit.'
              : 'Preview for testing. Form submissions are discarded; QuickQuote is disabled.'}
          </aside>
        ) : null}
        <HashAnchorScroller />
        {children}
      </body>
    </html>
  );
}

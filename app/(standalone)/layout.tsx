import type { Metadata, Viewport } from 'next';
import { getWebsitePageMetadata } from '@/lib/content/directus-site';

export async function generateMetadata(): Promise<Metadata> {
  const description =
    'Real-world 800-wheel-horsepower ProCharged GMC Sierra Denali with 4WD traction, daily drivability, and a fully built 6.2L.';
  const metadata = await getWebsitePageMetadata({
    title: 'Performance Truck for Sale | ProCharged GMC Sierra Denali',
    description,
    path: '/truck-for-sale',
    robots: { index: false, follow: false },
  });

  // Keep exact prices out of search and sharing previews too. The CMS can still
  // contain an older asking price, so override its descriptions for this listing.
  // Before restoring public pricing, confirm the amount and update both the page
  // and CMS descriptions, then remove these description overrides together.
  return {
    ...metadata,
    description,
    openGraph: { ...metadata.openGraph, description },
    twitter: { ...metadata.twitter, description },
  };
}

export const viewport: Viewport = {
  themeColor: [{ color: '#ecfeff' }],
};

export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-cyan-50 text-slate-900 antialiased">{children}</div>;
}

import Section from '@/components/layout/Section';
import Hero from '@/components/ui/Hero';
import StaticImage from '@/components/media/StaticImage';
import { ArrowUpRight, ChartSpline, Map, Truck, Zap } from 'lucide-react';
import SmartLink from '@/components/utils/SmartLink';
import { VideoWithSchema } from '@/components/utils/VideoWithSchema';
import ProjectGallery from '@/components/dynamic-content/project/ProjectGallery';
import { staticImage } from '@/lib/content/static-media';

const PRICE = '$52,500';
const TRUCK_TITLE = '2020 GMC Sierra 1500 Denali';

const comparisonRows = [
  {
    truck: 'GMC Sierra Denali (ProCharged 6.2L)*',
    drivetrain: '4WD',
    whp: '~800 whp',
    crank: '~1,025 - 1,070 hp (est.)',
  },
  { truck: 'Ram TRX*', drivetrain: '4WD', whp: '~580 - 590 whp', crank: '702 hp' },
  { truck: 'Ford Raptor R*', drivetrain: '4WD', whp: '~570 - 590 whp', crank: '700 - 720 hp' },
  {
    truck: 'Shelby F-150 Super Snake*',
    drivetrain: '4WD',
    whp: '~650 - 700 whp',
    crank: '~770 - 785 hp',
  },
];

const buildSheet = [
  {
    title: 'Engine & induction',
    items: [
      '6.2L Texas Speed sleeved short block (~1,800 miles)',
      'Texas Speed Stage 3 cam',
      'ProCharger D-1X',
      'Engine built to support a 1,000+ horsepower tune',
    ],
  },
  {
    title: 'Fuel & air',
    items: [
      'LT4 injectors',
      'LT4 high pressure fuel pump',
      'Custom in-tank dual fuel pump with new braided fuel lines',
      'Methanol dual spray injection by AlkyControl',
    ],
  },
  {
    title: 'Exhaust & sound',
    items: [
      'Kooks long tube headers',
      'Full exhaust by Boral (no cats)',
      'Distinct idle shake, supercharger whine, and rowdy 4WD launches',
    ],
  },
  {
    title: 'Driveline & suspension',
    items: [
      'Carbon fiber driveshaft by Gulfcoast Driveshaft',
      'IHC 3/5" lowering kit with air-adjustable rear bags',
      'Heavy duty tie rods',
      'Traction bars',
    ],
  },
  {
    title: 'Transmission',
    items: ['Built transmission installed at 43,300 miles by Burks Transmission (Sarasota)'],
  },
  {
    title: 'Provenance',
    items: [
      'All engine and performance work completed by K9 Motorworks in Fort Myers',
      'Professionally built with no shortcuts',
      'Other supporting upgrades not listed plus select OEM parts retained',
    ],
  },
];

const truckGalleryImages = [
  'static:black-pickup-truck-side-view',
  'static:black-gmc-sierra-denali-rear-view',
  'static:black-denali-pickup-side-profile',
  'static:black-gmc-pickup-front-view',
  'static:pickup-truck-front-seat-interior',
  'static:pickup-truck-rear-seat-interior',
  'static:pickup-truck-trip-and-fuel-economy-display',
  'static:pickup-truck-open-tailgate-and-bed',
  'static:procharger-supercharger-label',
  'static:aeromotive-pressure-regulator-and-gauge',
  'static:alkycontrol-engine-bay-reservoir',
  'static:pickup-truck-surround-view-camera-display',
  'static:gulfcoast-driveshaft-label',
  'static:pickup-truck-drivetrain-underbody',
  'static:pickup-truck-underbody-side',
  'static:pickup-truck-drag-racing-time-slips',
  'static:gmc-sierra-denali-window-sticker',
  'static:dynamometer-results-monitor',
].map((key) => {
  const media = staticImage(key);
  return { url: media.url, altText: media.description, width: media.width, height: media.height, staticMedia: media };
});

export default async function Page() {
  return (
    <>
      <div id="truck-offer" className="scroll-mt-24">
        <Hero
          title="Performance Truck for Sale"
          subtitle="Real-world 800-wheel-horsepower GMC Sierra Denali that can be driven every day—comfort, 4WD traction, and a professionally built ProCharged 6.2L."
          eyelash="The 'Frankenstein Truck'"
          imageSrc="static:black-gmc-denali-front-quarter-view"
          justifyStart
          badges={[
            { icon: Map, label: '53,334 chassis miles' },
            { icon: Truck, label: '4WD' },
            { icon: ChartSpline, label: '~1,025 - 1,070 hp (est.)' },
            { icon: Zap, label: '~800 whp (real)' },
          ]}
        >
          <div className="flex gap-6 flex-wrap max-w-3xl">
            <div>
              <p className="italic text-xl text-slate-300">
                Current Price{' '}
                <span className="text-slate-400 not-italic text-sm">(Cash only, no trades)</span>
              </p>
              <p className="text-blue-400 mt-2 text-5xl">{PRICE}</p>
              <p className="mt-6 text-2xl font-semibold">
                Interested? Call or Text Nathan Borntreger:{' '}
                <SmartLink href="tel:+19417354947" className="text-blue-400 font-bold">
                  (941) 735-4947
                </SmartLink>
              </p>
            </div>
          </div>
        </Hero>
      </div>

      <Section>
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-8">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Performance comparison (real-world)
                </h2>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-800">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Truck</th>
                      <th className="px-4 py-2 font-semibold">Drivetrain</th>
                      <th className="px-4 py-2 font-semibold">Wheel Horsepower (real)</th>
                      <th className="px-4 py-2 font-semibold">Crank Horsepower</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {comparisonRows.map((row) => (
                      <tr key={row.truck}>
                        <td className="px-4 py-3 font-semibold">{row.truck}</td>
                        <td className="px-4 py-3">{row.drivetrain}</td>
                        <td className="px-4 py-3">{row.whp}</td>
                        <td className="px-4 py-3">{row.crank}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 text-xs text-slate-600">
                * All performance figures are estimates based on dyno results and typical drivetrain
                loss.
              </div>
            </div>

            <div className="max-w-full overflow-hidden rounded-xl border border-slate-200">
              <VideoWithSchema
                videoId="85KrYY_U6N4"
                title={TRUCK_TITLE}
                className="aspect-video"
                query={{ autoplay: 0, mute: 0, controls: 1, loop: 0 }}
              />
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-semibold text-slate-900">
                  Build sheet (K9 Motorworks, Fort Myers)
                </h2>
                <p className="mt-2 text-base text-slate-700">
                  All engine and performance work was completed professionally. Additional
                  supporting upgrades and select OEM parts are included beyond what is listed here.
                </p>
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 my-8">
                  <div className="relative aspect-video w-full">
                    <StaticImage crop
                      src="static:pickup-truck-engine-bay-supercharger"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 960px"
                      priority
                    />
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
                  <ul className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <li>2020 GMC Sierra 1500 Denali</li>
                    <li>53,334 chassis miles</li>
                    <li>4WD</li>
                    <li>ProCharged 6.2L</li>
                    <li>~800 wheel horsepower</li>
                    <li>~1,025 - 1,070 crank horsepower (est.)</li>
                    <li>Texas Speed sleeved short block with ~1,800 miles</li>
                    <li>Built transmission installed at 43,300 miles by Burks Transmission</li>
                    <li>All engine and performance work by K9 Motorworks, Fort Myers</li>
                    <li>Engine built to support a 1,000+ horsepower tune</li>
                  </ul>
                </div>

                <div className="overflow-hidden rounded-xl mt-8 border border-slate-200">
                  <VideoWithSchema
                    videoId="aODl4r7ftfc"
                    title={TRUCK_TITLE}
                    className="aspect-9/16 rounded-none"
                    query={{ autoplay: 0, mute: 0, controls: 1, loop: 0 }}
                  />
                </div>

                <div className="grid gap-4 mt-8 md:grid-cols-2">
                  {buildSheet.map((section) => (
                    <div
                      key={section.title}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
                    >
                      <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky top-8 self-start min-w-0 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xs">
              <h2 className="text-3xl text-white font-semibold mb-2">Price & terms</h2>
              <p className="text-xl font-semibold mb-2 text-slate-200">Serious interest only.</p>
              <p className="text-slate-200 text-lg">
                {`Asking ${PRICE} — cash only — no trades. Vehicle is sold as-is.`}
              </p>
              <p className="mt-6 text-xl text-white font-semibold">Interested?</p>
              <p className="mt-3 text-slate-300 font-semibold text-lg">
                Call or Text Nathan Borntreger:{' '}
                <SmartLink href="tel:+19417354947" className="text-blue-400 font-bold">
                  (941) 735-4947
                </SmartLink>
              </p>
            </div>
          </div>
        </div>

      </Section>

      <Section>
        <ProjectGallery images={truckGalleryImages} projectTitle={TRUCK_TITLE} />
      </Section>

      <Section className="bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-center text-white">
          <p className="text-lg font-semibold">Ready to feel 800 wheel horsepower again?</p>
          <p className="text-sm text-slate-200">
            Jump back to the price and contact details at the top.
          </p>
          <SmartLink
            href="#truck-offer"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-600 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-blue-300"
          >
            Back to the offer
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </SmartLink>
        </div>
      </Section>
    </>
  );
}

export const revalidate = false;

export const dynamic = 'force-static';

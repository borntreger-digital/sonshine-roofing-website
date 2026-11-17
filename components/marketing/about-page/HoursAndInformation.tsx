import { listCoverageAreas } from '@/lib/content/locations';
import SmartLink from '@/components/utils/SmartLink';
import { Accordion } from '@/components/ui/Accordion';
import { OFFICE_HOURS_LONG, PHONE_HOURS_LABEL } from '@/lib/contact-hours';
import { getSiteSettings, type SiteSettingsLink } from '@/lib/content/directus-site';
import {
  ArrowDown,
  BadgePercent,
  Clock,
  CreditCard,
  Hammer,
  Languages,
  MapPin,
  Tag,
  Users,
} from 'lucide-react';

const h2Styles = 'mb-8 text-center text-4xl';
const pillarsGrid = 'mt-4 grid grid-cols-1 gap-4 items-stretch';
const pStyles = 'text-lg list-disc pl-5 space-y-1 marker:text-slate-400';
const linkStyles = 'text-(--brand-blue) icon-affordance';

function SettingsLinks({ items }: { items: SiteSettingsLink[] }) {
  return (
    <ul className={pStyles}>
      {items.map((item) => (
        <li key={`${item.label}:${item.href ?? ''}`}>
          {item.href ? (
            <SmartLink
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={linkStyles}
              showExternalIcon={/^https?:\/\//i.test(item.href)}
              data-icon-affordance={/^https?:\/\//i.test(item.href) ? 'up-right' : undefined}
            >
              {item.label}
            </SmartLink>
          ) : (
            item.label
          )}
        </li>
      ))}
    </ul>
  );
}

export async function HoursAndInformation() {
  const settings = await getSiteSettings();

  return (
    <div>
      <div id="hours-and-information">
        <h2 className={h2Styles}>
          Hours and Information
          <ArrowDown className="h-8 w-8 inline ml-2 text-(--brand-blue)" />
        </h2>
      </div>

      <div className={pillarsGrid}>
        <Accordion
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          summary={<h3 className="text-2xl">Hours of Operation</h3>}
          radius="xl"
          proseBody={false}
          defaultOpen
          tone="soft"
        >
          <div className="mt-2 space-y-4 text-lg text-slate-700">
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">Office</p>
              <p className="text-slate-600">{OFFICE_HOURS_LONG.weekday}</p>
              <p className="text-slate-600">{OFFICE_HOURS_LONG.weekend}</p>
            </div>
            <p className="text-slate-600">
              <span className="font-semibold text-slate-900">Phone</span>, {PHONE_HOURS_LABEL}
            </p>
          </div>
        </Accordion>

        <Accordion
          icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
          summary={<h3 className="text-2xl">Service Areas</h3>}
          radius="xl"
          proseBody={false}
          tone="soft"
        >
          <SettingsLinks items={listCoverageAreas().map(area => ({ label: area.name, href: area.href }))} />
        </Accordion>

        <Accordion
          icon={<Tag className="h-5 w-5" aria-hidden="true" />}
          summary={<h3 className="text-2xl">Brands</h3>}
          radius="xl"
          proseBody={false}
          tone="soft"
        >
          <SettingsLinks items={settings?.brandsUsed ?? []} />
        </Accordion>

        <Accordion
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          summary={<h3 className="text-2xl">Associations</h3>}
          radius="xl"
          proseBody={false}
          tone="soft"
        >
          <SettingsLinks items={settings?.associations ?? []} />
        </Accordion>

        <Accordion
          icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
          summary={<h3 className="text-2xl">Payment Types</h3>}
          radius="xl"
          proseBody={false}
          tone="soft"
        >
          <SettingsLinks items={settings?.paymentMethods ?? []} />
        </Accordion>

        <Accordion
          icon={<Hammer className="h-5 w-5" aria-hidden="true" />}
          summary={<h3 className="text-2xl">Roofing Services</h3>}
          radius="xl"
          proseBody={false}
          tone="soft"
        >
          <SettingsLinks items={settings?.services ?? []} />
        </Accordion>

        <Accordion
          icon={<Languages className="h-5 w-5" aria-hidden="true" />}
          summary={<h3 className="text-2xl">Languages</h3>}
          radius="xl"
          proseBody={false}
          tone="soft"
        >
          <ul className={pStyles}>
            {settings?.languagesServed.map((language) => (
              <li key={language}>{language}</li>
            ))}
          </ul>
        </Accordion>

        <Accordion
          icon={<BadgePercent className="h-5 w-5" aria-hidden="true" />}
          summary={<h3 className="text-2xl">Discounts</h3>}
          radius="xl"
          proseBody={false}
          tone="soft"
        >
          <SettingsLinks items={settings?.discounts ?? []} />
        </Accordion>
      </div>
    </div>
  );
}

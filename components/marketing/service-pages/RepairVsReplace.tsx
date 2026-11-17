import { Accordion } from "@/components/ui/Accordion";
import { Hammer, House, ArrowLeftRight } from "lucide-react";

const iconStyles = "h-5 w-5 text-(--brand-blue)";
const cardStyles = "rounded-xl border border-blue-200 bg-white p-4 h-fit";

const accordionDefaults = {
    radius: "2xl" as const,
    tone: "soft" as const,
    size: "sm" as const,
    proseBody: false,
    summaryClassName: "text-[1rem]",
};

const decisionSections = [
    {
        id: "repair",
        icon: Hammer,
        heading: "Repair when...",
        items: [
            {
                summary: "The damage is localized",
                description:
                    "A few missing shingles, a small leak, or minor flashing issues can often be fixed without needing a full tear-off.",
            },
            {
                summary: "The roof is relatively new",
                description:
                    "If your roof is under 10–12 years old and generally in good shape, targeted repairs can extend its life without breaking the bank.",
            },
            {
                summary: "You’re not seeing recurring issues",
                description:
                    "If this is your first leak or concern—and not part of a pattern—repairing the trouble spot may be all that’s needed.",
            },
            {
                summary: "Your budget is tight (but the roof still has life)",
                description:
                    "Repairs can be a cost-effective short-term solution when full replacement isn’t financially feasible—just know it’s a Band-Aid, not a cure-all.",
            },
            {
                summary: "You need to buy time for other priorities",
                description:
                    "Selling soon? Planning a full remodel later? Repairs can bridge the gap while keeping your home protected and insurable.",
            },
        ],
    },
    {
        id: "replace",
        icon: House,
        heading: "Replace when...",
        items: [
            {
                summary: "The roof is nearing the end of its lifespan",
                description:
                    "Most shingle roofs last 15–25 years. If yours is in that range (or older), a full replacement may be smarter than patchwork repairs.",
            },
            {
                summary: "You’re seeing widespread damage",
                description:
                    "Curling shingles, granule loss, sagging areas, or multiple leaks suggest structural wear that a patch can’t fix.",
            },
            {
                summary: "There’s repeated or chronic leaking",
                description:
                    "If you’ve had more than one leak in different areas, it usually means the whole system is breaking down—not just one bad spot.",
            },
            {
                summary: "Storm damage is severe or insurance-covered",
                description:
                    "After a hurricane or major windstorm, replacing the roof might be your best route—especially if a public adjuster confirms your policy will cover it.",
            },
            {
                summary: "You want to boost home value or energy efficiency",
                description:
                    "A new roof adds curb appeal, resale value, and can even reduce insurance premiums—especially with updated underlayments and ventilation.",
            },
        ],
    },
] as const;

export default async function RepairVsReplace() {
    return (
        <>
            <h2 id="repair-vs-replace" className="scroll-mt-28 text-center">
                <ArrowLeftRight className="h-6 w-6 mr-2 inline text-(--brand-blue)" />
                Repair vs. Replace
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
                {decisionSections.map(({ id, icon: Icon, heading, items }) => (
                    <div key={id} className={cardStyles}>
                        <span className="flex items-center gap-2">
                            <Icon className={iconStyles} aria-hidden="true" />
                            <h3 className="m-0 not-prose text-xl">{heading}</h3>
                        </span>
                        <div className="mt-2 space-y-2">
                            {items.map(({ summary, description }) => (
                                <Accordion key={summary} summary={<h4 className="text-xl">{summary}</h4>} {...accordionDefaults}>
                                    <p className="prose text-base text-slate-700 m-0">{description}</p>
                                </Accordion>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

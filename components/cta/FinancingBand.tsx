import { ArrowRight, HandCoins } from "lucide-react"
import SmartLink from "../utils/SmartLink"

export default function FinancingBand() {
    return (
        <div id="financing-band" className="my-6 rounded-xl bg-[#00e3fe]/10 border border-[#00e3fe]/60 p-4 not-prose">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="m-0 text-slate-800">
                    <strong>Prefer monthly payments?</strong> Explore our flexible financing options.
                </p>
                <SmartLink 
                    href="/financing" 
                    className="btn btn-sm btn-brand-blue h-11 px-5" 
                    aria-label="Explore financing options"
                    data-icon-affordance="right"
                    proseGuard
                    >
                        <HandCoins className="h-4 w-4 inline mr-2" />
                        Financing
                        <ArrowRight className="icon-affordance h-4 w-4 inline ml-2" />
                </SmartLink>
            </div>
        </div>

    )
}

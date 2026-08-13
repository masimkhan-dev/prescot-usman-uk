import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS, SITE_URL } from "@/lib/business";
import { RefreshCw, ShoppingBag, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: `Returns & Refund Policy | ${BUSINESS.name}` },
      {
        name: "description",
        content: `Returns & Refund Policy compliant with UK Consumer Rights Act 2015 for ${BUSINESS.name}.`,
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/refunds` }],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  return (
    <SiteLayout>
      <div className="bg-[#FAFAF9] border-b border-slate-200 py-12">
        <div className="container-page max-w-4xl">
          <div className="eyebrow mb-2">Consumer Guarantees</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">
            Returns & Refund Policy
          </h1>
          <p className="mt-2 text-slate-600 text-sm">
            Compliant with the UK Consumer Rights Act 2015 and Consumer Contracts Regulations.
          </p>
        </div>
      </div>

      <div className="container-page max-w-4xl py-12 space-y-8 text-slate-700 leading-relaxed text-sm md:text-base">
        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D92D20]" /> 1. Retail Device & Accessory Sales
            Returns
          </h2>
          <p>For pre-owned, refurbished devices, or accessories purchased in-store or online:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
            <li>
              <strong>14-Day Return Window:</strong> You may return unused accessories or eligible
              pre-owned devices within 14 days in original condition with proof of purchase.
            </li>
            <li>
              <strong>Faulty Items:</strong> Under the UK Consumer Rights Act 2015, if a product
              develops a hardware fault within 30 days, you are entitled to an immediate refund,
              repair, or replacement.
            </li>
          </ul>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#D92D20]" /> 2. Repair Service Refunds
          </h2>
          <p>
            Labour and custom component orders for completed repairs are generally non-refundable
            once installed and verified working. If a replacement component remains defective,
            contact the team so it can be assessed under the warranty terms agreed for that repair
            and your statutory rights.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}

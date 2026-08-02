import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS } from "@/lib/business";
import { Scale, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms & Conditions | ${BUSINESS.name}` },
      { name: "description", content: `Terms & Conditions for using ${BUSINESS.name} website and services in Prescot, Merseyside.` },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <div className="bg-[#FAFAF9] border-b border-slate-200 py-12">
        <div className="container-page max-w-4xl">
          <div className="eyebrow mb-2">Legal & Compliance</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">Terms & Conditions</h1>
          <p className="mt-2 text-slate-600 text-sm">
            Effective Date: January 2026 • Governing website usage and retail inquiries for {BUSINESS.name}.
          </p>
        </div>
      </div>

      <div className="container-page max-w-4xl py-12 space-y-8 text-slate-700 leading-relaxed text-sm md:text-base">
        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#D92D20]" /> 1. Agreement to Terms
          </h2>
          <p>
            By accessing or using our website, requesting repair estimates, or visiting our premises at <strong>{BUSINESS.fullAddress}</strong>, you agree to be bound by these Terms and Conditions.
          </p>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#D92D20]" /> 2. Estimates & Pricing Disclaimer
          </h2>
          <p>
            Online quote calculators and instant price checkers provide <strong>estimates only</strong> based on information provided by the user. Final repair pricing is confirmed after manual physical inspection by our technicians in store.
          </p>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#D92D20]" /> 3. Governing Law
          </h2>
          <p>
            These terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}

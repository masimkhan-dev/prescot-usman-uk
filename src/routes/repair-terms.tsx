import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS, SITE_URL } from "@/lib/business";
import { Wrench, Database, ShieldAlert, Clock, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/repair-terms")({
  head: () => ({
    meta: [
      { title: `Repair Terms & Conditions | ${BUSINESS.name}` },
      {
        name: "description",
        content: `Specific Repair Terms & Conditions for device repairs at ${BUSINESS.name} Prescot.`,
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/repair-terms` }],
  }),
  component: RepairTermsPage,
});

function RepairTermsPage() {
  return (
    <SiteLayout>
      <div className="bg-[#FAFAF9] border-b border-slate-200 py-12">
        <div className="container-page max-w-4xl">
          <div className="eyebrow mb-2">Service Agreement</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">
            Repair Terms & Conditions
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-600">
            Please read these terms before submitting a device for repair at {BUSINESS.name}.
          </p>
        </div>
      </div>

      <div className="container-page max-w-4xl space-y-8 py-12 text-base leading-7 text-slate-700">
        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#D92D20]" /> 1. Data Backup Responsibility
          </h2>
          <p>
            It is the customer's sole responsibility to back up all personal data, photos, files,
            and applications prior to handing over a device for repair. While we take every care,{" "}
            <strong>{BUSINESS.name} is not liable for any data loss</strong> that occurs during the
            diagnostic or repair process.
          </p>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#D92D20]" /> 2. Liquid & Previous Damage
            Pre-existing Risks
          </h2>
          <p>
            Devices affected by liquid ingress or severe impact damage may suffer further component
            degradation during opening or diagnostic testing. We cannot guarantee full recovery for
            water-damaged devices.
          </p>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#D92D20]" /> 3. Collection & Unclaimed Items
          </h2>
          <p>
            Repaired devices must be collected within 60 calendar days of notification of repair
            completion. Unclaimed items after 60 days may be recycled or sold to recover repair
            costs in accordance with UK property disposal guidelines.
          </p>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#FF493D]" /> 4. Diagnostics & Unsuccessful Repairs
          </h2>
          <p>
            Diagnostic or specialist fees may still apply when a repair cannot be completed. Any
            charge should be explained and agreed before work begins; ask the team to confirm the
            terms for your device.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}

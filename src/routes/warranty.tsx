import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS, SITE_URL } from "@/lib/business";
import { ShieldCheck, CheckCircle2, XCircle, Info } from "lucide-react";

export const Route = createFileRoute("/warranty")({
  head: () => ({
    meta: [
      { title: `Warranty Policy | ${BUSINESS.name}` },
      {
        name: "description",
        content: `Learn how to confirm the repair warranty terms that apply at ${BUSINESS.name} Prescot.`,
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/warranty` }],
  }),
  component: WarrantyPage,
});

function WarrantyPage() {
  return (
    <SiteLayout>
      <div className="bg-[#FAFAF9] border-b border-slate-200 py-12">
        <div className="container-page max-w-4xl">
          <div className="eyebrow mb-2">Customer Peace of Mind</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">Warranty Policy</h1>
          <p className="mt-2 text-base leading-7 text-slate-600">
            Confirm the current terms that apply to your repair before work begins.
          </p>
        </div>
      </div>

      <div className="container-page max-w-4xl space-y-8 py-12 text-base leading-7 text-slate-700">
        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FF493D]" /> Repair Warranty Terms
          </h2>
          <p>
            Warranty coverage and duration can vary by repair and replacement part. Ask{" "}
            <strong>{BUSINESS.name}</strong> to confirm the exact terms in writing before booking;
            the terms shown on your receipt or repair agreement will apply.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card-flat bg-emerald-50/50 border-emerald-200">
            <h3 className="font-bold text-emerald-950 flex items-center gap-2 mb-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> What Is Covered
            </h3>
            <ul className="space-y-2 text-base leading-7 text-emerald-900 list-disc pl-5">
              <li>Faulty touch sensitivity or display lines caused by component defects.</li>
              <li>Faulty replacement battery performance or charging circuit components.</li>
              <li>Replacement charging ports or buttons failing under normal usage.</li>
              <li>Workmanship and installation integrity.</li>
            </ul>
          </div>

          <div className="card-flat bg-rose-50/50 border-rose-200">
            <h3 className="font-bold text-rose-950 flex items-center gap-2 mb-2 text-base">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" /> What Is Excluded
            </h3>
            <ul className="space-y-2 text-base leading-7 text-rose-900 list-disc pl-5">
              <li>Accidental damage post-repair (e.g. drops, cracked glass, pressure damage).</li>
              <li>Water or liquid ingress occurring after repair.</li>
              <li>Third-party tampering or unauthorized repair attempts.</li>
              <li>Software modifications, jailbreaks, or virus issues.</li>
            </ul>
          </div>
        </div>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-[#D92D20]" /> How to Make a Warranty Claim
          </h2>
          <p>
            Bring your device back to our shop at <strong>{BUSINESS.fullAddress}</strong> with your
            receipt or proof of repair. The team will inspect the device and explain the next step
            under the terms agreed for that repair.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}

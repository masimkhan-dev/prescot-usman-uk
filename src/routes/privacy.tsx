import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS } from "@/lib/business";
import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy | ${BUSINESS.name}` },
      { name: "description", content: `UK GDPR compliant Privacy Policy for ${BUSINESS.name}. Learn how we protect your personal data.` },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <div className="bg-[#FAFAF9] border-b border-slate-200 py-12">
        <div className="container-page max-w-4xl">
          <div className="eyebrow mb-2">Legal & Compliance</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">Privacy Policy</h1>
          <p className="mt-2 text-slate-600 text-sm">
            Last Updated: January 2026 • Compliant with UK General Data Protection Regulation (UK GDPR) & Data Protection Act 2018.
          </p>
        </div>
      </div>

      <div className="container-page max-w-4xl py-12">
        <div className="space-y-8 text-slate-700 leading-relaxed text-sm md:text-base">
          <section className="card-flat">
            <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#D92D20]" /> 1. Data Controller Information
            </h2>
            <p>
              <strong>{BUSINESS.name}</strong> ("we", "us", or "our") acts as the Data Controller responsible for your personal data collected via our website, walk-in repair shop at <strong>{BUSINESS.fullAddress}</strong>, or communication channels.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Contact: <a href={BUSINESS.emailHref} className="text-[#D92D20] underline">{BUSINESS.email}</a> | Phone: {BUSINESS.phone}
            </p>
          </section>

          <section className="card-flat">
            <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#D92D20]" /> 2. Personal Data We Collect
            </h2>
            <p>We may collect and process the following data depending on your interaction with us:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
              <li><strong>Contact Details:</strong> Name, phone number, email address, and delivery/collection address.</li>
              <li><strong>Repair & Device Records:</strong> Device model, serial number/IMEI, fault description, passcode (where explicitly authorized for diagnostic testing), and repair history.</li>
              <li><strong>Transaction Data:</strong> Details of quotes, payments, invoices, and trade-in valuations.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, and essential website cookies required for navigation.</li>
            </ul>
          </section>

          <section className="card-flat">
            <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#D92D20]" /> 3. How We Use Your Data & Legal Basis
            </h2>
            <p>We process your data strictly under valid legal bases under UK GDPR:</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-xs uppercase">Contractual Performance</div>
                <div className="text-xs text-slate-600 mt-1">To process repair bookings, issue quotes, process payments, and fulfill warranty claims.</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-xs uppercase">Legitimate Interests</div>
                <div className="text-xs text-slate-600 mt-1">To maintain retail inventory, prevent fraud, and ensure shop security.</div>
              </div>
            </div>
          </section>

          <section className="card-flat">
            <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D92D20]" /> 4. Your Rights Under UK GDPR
            </h2>
            <p>You have the right to request access to, correction of, or erasure of your personal data held by us, as well as object to processing. To exercise any of these rights, email us at <a href={BUSINESS.emailHref} className="text-[#D92D20] underline">{BUSINESS.email}</a>.</p>
            <p className="mt-2 text-xs text-slate-500">You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at ico.org.uk.</p>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}

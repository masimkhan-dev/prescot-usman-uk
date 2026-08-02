import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS } from "@/lib/business";
import { Cookie, ShieldCheck, Settings } from "lucide-react";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: `Cookie Policy | ${BUSINESS.name}` },
      { name: "description", content: `Cookie Policy explaining cookie usage on ${BUSINESS.name} website in accordance with UK Privacy regulations.` },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <SiteLayout>
      <div className="bg-[#FAFAF9] border-b border-slate-200 py-12">
        <div className="container-page max-w-4xl">
          <div className="eyebrow mb-2">Technical Privacy</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">Cookie Policy</h1>
          <p className="mt-2 text-slate-600 text-sm">
            Information regarding cookie storage and management on {BUSINESS.name}.
          </p>
        </div>
      </div>

      <div className="container-page max-w-4xl py-12 space-y-8 text-slate-700 leading-relaxed text-sm md:text-base">
        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Cookie className="w-5 h-5 text-[#D92D20]" /> What Are Cookies?
          </h2>
          <p>
            Cookies are small text files stored on your computer or mobile device when you visit our site. They allow our website to remember your preferences (such as price estimator selections or cookie consent choices).
          </p>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#D92D20]" /> Strictly Necessary Cookies
          </h2>
          <p>
            These cookies are required for core website functionality, security, and storing your consent preferences. They do not require explicit consent and cannot be turned off.
          </p>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#D92D20]" /> Managing Your Preferences
          </h2>
          <p>
            You can clear or disable cookies via your browser settings at any time. Note that disabling essential cookies may impact certain interactive features such as booking or quote requests.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS } from "@/lib/business";
import { Accessibility, Car, CheckCircle2, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: `Accessibility Statement | ${BUSINESS.name}` },
      { name: "description", content: `Accessibility Statement detailing WCAG 2.2 AA web compliance and store accessibility features at ${BUSINESS.name} Prescot.` },
    ],
    links: [{ rel: "canonical", href: "/accessibility" }],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <SiteLayout>
      <div className="bg-[#FAFAF9] border-b border-slate-200 py-12">
        <div className="container-page max-w-4xl">
          <div className="eyebrow mb-2">Inclusion & Standards</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">Accessibility Statement</h1>
          <p className="mt-2 text-slate-600 text-sm">
            Our commitment to accessible digital services and physical store access in Prescot.
          </p>
        </div>
      </div>

      <div className="container-page max-w-4xl py-12 space-y-8 text-slate-700 leading-relaxed text-sm md:text-base">
        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-[#D92D20]" /> Web Accessibility Standards (WCAG 2.2 AA)
          </h2>
          <p>
            We strive to ensure that <strong>{BUSINESS.name}</strong> digital services are accessible to people of all abilities. Our website target standard is <strong>WCAG 2.2 Level AA</strong>:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
            <li><strong>Keyboard Navigation:</strong> All interactive elements, buttons, and forms are fully navigable using a standard keyboard.</li>
            <li><strong>Touch Target Sizes:</strong> Interactive buttons and links adhere to minimum 44×44px touch boundaries for ease of selection on mobile devices.</li>
            <li><strong>Color Contrast & Focus Rings:</strong> High contrast color pairings and standard visible focus rings for screen reader and keyboard accessibility.</li>
            <li><strong>Semantic Structure:</strong> Proper use of standard HTML5 headings, ARIA roles, and alternative text for visual assets.</li>
          </ul>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <Car className="w-5 h-5 text-[#D92D20]" /> Physical Store Accessibility (57 Eccleston Street)
          </h2>
          <p>
            We welcome all customers to our physical shop in Prescot town center:
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Level Entrance Access
              </div>
              <div className="text-xs text-slate-600 mt-1">Ground-floor shopfront with level entrance suitable for wheelchairs and pushchairs.</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Nearby Accessible Parking
              </div>
              <div className="text-xs text-slate-600 mt-1">Convenient town center parking and disabled badge bays located on Eccleston Street & nearby carparks.</div>
            </div>
          </div>
        </section>

        <section className="card-flat">
          <h2 className="text-xl font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            Feedback & Assistance
          </h2>
          <p>
            If you encounter any difficulty accessing our website or visiting our shop, please contact us and our staff will gladly assist:
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Phone: <a href={BUSINESS.phoneHref} className="text-[#D92D20] font-bold">{BUSINESS.phone}</a> | Email: <a href={BUSINESS.emailHref} className="text-[#D92D20] underline">{BUSINESS.email}</a>
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}

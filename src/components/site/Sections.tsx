import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ShieldCheck,
  Star,
  Clock,
  MapPin,
  Award,
  ArrowRight,
  Zap,
} from "lucide-react";
import { REPAIR_PROCESS, WHY_CHOOSE_US, BRANDS_WE_REPAIR, FAQS } from "@/lib/business";

export function TrustBar() {
  return (
    <section className="py-10 bg-[#FAFAF9] border-y border-slate-200">
      <div className="container-page">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Google Rating */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#D92D20] transition-all flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0F172A] flex items-center gap-1.5">
                4.8 / 5{" "}
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  Google
                </span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-700">Customer rating</div>
              <p className="mt-0.5 text-xs text-slate-600">Based on 96 Google reviews</p>
            </div>
          </div>

          {/* Card 2: 12-Month Warranty */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#D92D20] transition-all flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-[#D92D20] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0F172A]">
                Clear terms{" "}
                <span className="text-xs font-bold text-[#8F241A] bg-[#FFF0ED] px-2 py-0.5 rounded">
                  Ask us
                </span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-700">
                Repair warranty information
              </div>
              <p className="mt-0.5 text-xs text-slate-600">Confirm terms before booking</p>
            </div>
          </div>

          {/* Card 3: Same-Day Repairs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#D92D20] transition-all flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F1EAE2] text-[#171717] flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0F172A]">
                Repair routes{" "}
                <span className="text-xs font-bold text-[#403B36] bg-[#F1EAE2] px-2 py-0.5 rounded">
                  Flexible
                </span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-700">
                Walk-in, collection or mail-in
              </div>
              <p className="mt-0.5 text-xs text-slate-600">Ask about current availability</p>
            </div>
          </div>

          {/* Card 4: Local Shop */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#D92D20] transition-all flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0F172A] flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-[#D92D20]" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0F172A]">
                Local Shop{" "}
                <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                  Prescot
                </span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-700">57 Eccleston Street</div>
              <p className="mt-0.5 text-xs text-slate-600">Visit during published opening hours</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RepairProcess() {
  return (
    <section className="section-pad bg-white">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <span className="eyebrow">How It Works</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-[#0F172A]">
            Transparent 5-step repair process.
          </h2>
          <p className="mt-2 text-slate-600 text-base">
            No jargon. No unexpected costs. Just honest local service.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {REPAIR_PROCESS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-slate-200 p-6 bg-slate-50/50 flex flex-col justify-between hover:border-[#D92D20] transition-all"
            >
              <div>
                <span className="text-xs font-black tracking-widest text-[#D92D20] bg-rose-100 px-2.5 py-1 rounded-md">
                  STEP {s.n}
                </span>
                <h3 className="mt-4 text-base font-bold text-[#0F172A]">{s.t}</h3>
                <p className="mt-2 text-base leading-7 text-slate-600">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyChooseUs() {
  return (
    <section className="section-pad bg-[#FAFAF9]">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Why Choose Us</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-[#0F172A]">
            Why customers trust Prescot Mobiles.
          </h2>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {WHY_CHOOSE_US.map((w) => (
            <div
              key={w}
              className="flex items-start gap-3 rounded-xl bg-white border border-slate-200 p-4 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] mt-0.5 shrink-0" />
              <span className="text-base font-semibold text-[#171717]">{w}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BrandsWeRepair() {
  return (
    <section className="section-pad bg-white">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <span className="eyebrow">Supported Brands</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-[#0F172A]">
            We repair all major brands & models.
          </h2>
          <p className="mt-2 text-slate-600 text-base">
            Contact the team to discuss compatible repair options for your device and confirm
            current terms.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {BRANDS_WE_REPAIR.map((b) => (
            <span
              key={b}
              className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#0F172A] hover:border-[#D92D20] hover:text-[#D92D20] transition-all"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WarrantyBanner() {
  return (
    <section className="py-8 bg-slate-900 text-white">
      <div className="container-page">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#D92D20] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Repair terms, clearly explained</div>
              <p className="text-base text-slate-300">
                Ask the team to confirm the warranty and repair terms that apply to your device
                before booking.
              </p>
            </div>
          </div>
          <Link to="/contact" className="btn-primary shrink-0">
            Get Free Quote <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FAQSection({ items = FAQS }: { items?: typeof FAQS }) {
  return (
    <section className="section-pad bg-[#FAFAF9]">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">FAQs</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-[#0F172A]">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {items.map((f) => (
            <div key={f.q} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-[#0F172A] text-base">{f.q}</h3>
              <p className="mt-2 text-base leading-7 text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

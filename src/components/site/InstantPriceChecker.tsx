import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wrench, ShieldCheck, Clock, ArrowRight, MessageCircle, CheckCircle2 } from "lucide-react";
import { BUSINESS } from "@/lib/business";

const DEVICE_TYPES = [
  { id: "mobile", label: "Mobile Phone" },
  { id: "laptop", label: "Laptop / MacBook" },
  { id: "console", label: "Gaming Console" },
  { id: "tablet", label: "iPad / Tablet" },
];

const MODELS: Record<string, string[]> = {
  mobile: [
    "iPhone 15 / 14 / 13 Pro",
    "iPhone 12 / 11 / SE",
    "Samsung Galaxy S24 / S23",
    "Samsung A-Series / FE",
    "Google Pixel 8 / 7",
  ],
  laptop: [
    "MacBook Air / Pro (M1/M2/M3)",
    "MacBook Pro (Intel)",
    "Dell / HP / Lenovo Laptop",
    "Asus / Acer / Gaming Laptop",
  ],
  console: [
    "PlayStation 5 (Disc/Digital)",
    "PlayStation 4 / Pro",
    "Xbox Series X / Series S",
    "Nintendo Switch / OLED",
  ],
  tablet: ["iPad Air / Pro", "iPad 10th/9th Gen", "Samsung Galaxy Tab"],
};

const REPAIR_TYPES: Record<string, { label: string; est: string; time: string }[]> = {
  mobile: [
    { label: "Screen Replacement", est: "£45 - £120", time: "30-45 Mins" },
    { label: "Battery Replacement", est: "£35 - £55", time: "30 Mins" },
    { label: "Charging Port Fix", est: "£35 - £50", time: "45 Mins" },
    { label: "Camera / Glass Repair", est: "£40 - £75", time: "45 Mins" },
    { label: "Liquid Damage Diagnosis", est: "£25 Diagnostics", time: "Same Day" },
  ],
  laptop: [
    { label: "Screen Replacement", est: "£65 - £140", time: "1-2 Hours" },
    { label: "Battery Replacement", est: "£55 - £85", time: "45 Mins" },
    { label: "Keyboard / Trackpad", est: "£45 - £80", time: "Same Day" },
    { label: "SSD Upgrade & Speedup", est: "£50 - £95", time: "Same Day" },
    { label: "Power / Charging Jack", est: "£45 - £65", time: "Same Day" },
  ],
  console: [
    { label: "HDMI Port Repair", est: "£50 - £70", time: "Same Day" },
    { label: "Deep Clean & Thermal Paste", est: "£35 - £45", time: "1 Hour" },
    { label: "Power Supply / Overheating", est: "£45 - £75", time: "Same Day" },
    { label: "Disk Drive / Controller Fix", est: "£35 - £60", time: "Same Day" },
  ],
  tablet: [
    { label: "Glass & Digitiser", est: "£45 - £85", time: "1-2 Hours" },
    { label: "LCD & Touch Assembly", est: "£65 - £130", time: "Same Day" },
    { label: "Battery Replacement", est: "£45 - £65", time: "Same Day" },
  ],
};

export function InstantPriceChecker() {
  const [deviceType, setDeviceType] = useState<string>("mobile");
  const [selectedModel, setSelectedModel] = useState<string>(MODELS.mobile[0]);
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number>(0);

  const availableModels = MODELS[deviceType] || MODELS.mobile;
  const availableIssues = REPAIR_TYPES[deviceType] || REPAIR_TYPES.mobile;
  const currentIssue = availableIssues[selectedIssueIndex] || availableIssues[0];

  const handleDeviceChange = (typeId: string) => {
    setDeviceType(typeId);
    setSelectedModel(MODELS[typeId][0]);
    setSelectedIssueIndex(0);
  };

  const whatsappMsg = `Hi Prescot Mobiles, I need a quote for ${selectedModel} - ${currentIssue.label}. Is this available today?`;

  return (
    <section className="section-pad bg-[#171717]" id="price-checker">
      <div className="container-page grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
        <div className="max-w-xl">
          <span className="eyebrow">
            <Wrench className="w-3.5 h-3.5" /> Quick repair estimate
          </span>
          <h2 className="mt-5 text-4xl font-semibold leading-tight !text-white md:text-6xl">
            A clearer route to the right repair.
          </h2>
          <p className="mt-6 text-base leading-7 text-white/65">
            Choose your device and reported issue to prepare an enquiry. The team can confirm the
            exact options after checking your device.
          </p>
        </div>

        <div className="rounded-xl border border-[#E2DAD0] bg-[#FAF7F2] p-5 shadow-2xl md:p-8">
          {/* Device Category Selector */}
          <div className="grid grid-cols-2 gap-2 border-b border-[#DDD5CB] pb-6 md:grid-cols-4">
            {DEVICE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleDeviceChange(t.id)}
                aria-pressed={deviceType === t.id}
                className={`repair-tab relative min-h-12 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                  deviceType === t.id
                    ? "repair-tab-active bg-[#171717] text-white shadow-sm"
                    : "border border-[#E2DAD0] bg-white text-[#57504A] hover:border-[#C9BEB2]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Model and Issue Selectors */}
          <div className="mt-6 grid md:grid-cols-2 gap-6 items-start">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#403B36]">1. Select Model</label>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {availableModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedModel(m)}
                    aria-pressed={selectedModel === m}
                    className={`min-h-12 w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-all ${
                      selectedModel === m
                        ? "border-[#D92D20] bg-white text-[#171717] font-semibold shadow-sm"
                        : "border-[#E2DAD0] bg-[#FAF7F2] text-[#57504A] hover:border-[#C9BEB2]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#403B36]">
                2. Select Repair Issue
              </label>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {availableIssues.map((issue, idx) => (
                  <button
                    key={issue.label}
                    type="button"
                    onClick={() => setSelectedIssueIndex(idx)}
                    aria-pressed={selectedIssueIndex === idx}
                    className={`min-h-12 w-full rounded-lg border px-4 py-2.5 text-sm transition-all flex items-center justify-between gap-3 ${
                      selectedIssueIndex === idx
                        ? "border-[#D92D20] bg-white text-[#171717] font-semibold shadow-sm"
                        : "border-[#E2DAD0] bg-[#FAF7F2] text-[#57504A] hover:border-[#C9BEB2]"
                    }`}
                  >
                    <span>{issue.label}</span>
                    <span className="rounded bg-[#F1EAE2] px-2 py-1 text-xs font-bold text-[#171717]">
                      {issue.est}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quote Result Box */}
          <div
            key={`${deviceType}-${selectedModel}-${selectedIssueIndex}`}
            className="quote-result-transition mt-8 flex flex-col items-start justify-between gap-6 rounded-lg border-t border-[#E7DED5] bg-white p-5 pt-6 md:p-6"
          >
            <div>
              <div className="text-xs font-bold text-[#766D65]">Estimated Repair Summary</div>
              <div className="mt-2 font-display text-2xl font-semibold text-[#171717]">
                {selectedModel} — {currentIssue.label}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-[#625B55]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#FF493D]" /> Indicative time:{" "}
                  <b>{currentIssue.time}</b>
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF493D]" />{" "}
                  <b>Ask about warranty terms</b>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#176B45]" /> Final quote after
                  assessment
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col items-center gap-3 sm:flex-row">
              <a
                href={BUSINESS.whatsappMessage(whatsappMsg)}
                target="_blank"
                rel="noreferrer"
                className="btn-whatsapp min-h-12 w-full sm:w-auto"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Quote
              </a>
              <Link to="/contact" className="btn-primary min-h-12 w-full sm:w-auto">
                Continue Enquiry <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

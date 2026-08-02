import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent_choice");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (choice: "all" | "essential") => {
    localStorage.setItem("cookie_consent_choice", choice);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent banner"
      className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border border-white/10 bg-[#171717] p-5 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 md:bottom-6 md:left-auto md:right-6 md:max-w-md"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-[#FF493D] font-extrabold text-sm tracking-wide">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#FF493D]" />
          <span>Privacy & Cookie Preferences</span>
        </div>
        <button
          onClick={() => handleAccept("essential")}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close cookie consent banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-[#D8D0C8]">
        We use essential cookies to ensure our website and booking features run smoothly. We respect
        your privacy in accordance with UK GDPR. Learn more in our{" "}
        <Link to="/cookies" className="font-semibold text-[#FF7A70] hover:underline">
          Cookie Policy
        </Link>
        .
      </p>

      <div className="flex items-center justify-end gap-2.5">
        <button
          onClick={() => handleAccept("essential")}
          className="min-h-11 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
        >
          Essential Only
        </button>
        <button
          onClick={() => handleAccept("all")}
          className="btn-primary !min-h-11 !px-4 !py-2 !text-sm"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}

import { MessageCircle, Phone } from "lucide-react";
import { BUSINESS } from "@/lib/business";

export function StickyMobileCTA() {
  return (
    <div
      role="region"
      aria-label="Quick contact actions"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-[#DDD5CB] bg-[#FAF7F2]/95 px-3 pt-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(23,23,23,.08)] backdrop-blur-xl md:hidden"
    >
      <a href={BUSINESS.phoneHref} className="btn-dark min-h-12 !rounded-lg">
        <Phone className="h-4 w-4" /> Call Now
      </a>
      <a
        href={BUSINESS.whatsappMessage("Hi Prescot Mobiles, I'd like a repair quote.")}
        target="_blank"
        rel="noreferrer"
        className="btn-whatsapp min-h-12 !rounded-lg"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import { BUSINESS } from "@/lib/business";

export function AnnouncementTicker() {
  const whatsappUrl = BUSINESS.whatsappMessage("Hi, I need urgent help with a device repair.");

  const tickerItem = (
    <div className="flex items-center gap-3 whitespace-nowrap px-4">
      <span className="text-[#F4EFEA]">
        Device broken? Get urgent repair support for mobiles, laptops, tablets &amp; gaming consoles
      </span>
      <span className="text-[#888179]">•</span>
      <span className="text-[#F4EFEA]">Visit us in Prescot</span>
      <span className="text-[#888179]">•</span>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-1 font-bold text-[#FF493D] transition-colors hover:text-[#FF6B61] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF493D]"
      >
        <span>Get help now</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
      </a>
    </div>
  );

  return (
    <div
      role="region"
      aria-label="Announcement Ticker"
      className="ticker-root relative z-50 h-[34px] w-full overflow-hidden bg-[#141414] text-[11px] sm:text-xs font-medium text-[#F4EFEA] border-b border-white/10 sm:h-[36px] flex items-center select-none"
    >
      {/* Reduced motion: static centred message */}
      <div className="ticker-static container-page flex w-full items-center justify-center text-center truncate !px-2">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate text-[#F4EFEA]">
            Device broken? Get urgent repair support for mobiles, laptops, tablets &amp; gaming
            consoles
          </span>
          <span className="hidden sm:inline text-[#888179]">•</span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex shrink-0 items-center gap-1 font-bold text-[#FF493D] hover:underline"
          >
            <span>Get help now</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      {/* Full-motion: CSS keyframe scroll — always GPU-composited via transform */}
      <div
        className="ticker-scroll-wrap flex w-full overflow-hidden"
        onMouseEnter={(e) =>
          (e.currentTarget.querySelector<HTMLElement>(".ticker-track")!.style.animationPlayState =
            "paused")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.querySelector<HTMLElement>(".ticker-track")!.style.animationPlayState =
            "running")
        }
        onFocusCapture={(e) =>
          (e.currentTarget.querySelector<HTMLElement>(".ticker-track")!.style.animationPlayState =
            "paused")
        }
        onBlurCapture={(e) =>
          (e.currentTarget.querySelector<HTMLElement>(".ticker-track")!.style.animationPlayState =
            "running")
        }
      >
        <div className="ticker-track flex shrink-0 items-center">
          {/* Primary copy for screen readers */}
          <div className="flex items-center">{tickerItem}</div>
          <div className="flex items-center" aria-hidden="true">
            {tickerItem}
          </div>
          {/* Extra copies to fill wide displays without a gap */}
          <div className="flex items-center" aria-hidden="true">
            {tickerItem}
          </div>
          <div className="flex items-center" aria-hidden="true">
            {tickerItem}
          </div>
        </div>
      </div>
    </div>
  );
}

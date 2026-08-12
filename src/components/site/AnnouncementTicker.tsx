import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BUSINESS } from "@/lib/business";

export function AnnouncementTicker() {
  const shouldReduceMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);

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
      className="relative z-50 h-[34px] w-full overflow-hidden bg-[#141414] text-[11px] sm:text-xs font-medium text-[#F4EFEA] border-b border-white/10 sm:h-[36px] flex items-center select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {shouldReduceMotion ? (
        <div className="container-page flex w-full items-center justify-center text-center truncate !px-2">
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
      ) : (
        <div className="flex w-full overflow-hidden">
          <motion.div
            className="flex shrink-0 items-center"
            animate={{
              x: isPaused ? undefined : ["0%", "-50%"],
            }}
            transition={{
              duration: 25,
              ease: "linear",
              repeat: Infinity,
            }}
          >
            {/* Primary Copy for Screen Readers */}
            <div className="flex items-center">{tickerItem}</div>
            <div className="flex items-center" aria-hidden="true">
              {tickerItem}
            </div>
            {/* Duplicated copies to ensure no visual gaps on wide displays */}
            <div className="flex items-center" aria-hidden="true">
              {tickerItem}
            </div>
            <div className="flex items-center" aria-hidden="true">
              {tickerItem}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const WELCOME_TOAST_KEY = "admin_welcome_toast_shown";

export function WelcomeToast() {
  const { user, isLoading } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;

    try {
      const alreadyShown = sessionStorage.getItem(WELCOME_TOAST_KEY);
      if (!alreadyShown) {
        sessionStorage.setItem(WELCOME_TOAST_KEY, "true");
        setVisible(true);
      }
    } catch {
      // In case sessionStorage is blocked by browser settings
      setVisible(true);
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (!visible || isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, isPaused]);

  if (!user || isLoading) return null;

  // Extract first name safely without guessing from email
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined);

  const firstName = fullName?.trim() ? fullName.trim().split(/\s+/)[0] : null;
  const title = firstName ? `Welcome back, ${firstName}` : "Welcome back";

  return (
    <AnimatePresence>
      {visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 md:left-auto md:right-6 md:top-6 md:translate-x-0"
        >
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -20, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -12, scale: 0.96 }
            }
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={() => setIsPaused(false)}
            className="flex items-start gap-3.5 rounded-xl border border-[#087a3e]/30 bg-white p-4 shadow-xl shadow-black/10 transition-shadow hover:shadow-2xl"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#087a3e]/10 text-[#087a3e]">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="flex-1 pt-0.5 min-w-0">
              <h4 className="font-display text-sm font-bold text-[#171717] leading-snug truncate">
                {title}
              </h4>
              <p className="mt-0.5 text-xs text-[#625B55] leading-relaxed">
                Here’s today’s overview of sales, repairs and inventory.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setVisible(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#625B55] hover:bg-[#FAF7F2] hover:text-[#171717] transition-colors focus-visible:outline-2 focus-visible:outline-brand"
              aria-label="Close welcome message"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function clearWelcomeToastFlag() {
  try {
    sessionStorage.removeItem(WELCOME_TOAST_KEY);
  } catch {
    // ignore
  }
}

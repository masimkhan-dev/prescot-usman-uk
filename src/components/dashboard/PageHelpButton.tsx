import { useState, useEffect } from "react";
import { CircleHelp, X, HelpCircle, Sparkles, Check } from "lucide-react";
import { toastInfo } from "@/lib/toast";

export interface PageHelpStep {
  number: number;
  text: string;
}

export interface PageHelpButtonProps {
  pageTitle: string;
  steps: string[];
  note?: string;
  pageKey?: string;
  firstTimeTip?: string;
}

const TRAINING_MODE_KEY = "prescot_training_mode";

export function isTrainingModeEnabled(): boolean {
  try {
    return localStorage.getItem(TRAINING_MODE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setTrainingModeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(TRAINING_MODE_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

/**
 * Standard subtle [? Help] button that opens a clean training popover.
 * Keeps ERP UI uncluttered while providing instant guidance.
 */
export function PageHelpButton({
  pageTitle,
  steps,
  note,
  pageKey,
  firstTimeTip,
}: PageHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [trainingMode, setTrainingMode] = useState<boolean>(isTrainingModeEnabled());

  // Handle first-time visit toast
  useEffect(() => {
    if (!pageKey || !firstTimeTip) return;

    try {
      const modeOn = isTrainingModeEnabled();
      if (!modeOn) return;

      const acknowledged = localStorage.getItem(`prescot_tip_ack_${pageKey}`);
      if (!acknowledged) {
        // Show compact info toast
        toastInfo(`Tip (${pageTitle}): ${firstTimeTip}`);
        localStorage.setItem(`prescot_tip_ack_${pageKey}`, "true");
      }
    } catch {
      // ignore localStorage block
    }
  }, [pageKey, firstTimeTip, pageTitle]);

  function toggleTrainingMode() {
    const next = !trainingMode;
    setTrainingMode(next);
    setTrainingModeEnabled(next);
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`How to use ${pageTitle}`}
        className="px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded-lg border border-border/60 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <CircleHelp className="w-3.5 h-3.5 text-brand" />
        <span>? Help</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop overlay for mobile click-away */}
          <div
            className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Compact Popover Box */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-sm text-foreground">How to use: {pageTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction Steps */}
            <ol className="space-y-2 text-xs text-foreground/90 font-medium">
              {steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-brand/10 text-brand font-extrabold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            {/* Note block if present */}
            {note && (
              <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 font-semibold flex items-start gap-2">
                <span className="shrink-0 font-extrabold text-amber-600">Note:</span>
                <span>{note}</span>
              </div>
            )}

            {/* Training Mode Preference Footer */}
            <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Automatic page tips</span>
              <button
                type="button"
                onClick={toggleTrainingMode}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-colors cursor-pointer border ${
                  trainingMode
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {trainingMode ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Contextual Mini Tip Icon [?] for tricky input labels.
 * Example: Warranty Days [?]
 */
export function ContextTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Help info"
        className="text-muted-foreground hover:text-brand transition-colors cursor-pointer focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5 inline align-text-top text-brand/80 hover:text-brand" />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 bg-slate-900 text-white text-[11px] font-medium p-2.5 rounded-lg shadow-xl z-50 pointer-events-none animate-in fade-in duration-100">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </span>
  );
}

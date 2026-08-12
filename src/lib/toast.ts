import { toast } from "sonner";
import { humanizeError } from "./humanize-error";

/**
 * Standardized global toast functions for Prescot ERP.
 * Enforces consistent timing, icon styling, duplicate prevention, and humanized error messages.
 */

export function toastSuccess(message: string, duration = 3500) {
  toast.success(message, {
    id: message,
    duration,
  });
}

export function toastError(
  err: unknown,
  fallbackMessage = "Action failed. Please try again.",
  duration = 6000,
) {
  const humanMsg = humanizeError(err, fallbackMessage);
  toast.error(humanMsg, {
    id: humanMsg,
    duration,
  });
}

export function toastWarning(message: string, duration = 5500) {
  toast.warning(message, {
    id: message,
    duration,
  });
}

export function toastInfo(message: string, duration = 4500) {
  toast.info(message, {
    id: message,
    duration,
  });
}

export function toastDismiss(id?: string) {
  toast.dismiss(id);
}

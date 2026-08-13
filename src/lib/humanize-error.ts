/**
 * Humanize raw database, Supabase, network, and RPC errors into clear, friendly messages.
 * Preserves backend error meaning without confusing shop staff with raw stack traces or SQL codes.
 */
export function humanizeError(
  err: unknown,
  fallback: string = "An unexpected error occurred. Please try again.",
): string {
  if (!err) return fallback;

  let message = "";
  if (typeof err === "string") {
    message = err;
  } else if (err instanceof Error) {
    message = err.message || "";
  } else if (typeof err === "object" && err !== null && "message" in err) {
    message = String((err as { message: unknown }).message || "");
  }

  if (!message) return fallback;

  const lower = message.toLowerCase();

  // IMEI-specific errors
  if (
    lower.includes("imei") &&
    (lower.includes("already exists") || lower.includes("already registered") || lower.includes("unique"))
  ) {
    return "This IMEI is already registered on an existing stock record. Check the Phone Buy & Sell register.";
  }

  // Phone unit status errors
  if (lower.includes("already been sold") || lower.includes("not available for sale")) {
    return "This phone has already been sold or is no longer available.";
  }

  // Duplicate constraints
  if (
    lower.includes("duplicate key") ||
    lower.includes("unique constraint") ||
    lower.includes("already exists")
  ) {
    if (lower.includes("sku") || lower.includes("barcode")) {
      return "That SKU or barcode already exists.";
    }
    if (lower.includes("email")) {
      return "A record with that email address already exists.";
    }
    if (lower.includes("idempotency")) {
      return "This transaction was already recorded. Please refresh and check the register.";
    }
    return "This item already exists in the system.";
  }

  // Repair finalized / locked
  if (
    lower.includes("repair ticket is already finalized") ||
    lower.includes("finalized & locked") ||
    lower.includes("cannot be edited after finalization")
  ) {
    return "This repair has already been completed and cannot be edited.";
  }
  if (lower.includes("use finalize_repair_ticket")) {
    return "Use Collect & Complete to finish this repair.";
  }

  // Shift / Till errors
  if (
    lower.includes("open the till") ||
    lower.includes("open_till_required") ||
    lower.includes("no active shift") ||
    lower.includes("no open shift")
  ) {
    return "Please open the till before taking cash payments.";
  }

  // Stock errors
  if (
    lower.includes("out of stock") ||
    lower.includes("insufficient stock") ||
    lower.includes("available units")
  ) {
    return "Selected product is out of stock or has insufficient quantity.";
  }

  // Network / Fetch errors
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("connection failed")
  ) {
    return "Connection problem. Please check your internet and try again.";
  }

  // RLS / Permissions
  if (
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("insufficient permissions") ||
    lower.includes("rls")
  ) {
    return "You do not have permission to perform this action.";
  }

  // Clean raw PG prefixes if present (e.g. "Error: ", "PGERROR: ")
  const cleaned = message
    .replace(/^error:\s*/i, "")
    .replace(/^pgerror:\s*/i, "")
    .replace(/PGRST\d+:\s*/i, "")
    .trim();

  // If the cleaned message is short and readable, return it capitalized
  if (
    cleaned.length > 0 &&
    cleaned.length < 120 &&
    !cleaned.includes("at ") &&
    !cleaned.includes("SELECT ")
  ) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return fallback;
}

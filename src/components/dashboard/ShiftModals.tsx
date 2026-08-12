import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { openShift, closeShift, getShiftReconciliation, listShifts } from "@/lib/shifts.functions";
import { formatGBP } from "@/lib/utils";
import {
  X,
  Loader2,
  Banknote,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  User,
  ArrowRight,
  Receipt,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// 1. OPEN SHIFT MODAL
// ---------------------------------------------------------------------------
interface OpenShiftModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function OpenShiftModal({ onClose, onSuccess }: OpenShiftModalProps) {
  const queryClient = useQueryClient();
  const openShiftFn = useServerFn(openShift);

  const [floatPounds, setFloatPounds] = useState("100.00");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedFloat = parseFloat(floatPounds);
    if (isNaN(parsedFloat) || parsedFloat < 0) {
      toast.error("Please enter a valid non-negative opening float amount");
      return;
    }

    const openingFloatPence = Math.round(parsedFloat * 100);
    setSubmitting(true);

    try {
      await openShiftFn({
        data: { opening_float_pence: openingFloatPence },
      });
      toast.success("Till opened successfully!");
      queryClient.invalidateQueries({ queryKey: ["open-shift"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open till";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Open Till / Shift</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Enter physical float in drawer before starting sales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Opening Cash / Float (£)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={floatPounds}
              onChange={(e) => setFloatPounds(e.target.value)}
              placeholder="100.00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-[#E11D48]"
            />
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Cash physically present in the drawer before today's sales.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary !px-5 !py-2 !text-xs flex items-center gap-1.5 font-bold"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Confirm & Open Till
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. CLOSE SHIFT MODAL
// ---------------------------------------------------------------------------
export interface ReconciliationData {
  shift_id: string;
  opening_float_pence: number;
  cash_sales_pence: number;
  repair_cash_pence: number;
  cash_refunds_pence: number;
  expenses_pence: number;
  computed_expected_cash_pence: number;
  counted_cash_pence: number;
  difference_pence: number;
  notes?: string | null;
  opened_at?: string;
  closed_at?: string;
}

interface CloseShiftModalProps {
  shiftId: string;
  onClose: () => void;
  onSuccess: (result: ReconciliationData) => void;
}

export function CloseShiftModal({ shiftId, onClose, onSuccess }: CloseShiftModalProps) {
  const queryClient = useQueryClient();
  const getReconciliationFn = useServerFn(getShiftReconciliation);
  const closeShiftFn = useServerFn(closeShift);

  const [countedPounds, setCountedPounds] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: reconciliation, isLoading } = useQuery({
    queryKey: ["shift-reconciliation", shiftId],
    queryFn: () => getReconciliationFn({ data: { shift_id: shiftId } }),
  });

  const expectedPence = reconciliation?.computed_expected_cash_pence ?? 0;
  const countedPence = countedPounds ? Math.round(parseFloat(countedPounds) * 100) : 0;
  const variancePence = countedPounds ? countedPence - expectedPence : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedCounted = parseFloat(countedPounds);
    if (isNaN(parsedCounted) || parsedCounted < 0) {
      toast.error("Please enter a valid counted cash amount");
      return;
    }

    setSubmitting(true);
    try {
      const result = await closeShiftFn({
        data: {
          shift_id: shiftId,
          counted_cash_pence: Math.round(parsedCounted * 100),
          notes: notes.trim() || null,
        },
      });

      toast.success("Till closed successfully!");
      queryClient.invalidateQueries({ queryKey: ["open-shift"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });

      onSuccess({
        shift_id: shiftId,
        opening_float_pence: reconciliation?.opening_float_pence ?? 0,
        cash_sales_pence: reconciliation?.cash_sales_pence ?? 0,
        repair_cash_pence: reconciliation?.repair_cash_pence ?? 0,
        cash_refunds_pence: reconciliation?.cash_refunds_pence ?? 0,
        expenses_pence: reconciliation?.expenses_pence ?? 0,
        computed_expected_cash_pence: expectedPence,
        counted_cash_pence:
          result && typeof result === "object" && "counted_cash" in result
            ? (result as any).counted_cash
            : Math.round(parsedCounted * 100),
        difference_pence:
          result && typeof result === "object" && "difference" in result
            ? (result as any).difference
            : variancePence,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to close till";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#E11D48] mx-auto" />
          <p className="text-xs font-bold text-slate-700">Calculating Server Shift Totals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Close Till & Reconcile</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Verify drawer cash and complete shift
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server Reconciliation Breakdown */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
            Server System Calculations
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Opening Float:</span>
            <span className="font-mono font-bold">
              {formatGBP((reconciliation?.opening_float_pence ?? 0) / 100)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>(+) POS Cash Sales:</span>
            <span className="font-mono font-bold text-emerald-700">
              +{formatGBP((reconciliation?.cash_sales_pence ?? 0) / 100)}
            </span>
          </div>
          {(reconciliation?.repair_cash_pence ?? 0) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>(+) Repair Cash Payments:</span>
              <span className="font-mono font-bold text-emerald-700">
                +{formatGBP((reconciliation?.repair_cash_pence ?? 0) / 100)}
              </span>
            </div>
          )}
          {(reconciliation?.cash_refunds_pence ?? 0) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>(-) Cash Refunds:</span>
              <span className="font-mono font-bold text-rose-600">
                -{formatGBP((reconciliation?.cash_refunds_pence ?? 0) / 100)}
              </span>
            </div>
          )}
          {(reconciliation?.expenses_pence ?? 0) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>(-) Cash Expenses:</span>
              <span className="font-mono font-bold text-rose-600">
                -{formatGBP((reconciliation?.expenses_pence ?? 0) / 100)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-300 pt-2 font-black text-slate-900 text-sm">
            <span>Expected Cash in Drawer:</span>
            <span className="font-mono text-[#E11D48]">{formatGBP(expectedPence / 100)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Actual Cash Counted (£)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={countedPounds}
              onChange={(e) => setCountedPounds(e.target.value)}
              placeholder={(expectedPence / 100).toFixed(2)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-[#E11D48]"
            />
          </div>

          {/* Live Variance Calculation Badge */}
          {countedPounds !== "" && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-black ${
                variancePence === 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : variancePence < 0
                    ? "bg-rose-50 border-rose-200 text-rose-950"
                    : "bg-amber-50 border-amber-200 text-amber-950"
              }`}
            >
              <span>Difference / Variance:</span>
              <span className="font-mono text-sm">
                {variancePence === 0
                  ? "Balanced (£0.00)"
                  : variancePence < 0
                    ? `Short -${formatGBP(Math.abs(variancePence) / 100)}`
                    : `Over +${formatGBP(variancePence / 100)}`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Audit Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. End of day till count"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#E11D48]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary !px-5 !py-2 !text-xs flex items-center gap-1.5 font-bold"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Confirm & Close Till
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. SHIFT RECONCILIATION RESULT MODAL
// ---------------------------------------------------------------------------
interface ReconciliationResultModalProps {
  data: ReconciliationData;
  onClose: () => void;
}

export function ShiftReconciliationResultModal({ data, onClose }: ReconciliationResultModalProps) {
  const variance = data.difference_pence;
  const isBalanced = variance === 0;
  const isShort = variance < 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
        <div className="text-center space-y-1">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              isBalanced
                ? "bg-emerald-100 text-emerald-600"
                : isShort
                  ? "bg-rose-100 text-rose-600"
                  : "bg-amber-100 text-amber-600"
            }`}
          >
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Till Closed Successfully</h3>
          <p className="text-xs text-slate-500 font-medium">Reconciliation Summary Report</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Opening Float:</span>
            <span className="font-mono font-bold">{formatGBP(data.opening_float_pence / 100)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Cash Sales:</span>
            <span className="font-mono font-bold text-emerald-700">
              +{formatGBP(data.cash_sales_pence / 100)}
            </span>
          </div>
          {data.repair_cash_pence > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Repair Cash Payments:</span>
              <span className="font-mono font-bold text-emerald-700">
                +{formatGBP(data.repair_cash_pence / 100)}
              </span>
            </div>
          )}
          {data.cash_refunds_pence > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Cash Refunds:</span>
              <span className="font-mono font-bold text-rose-600">
                -{formatGBP(data.cash_refunds_pence / 100)}
              </span>
            </div>
          )}
          {data.expenses_pence > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Cash Expenses:</span>
              <span className="font-mono font-bold text-rose-600">
                -{formatGBP(data.expenses_pence / 100)}
              </span>
            </div>
          )}

          <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-800">
            <span>Expected Cash:</span>
            <span className="font-mono">{formatGBP(data.computed_expected_cash_pence / 100)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-slate-800">
            <span>Actual Counted Cash:</span>
            <span className="font-mono">{formatGBP(data.counted_cash_pence / 100)}</span>
          </div>

          <div
            className={`mt-2 p-2.5 rounded-lg flex items-center justify-between font-black text-xs ${
              isBalanced
                ? "bg-emerald-100 text-emerald-900"
                : isShort
                  ? "bg-rose-100 text-rose-900"
                  : "bg-amber-100 text-amber-900"
            }`}
          >
            <span>Variance / Status:</span>
            <span className="font-mono">
              {isBalanced
                ? "Balanced (£0.00)"
                : isShort
                  ? `Short -${formatGBP(Math.abs(variance) / 100)}`
                  : `Over +${formatGBP(variance / 100)}`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full btn-primary !py-2.5 !text-xs font-extrabold"
        >
          Done / Return to Register
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. SHIFT HISTORY MODAL
// ---------------------------------------------------------------------------
interface ShiftHistoryModalProps {
  onClose: () => void;
}

export function ShiftHistoryModal({ onClose }: ShiftHistoryModalProps) {
  const listShiftsFn = useServerFn(listShifts);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["shifts-history", page],
    queryFn: () => listShiftsFn({ data: { page, limit: 15 } }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-3xl w-full shadow-2xl space-y-4 border border-slate-200 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Till Shift History</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Past register shifts, float amounts, and cash reconciliations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-[#E11D48]" />
            </div>
          ) : (data?.rows ?? []).length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 font-medium">
              No shift records found
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                  <th className="p-2.5">Date / Opened</th>
                  <th className="p-2.5">Opened By</th>
                  <th className="p-2.5">Float</th>
                  <th className="p-2.5">Expected</th>
                  <th className="p-2.5">Counted</th>
                  <th className="p-2.5">Variance</th>
                  <th className="p-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.rows.map((s: any) => {
                  const openedDate = new Date(s.opened_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const diff = s.difference_pence ?? 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 font-medium">
                      <td className="p-2.5 font-bold text-slate-900">{openedDate}</td>
                      <td className="p-2.5 text-slate-600">{s.profiles?.full_name || "Staff"}</td>
                      <td className="p-2.5 font-mono">{formatGBP(s.opening_float_pence / 100)}</td>
                      <td className="p-2.5 font-mono">
                        {s.expected_cash_pence !== null
                          ? formatGBP(s.expected_cash_pence / 100)
                          : "—"}
                      </td>
                      <td className="p-2.5 font-mono">
                        {s.counted_cash_pence !== null
                          ? formatGBP(s.counted_cash_pence / 100)
                          : "—"}
                      </td>
                      <td className="p-2.5 font-mono">
                        {s.status === "closed" ? (
                          <span
                            className={`font-extrabold ${
                              diff === 0
                                ? "text-emerald-600"
                                : diff < 0
                                  ? "text-rose-600"
                                  : "text-amber-600"
                            }`}
                          >
                            {diff === 0 ? "£0.00" : formatGBP(diff / 100)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            s.status === "open"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400 font-medium">Page {page + 1}</span>
          <button
            type="button"
            disabled={(data?.rows ?? []).length < 15}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

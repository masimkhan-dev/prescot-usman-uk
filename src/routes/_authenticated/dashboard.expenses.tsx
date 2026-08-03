import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listExpenses, saveExpense, voidExpense } from "@/lib/expenses.functions";
import { formatGBP } from "@/lib/utils";
import { Loader2, Plus, Ban, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/expenses")({
  component: ExpensesPage,
});

const emptyExpense = {
  category: "",
  description: "",
  amountPounds: "",
  expense_date: new Date().toISOString().split("T")[0],
};

function ExpensesPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listExpenses);
  const saveFn = useServerFn(saveExpense);
  const voidFn = useServerFn(voidExpense);

  const [page, setPage] = useState(0);
  const [form, setForm] = useState({ ...emptyExpense });
  const [submitting, setSubmitting] = useState(false);
  const [voidReasonPrompt, setVoidReasonPrompt] = useState<{ id: string } | null>(null);
  const [voidReasonText, setVoidReasonText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", page],
    queryFn: () => listFn({ data: { include_void: true, page, limit: 30 } }),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountPence = Math.round(parseFloat(form.amountPounds) * 100);
    if (isNaN(amountPence) || amountPence <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    setSubmitting(true);
    try {
      await saveFn({
        data: {
          category: form.category.trim(),
          description: form.description.trim(),
          amount_pence: amountPence,
          expense_date: form.expense_date,
        },
      });
      toast.success("Expense recorded successfully");
      setForm({ ...emptyExpense });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVoid(id: string) {
    if (!voidReasonText.trim()) {
      toast.error("Please enter a reason for voiding this expense");
      return;
    }
    try {
      await voidFn({ data: { id, void_reason: voidReasonText.trim() } });
      toast.success("Expense voided");
      setVoidReasonPrompt(null);
      setVoidReasonText("");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to void expense");
    }
  }

  return (
    <div className="db-page">
      <div className="db-page-header">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand" />
          <h1 className="db-page-title">Expense Management</h1>
        </div>
        <p className="db-page-subtitle">
          Log store operational costs. Immutable audit record — expenses can be voided with reason,
          never deleted.
        </p>
      </div>

      {/* Log Form */}
      <form onSubmit={handleSubmit} className="db-card space-y-3">
        <div className="db-section-label mb-2">Log New Expense</div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Category (e.g. Rent, Utilities)"
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="db-input"
          />
          <input
            type="text"
            placeholder="Description / Supplier"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="db-input"
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Amount (£)"
            required
            value={form.amountPounds}
            onChange={(e) => setForm({ ...form, amountPounds: e.target.value })}
            className="db-input font-bold"
          />
          <input
            type="date"
            required
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            className="db-input"
          />
        </div>
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={submitting} className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1.5 disabled:opacity-60">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Record Expense
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-brand" />
        </div>
      ) : (
        <div className="db-card !p-0 overflow-hidden">
          <table className="db-table">
            <thead>
              <tr>
                <th className="db-th">Date</th>
                <th className="db-th">Category</th>
                <th className="db-th">Description</th>
                <th className="db-th text-right">Amount</th>
                <th className="db-th text-center">Status</th>
                <th className="db-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((e) => (
                <tr
                  key={e.id}
                  className={e.is_void ? "opacity-50 bg-destructive/4" : "db-tr-hover"}
                >
                  <td className="db-td font-mono text-muted-foreground">{e.expense_date}</td>
                  <td className="db-td font-bold text-ink">{e.category}</td>
                  <td className="db-td text-foreground">{e.description}</td>
                  <td className="db-td text-right font-extrabold font-mono tabular-nums text-ink">
                    {formatGBP((e.amount_pence ?? 0) / 100)}
                  </td>
                  <td className="db-td text-center">
                    {e.is_void ? (
                      <span
                        className="db-badge bg-destructive/10 text-destructive"
                        title={e.void_reason || undefined}
                      >
                        VOIDED
                      </span>
                    ) : (
                      <span className="db-badge bg-emerald-100 text-emerald-800">VALID</span>
                    )}
                  </td>
                  <td className="db-td text-right">
                    {!e.is_void && (
                      <button
                        type="button"
                        onClick={() => setVoidReasonPrompt({ id: e.id })}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/8 text-destructive hover:bg-destructive/15 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        <Ban className="w-3 h-3" /> Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground text-xs font-medium">
                    No expenses logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Void Reason Modal */}
      {voidReasonPrompt && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-ink text-sm">Void Expense</h3>
            <p className="text-xs text-muted-foreground">
              Please state why this expense record is being voided:
            </p>
            <input
              type="text"
              placeholder="Reason (e.g. Duplicate entry, Refunded by supplier)"
              value={voidReasonText}
              onChange={(e) => setVoidReasonText(e.target.value)}
              className="db-input"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setVoidReasonPrompt(null)}
                className="btn-outline !py-1.5 !px-3 !text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVoid(voidReasonPrompt.id)}
                className="btn-primary !bg-destructive !py-1.5 !px-3 !text-xs"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

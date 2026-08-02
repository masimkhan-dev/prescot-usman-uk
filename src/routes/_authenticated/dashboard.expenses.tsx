import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listExpenses, saveExpense, deleteExpense } from "@/lib/expenses.functions";
import { formatGBP } from "@/lib/utils";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/expenses")({
  component: ExpensesPage,
});

const emptyExpense = { id: "", category: "", description: "", amount: 0, expense_date: new Date().toISOString().split("T")[0] };

function ExpensesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["expenses"], queryFn: () => listExpenses() });
  const saveFn = useServerFn(saveExpense);
  const deleteFn = useServerFn(deleteExpense);
  const [form, setForm] = useState({ ...emptyExpense });
  const [editing, setEditing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveFn({ data: form });
    setForm({ ...emptyExpense });
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete expense?")) return;
    await deleteFn({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Expenses</h1>
        <p className="text-sm text-muted-foreground">Track business costs for profit & loss reports.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-background border border-border rounded-xl p-4 space-y-3">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <input type="text" placeholder="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-input px-3 py-2 text-sm" />
          <input type="text" placeholder="Description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-input px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Amount" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="rounded-lg border border-input px-3 py-2 text-sm" />
          <input type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="rounded-lg border border-input px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> {editing ? "Update" : "Add Expense"}</button>
      </form>

      {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div> : (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted-foreground text-xs uppercase"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Description</th><th className="text-left px-4 py-3">Amount</th><th className="text-right px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {data?.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3">{e.expense_date}</td>
                  <td className="px-4 py-3 font-medium">{e.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.description}</td>
                  <td className="px-4 py-3">{formatGBP(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setForm(e as any); setEditing(true); }} className="text-brand mr-3"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(e.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

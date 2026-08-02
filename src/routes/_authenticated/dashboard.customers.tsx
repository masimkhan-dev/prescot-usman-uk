import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCustomers, saveCustomer, deleteCustomer } from "@/lib/customers.functions";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/customers")({
  component: CustomersPage,
});

const emptyCustomer = { id: "", name: "", phone: "", email: "", address: "", notes: "" };

function CustomersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() });
  const saveFn = useServerFn(saveCustomer);
  const deleteFn = useServerFn(deleteCustomer);
  const [form, setForm] = useState({ ...emptyCustomer });
  const [editing, setEditing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveFn({ data: { ...form, email: form.email || null, phone: form.phone || null, address: form.address || null, notes: form.notes || null } });
    setForm({ ...emptyCustomer });
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete customer?")) return;
    await deleteFn({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <p className="text-sm text-muted-foreground">Repair and sales customer database.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-background border border-border rounded-xl p-4 space-y-3">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <input type="text" placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-input px-3 py-2 text-sm" />
          <input type="text" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-input px-3 py-2 text-sm" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-input px-3 py-2 text-sm" />
          <input type="text" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg border border-input px-3 py-2 text-sm col-span-2" />
          <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg border border-input px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> {editing ? "Update" : "Add Customer"}</button>
      </form>

      {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div> : (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted-foreground text-xs uppercase"><tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Email</th><th className="text-right px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setForm({ ...c, email: c.email || "", phone: c.phone || "", address: c.address || "", notes: c.notes || "" } as any); setEditing(true); }} className="text-brand mr-3"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
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

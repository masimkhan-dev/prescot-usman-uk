import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCustomers, saveCustomer, deactivateCustomer } from "@/lib/customers.functions";
import { Loader2, Plus, Trash2, Edit2, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/customers")({
  component: CustomersPage,
});

const emptyCustomer = { id: "", name: "", phone: "", email: "", address: "", notes: "" };

function CustomersPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listCustomers);
  const saveFn = useServerFn(saveCustomer);
  const deactivateFn = useServerFn(deactivateCustomer);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState({ ...emptyCustomer });
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () => listFn({ data: { search, page, limit: 25 } }),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveFn({
        data: {
          id: form.id || undefined,
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          notes: form.notes || null,
        },
      });
      toast.success(editing ? "Customer updated" : "Customer added");
      setForm({ ...emptyCustomer });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Remove customer from active directory?")) return;
    try {
      await deactivateFn({ data: { id } });
      toast.success("Customer deactivated");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate customer");
    }
  }

  return (
    <div className="db-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Customer Directory</h1>
          </div>
          <p className="db-page-subtitle">Manage customer records and contact history.</p>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="db-input !pl-9"
          />
        </div>
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} className="db-card space-y-3">
        <div className="db-section-label mb-2">
          {editing ? "Edit Customer Record" : "Add New Customer"}
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Full Name *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="db-input"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="db-input"
          />
          <input
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="db-input"
          />
          <input
            type="text"
            placeholder="Full Postal Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="db-input sm:col-span-2"
          />
          <input
            type="text"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="db-input"
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          {editing && (
            <button
              type="button"
              onClick={() => {
                setForm({ ...emptyCustomer });
                setEditing(false);
              }}
              className="btn-outline !py-2 !px-4 !text-xs"
            >
              Cancel
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1.5 disabled:opacity-60">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {editing ? "Update Record" : "Add Customer"}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-brand" />
        </div>
      )}

      {!isLoading && data && (
        <div className="db-card !p-0 overflow-hidden">
          <table className="db-table">
            <thead>
              <tr>
                <th className="db-th">Name</th>
                <th className="db-th">Phone</th>
                <th className="db-th">Email</th>
                <th className="db-th">Address</th>
                <th className="db-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((c) => (
                <tr key={c.id} className="db-tr-hover">
                  <td className="db-td font-bold text-ink">{c.name}</td>
                  <td className="db-td font-mono text-muted-foreground">{c.phone || "—"}</td>
                  <td className="db-td text-muted-foreground">{c.email || "—"}</td>
                  <td className="db-td text-muted-foreground max-w-xs truncate">{c.address || "—"}</td>
                  <td className="db-td text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          id: c.id,
                          name: c.name,
                          phone: c.phone || "",
                          email: c.email || "",
                          address: c.address || "",
                          notes: c.notes || "",
                        });
                        setEditing(true);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-ink mr-1 rounded hover:bg-muted transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivate(c.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/8 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground text-xs font-medium">
                    No active customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data.total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
              <span>
                Showing {page * 25 + 1}–{Math.min((page + 1) * 25, data.total)} of{" "}
                {data.total} customers
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                  className="p-1.5 rounded-lg hover:bg-border disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold">{page + 1}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * 25 >= data.total}
                  aria-label="Next page"
                  className="p-1.5 rounded-lg hover:bg-border disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

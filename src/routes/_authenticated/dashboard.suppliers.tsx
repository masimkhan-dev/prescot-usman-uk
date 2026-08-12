import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSuppliers, saveSupplier, deleteSupplier } from "@/lib/suppliers.functions";
import { toastSuccess, toastError } from "@/lib/toast";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Truck, Plus, Trash2, Edit2, Search, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/suppliers")({
  component: DashboardSuppliersPage,
});

function DashboardSuppliersPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listSuppliers);
  const saveFn = useServerFn(saveSupplier);
  const deleteFn = useServerFn(deleteSupplier);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listFn(),
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });

  const filtered = suppliers.filter(
    (s: any) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").includes(search),
  );

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({ id: "", name: "", phone: "", email: "", address: "", notes: "" });
    setModalOpen(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditing(s);
    setForm({
      id: s.id,
      name: s.name || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveFn({
        data: {
          id: form.id || undefined,
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          notes: form.notes || null,
        },
      });
      toastSuccess(editing ? "Supplier updated" : "Supplier added");
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (err: any) {
      toastError(err, "Failed to save supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await deleteFn({ data: { id } });
      toastSuccess("Supplier deleted");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (err: any) {
      toastError(err, "Failed to delete supplier");
    }
  };

  return (
    <div className="db-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Supplier Directory</h1>
            <PageHelpButton
              pageTitle="Suppliers"
              pageKey="suppliers"
              steps={[
                "Add vendor/supplier details to system.",
                "Create purchase orders when ordering stock.",
                "Receive goods when stock arrives at shop.",
              ]}
              firstTimeTip="Tip: Add supplier records first before creating purchase orders."
            />
          </div>
          <p className="db-page-subtitle">
            Manage parts distributors, wholesale phone suppliers, and component vendors.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="db-input !pl-9"
            />
          </div>
          <button
            onClick={handleOpenAdd}
            className="btn-primary !py-2 !px-4 !text-xs shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Supplier
          </button>
        </div>
      </div>

      <div className="db-card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="db-table min-w-[650px]">
              <thead>
                <tr>
                  <th className="db-th">Supplier</th>
                  <th className="db-th">Phone</th>
                  <th className="db-th">Email</th>
                  <th className="db-th">Address</th>
                  <th className="db-th">Notes</th>
                  <th className="db-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        title="No suppliers found"
                        description="Try adjusting your search filter or add a new supplier."
                        actionLabel="+ Add Supplier"
                        onAction={handleOpenAdd}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((s: any) => (
                    <tr key={s.id} className="db-tr-hover">
                      <td className="db-td font-bold text-ink">{s.name}</td>
                      <td className="db-td text-muted-foreground font-medium">{s.phone || "—"}</td>
                      <td className="db-td text-muted-foreground font-medium">{s.email || "—"}</td>
                      <td className="db-td text-muted-foreground truncate max-w-xs">
                        {s.address || "—"}
                      </td>
                      <td className="db-td text-muted-foreground italic max-w-xs truncate">
                        {s.notes || "—"}
                      </td>
                      <td className="db-td text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg bg-muted hover:bg-border text-foreground transition-colors cursor-pointer"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 rounded-lg bg-destructive/8 hover:bg-destructive/15 text-destructive transition-colors cursor-pointer"
                          title="Delete Supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-extrabold text-sm text-ink">
                {editing ? "Edit Supplier" : "Add New Supplier"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Company / Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="db-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="db-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="db-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="db-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="db-input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline !py-2 !px-4 !text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

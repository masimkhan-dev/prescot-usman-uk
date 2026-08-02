import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, listSuppliers } from "@/lib/suppliers.functions";
import { listProducts } from "@/lib/products.functions";
import { ShoppingBag, Plus, Search, X, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/purchases")({
  component: DashboardPurchasesPage,
});

function DashboardPurchasesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    supplier_id: "",
    notes: "",
    reference: "",
    items: [] as { product_id: string; product_name: string; quantity: number; unit_cost: number }[],
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => listPurchaseOrders(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listSuppliers(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts(),
  });

  const handleAddItem = (productId: string) => {
    const prod = products.find((p: any) => p.id === productId);
    if (!prod) return;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { product_id: prod.id, product_name: prod.name, quantity: 1, unit_cost: prod.cost_price || 0 },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }
    if (form.items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      await createPurchaseOrder({
        data: {
          supplier_id: form.supplier_id,
          reference: form.reference || null,
          notes: form.notes || null,
          items: form.items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
          })),
        },
      });
      toast.success("Purchase order created successfully");
      setModalOpen(false);
      setForm({ supplier_id: "", notes: "", reference: "", items: [] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create purchase order");
    }
  };

  const handleReceiveOrder = async (poId: string) => {
    if (!confirm("Receive this order and update stock quantities?")) return;
    try {
      await receivePurchaseOrder({ data: { id: poId, update_cost_price: true } });
      toast.success("Stock received and quantities updated!");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to receive stock");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#E11D48]" /> Purchase Orders & Stock Ingestion
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track wholesale orders, replacement parts stock-in, and supplier invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E11D48] outline-none"
            />
          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary !py-2 !px-4 !text-xs shrink-0">
            <Plus className="w-4 h-4" /> New Order
          </button>
        </div>
      </div>

      <div className="card-flat !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="py-3 px-4">PO ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total (£)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No purchase orders recorded.
                  </td>
                </tr>
              ) : (
                orders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                      #{po.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(po.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {po.suppliers?.name || "Standard Supplier"}
                    </td>
                    <td className="py-3 px-4">
                      {po.status === "received" ? (
                        <span className="capitalize px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Received
                        </span>
                      ) : (
                        <span className="capitalize px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[10px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> {po.status || "Ordered"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#0F172A] tabular-nums">
                      £{Number(po.total || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {po.status !== "received" && (
                        <button
                          onClick={() => handleReceiveOrder(po.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                        >
                          Receive Stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-base text-[#0F172A]">Create Purchase Order</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Supplier *</label>
                <select
                  required
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PO Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. INV-98124"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Add Inventory Item</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItem(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
                >
                  <option value="">-- Choose Product to Order --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              {form.items.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <div className="text-xs font-bold text-slate-700">Line Items</div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border text-xs">
                      <span className="font-bold text-slate-800 flex-1 truncate">{item.product_name}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const q = parseInt(e.target.value) || 1;
                            setForm((prev) => ({
                              ...prev,
                              items: prev.items.map((it, i) => (i === idx ? { ...it, quantity: q } : it)),
                            }));
                          }}
                          className="w-16 px-2 py-1 bg-white border rounded text-xs font-bold text-center"
                        />
                        <span className="text-slate-400">× £</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => {
                            const c = parseFloat(e.target.value) || 0;
                            setForm((prev) => ({
                              ...prev,
                              items: prev.items.map((it, i) => (i === idx ? { ...it, unit_cost: c } : it)),
                            }));
                          }}
                          className="w-20 px-2 py-1 bg-white border rounded text-xs font-bold text-right"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Tracking</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary !py-2 !px-4 !text-xs">
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

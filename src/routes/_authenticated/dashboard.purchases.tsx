import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  listSuppliers,
} from "@/lib/suppliers.functions";
import { listAllActiveProducts } from "@/lib/products.functions";
import { ShoppingBag, Plus, Search, X, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/purchases")({
  component: DashboardPurchasesPage,
});

function DashboardPurchasesPage() {
  const queryClient = useQueryClient();
  const listOrdersFn = useServerFn(listPurchaseOrders);
  const createPOFn = useServerFn(createPurchaseOrder);
  const receivePOFn = useServerFn(receivePurchaseOrder);
  const listSuppliersFn = useServerFn(listSuppliers);
  const listProductsFn = useServerFn(listAllActiveProducts);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    supplier_id: "",
    notes: "",
    items: [] as {
      product_id: string;
      product_name: string;
      qty_ordered: number;
      unit_cost_pence: number;
    }[],
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => listOrdersFn({ data: { page: 0, limit: 100 } }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listSuppliersFn(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProductsFn({ data: {} }),
  });

  const orders = (ordersData?.rows ?? []).filter((order) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (order.po_number ?? "").toLowerCase().includes(term) ||
      (order.suppliers?.name ?? "").toLowerCase().includes(term)
    );
  });

  const handleAddItem = (productId: string) => {
    const prod = products.find((product) => product.id === productId);
    if (!prod) return;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: prod.id,
          product_name: prod.name,
          qty_ordered: 1,
          unit_cost_pence: prod.cost_price_pence || 0,
        },
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

    setSubmitting(true);
    try {
      await createPOFn({
        data: {
          supplier_id: form.supplier_id,
          notes: form.notes || null,
          items: form.items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            qty_ordered: item.qty_ordered,
            unit_cost_pence: item.unit_cost_pence,
          })),
        },
      });
      toast.success("Purchase order created successfully");
      setModalOpen(false);
      setForm({ supplier_id: "", notes: "", items: [] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveOrder = async (po: (typeof orders)[number]) => {
    const items = po.purchase_order_items
      .map((item) => ({
        po_item_id: item.id,
        qty_received: item.qty_ordered - item.qty_received,
      }))
      .filter((item) => item.qty_received > 0);

    if (items.length === 0) {
      toast.error("This order has no outstanding quantity to receive");
      return;
    }
    if (!confirm("Receive this order and update stock quantities?")) return;
    setReceivingId(po.id);
    try {
      await receivePOFn({
        data: {
          po_id: po.id,
          idempotency_key: crypto.randomUUID(),
          update_cost_price: true,
          notes: "Full outstanding quantity received from dashboard",
          items,
        },
      });
      toast.success("Stock received and quantities updated!");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to receive stock");
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="db-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Purchase Orders & Stock Ingestion</h1>
          </div>
          <p className="db-page-subtitle">
            Track wholesale orders, replacement parts stock-in, and supplier invoices.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="db-input !pl-9"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary !py-2 !px-4 !text-xs shrink-0 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Order
          </button>
        </div>
      </div>

      <div className="db-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="db-table">
            <thead>
              <tr>
                <th className="db-th">PO ID</th>
                <th className="db-th">Date</th>
                <th className="db-th">Supplier</th>
                <th className="db-th">Status</th>
                <th className="db-th text-right">Total (£)</th>
                <th className="db-th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground text-xs">Loading purchase orders…</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground text-xs">No purchase orders recorded.</td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="db-tr-hover">
                    <td className="db-td font-mono font-bold text-ink">
                      {po.po_number ?? `#${po.id.slice(0, 8)}`}
                    </td>
                    <td className="db-td text-muted-foreground">
                      {new Date(po.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="db-td font-medium text-foreground">
                      {po.suppliers?.name || "Standard Supplier"}
                    </td>
                    <td className="db-td">
                      {po.status === "received" ? (
                        <span className="db-badge bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Received
                        </span>
                      ) : (
                        <span className="db-badge bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {po.status || "Ordered"}
                        </span>
                      )}
                    </td>
                    <td className="db-td text-right font-extrabold text-ink tabular-nums">
                      £{(po.total_pence / 100).toFixed(2)}
                    </td>
                    <td className="db-td text-right">
                      {po.status !== "received" && (
                        <button
                          onClick={() => handleReceiveOrder(po)}
                          disabled={receivingId === po.id}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors disabled:opacity-60"
                        >
                          {receivingId === po.id ? "Receiving…" : "Receive Stock"}
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-extrabold text-sm text-ink">Create Purchase Order</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Select Supplier *</label>
                <select
                  required
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="db-input"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Add Inventory Item</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItem(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="db-input"
                >
                  <option value="">-- Choose Product to Order --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Stock: {product.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              {form.items.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="db-section-label">Line Items</div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-lg border border-border text-xs">
                      <span className="font-bold text-ink flex-1 truncate">{item.product_name}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={item.qty_ordered}
                          onChange={(e) => {
                            const q = parseInt(e.target.value) || 1;
                            setForm((prev) => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, qty_ordered: q } : it) }));
                          }}
                          className="w-16 px-2 py-1 bg-background border border-border rounded text-xs font-bold text-center"
                        />
                        <span className="text-muted-foreground">× £</span>
                        <input
                          type="number"
                          step="0.01"
                          value={(item.unit_cost_pence / 100).toFixed(2)}
                          onChange={(e) => {
                            const c = Math.round((parseFloat(e.target.value) || 0) * 100);
                            setForm((prev) => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, unit_cost_pence: c } : it) }));
                          }}
                          className="w-20 px-2 py-1 bg-background border border-border rounded text-xs font-bold text-right"
                        />
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-destructive hover:text-destructive/80 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Notes / Tracking</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="db-input" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
                  {submitting ? "Creating…" : "Create Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProducts, saveProduct, deleteProduct, adjustStock, listStockMovements } from "@/lib/products.functions";
import { formatGBP } from "@/lib/utils";
import { Loader2, Plus, Trash2, Edit2, History, PackagePlus, X, Search, Barcode, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
  component: ProductsPage,
});

const emptyProduct = {
  id: "",
  name: "",
  category: "Accessories",
  sku: "",
  barcode: "",
  type: "product" as "product" | "part",
  cost_price: 0,
  sale_price: 0,
  stock_quantity: 0,
  low_stock_threshold: 5,
  warranty_days: 0,
  status: "active" as "active" | "inactive",
};

function ProductsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const saveFn = useServerFn(saveProduct);
  const deleteFn = useServerFn(deleteProduct);
  const adjustFn = useServerFn(adjustStock);

  const [form, setForm] = useState({ ...emptyProduct });
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "part">("all");
  const [adjustFor, setAdjustFor] = useState<{ id: string; name: string } | null>(null);
  const [historyFor, setHistoryFor] = useState<{ id: string; name: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await saveFn({ data: { ...form, sku: form.sku || null, barcode: form.barcode || null } });
    setForm({ ...emptyProduct });
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this inventory product?")) return;
    await deleteFn({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.filter((p) => {
      const matchesType = typeFilter === "all" || (p.type || "product") === typeFilter;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [data, searchQuery, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Products & Parts Inventory</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage store products, repair replacement parts, barcodes, stock levels & warranty terms.
          </p>
        </div>
      </div>

      {/* Add / Edit Product Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          {editing ? "Edit Inventory Item" : "Add New Inventory Item"}
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Item Name (e.g. iPhone 14 Screen Replacement)"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none sm:col-span-2"
          />
          <input
            type="text"
            placeholder="Category (e.g. Screens / Batteries)"
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "product" | "part" })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
          >
            <option value="product">Retail Product (For Sale)</option>
            <option value="part">Repair Component Part</option>
          </select>

          <input
            type="text"
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />
          <input
            type="text"
            placeholder="Barcode Number"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cost Price (£)"
            required
            value={form.cost_price || ""}
            onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Retail / Sale Price (£)"
            required
            value={form.sale_price || ""}
            onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
          />

          <input
            type="number"
            placeholder="Current Stock"
            required
            value={form.stock_quantity || ""}
            onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
          />
          <input
            type="number"
            placeholder="Low Stock Warning Limit"
            value={form.low_stock_threshold || ""}
            onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />
          <input
            type="number"
            placeholder="Warranty (Days)"
            value={form.warranty_days || ""}
            onChange={(e) => setForm({ ...form, warranty_days: Number(e.target.value) })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none sm:col-span-2"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {editing && (
            <button
              type="button"
              onClick={() => {
                setForm({ ...emptyProduct });
                setEditing(false);
              }}
              className="btn-outline !py-2 !px-4 !text-xs"
            >
              Cancel Edit
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-50">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {editing ? "Update Product Item" : "Save New Product"}
          </button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, SKU or barcode…"
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(["all", "product", "part"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                typeFilter === t
                  ? "bg-[#0F172A] text-white border-[#0F172A]"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t === "all" ? "All Items" : t === "product" ? "Products Only" : "Repair Parts Only"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#E11D48]" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Item Name & SKU</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Cost / Retail</th>
                  <th className="px-4 py-3">Stock Level</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isLow = p.stock_quantity <= p.low_stock_threshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#0F172A]">
                        <div>{p.name}</div>
                        {p.sku && <div className="text-[10px] text-slate-400 font-mono font-normal">SKU: {p.sku}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          (p.type || "product") === "part" ? "bg-[#0F172A] text-white" : "bg-slate-100 text-slate-800"
                        }`}>
                          {(p.type || "product") === "part" ? "PART" : "PRODUCT"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {p.barcode ? (
                          <span className="flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5 text-slate-400" /> {p.barcode}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <div className="font-extrabold text-[#0F172A]">{formatGBP(p.sale_price)}</div>
                        <div className="text-[10px] text-slate-400">Cost: {formatGBP(p.cost_price || 0)}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black ${isLow ? "text-rose-600" : "text-slate-900"}`}>
                            {p.stock_quantity}
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setAdjustFor({ id: p.id, name: p.name })}
                          className="text-emerald-700 hover:text-emerald-900 font-bold text-xs mr-3"
                          title="Adjust stock quantity"
                        >
                          <PackagePlus className="w-3.5 h-3.5 inline" /> Stock
                        </button>
                        <button
                          onClick={() => setHistoryFor({ id: p.id, name: p.name })}
                          className="text-slate-600 hover:text-slate-900 font-bold text-xs mr-3"
                          title="Stock movement audit log"
                        >
                          <History className="w-3.5 h-3.5 inline" /> Log
                        </button>
                        <button
                          onClick={() => {
                            setForm({
                              ...p,
                              status: p.status as "active" | "inactive",
                              type: (p.type as "product" | "part") || "product",
                              sku: p.sku || "",
                              barcode: p.barcode || "",
                              warranty_days: p.warranty_days || 0,
                            });
                            setEditing(true);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-[#0F172A] hover:text-[#E11D48] font-bold text-xs mr-3"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustFor && (
        <AdjustStockModal
          product={adjustFor}
          onClose={() => setAdjustFor(null)}
          onSave={async (change, reason, note) => {
            await adjustFn({ data: { product_id: adjustFor.id, quantity_change: change, reason, note } });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            setAdjustFor(null);
          }}
        />
      )}

      {historyFor && (
        <HistoryModal product={historyFor} onClose={() => setHistoryFor(null)} />
      )}
    </div>
  );
}

function AdjustStockModal({
  product,
  onClose,
  onSave,
}: {
  product: { id: string; name: string };
  onClose: () => void;
  onSave: (change: number, reason: "adjustment" | "purchase" | "return" | "damage", note: string) => Promise<void>;
}) {
  const [change, setChange] = useState(0);
  const [reason, setReason] = useState<"adjustment" | "purchase" | "return" | "damage">("purchase");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="font-extrabold text-[#0F172A] text-sm">Adjust Stock · {product.name}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">
              Quantity Adjustment (+ to add, − to remove)
            </label>
            <input
              type="number"
              value={change}
              onChange={(e) => setChange(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold focus:border-[#E11D48] outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Movement Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold focus:border-[#E11D48] outline-none bg-white"
            >
              <option value="purchase">Stock Purchase / Restock</option>
              <option value="return">Customer Return</option>
              <option value="damage">Damaged / Lost Stock</option>
              <option value="adjustment">Manual Audit Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Audit Note</label>
            <input
              type="text"
              placeholder="e.g. Supplier delivery invoice #402"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-medium focus:border-[#E11D48] outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button onClick={onClose} className="btn-outline !py-2 !px-4 !text-xs">
            Cancel
          </button>
          <button
            onClick={async () => {
              setSaving(true);
              await onSave(change, reason, note);
              setSaving(false);
            }}
            disabled={saving || change === 0}
            className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save Stock
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ product, onClose }: { product: { id: string; name: string }; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-history", product.id],
    queryFn: () => listStockMovements({ data: { product_id: product.id } }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <h3 className="font-extrabold text-[#0F172A] text-sm">Stock Audit History · {product.name}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#E11D48]" />
            </div>
          ) : data && data.length > 0 ? (
            <ul className="space-y-2 text-xs">
              {data.map((m) => (
                <li key={m.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">{m.reason}</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      {new Date(m.created_at).toLocaleString("en-GB")}{m.note ? ` · ${m.note}` : ""}
                    </div>
                  </div>
                  <div className={`font-black text-sm tabular-nums ${m.quantity_change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {m.quantity_change > 0 ? "+" : ""}{m.quantity_change}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10 italic">No stock movements recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
